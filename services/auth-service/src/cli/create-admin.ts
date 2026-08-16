import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ROLES } from '@linuxpilot/auth-contracts';
import {
  canonicalizeUsername,
  evaluatePassword,
  normalizeEmail,
  normalizeUsername,
  UsernameValidationError,
} from '@linuxpilot/common';
import { hash, argon2id } from 'argon2';
import { loadAuthEnv } from '../config/env';

loadDotenv();

async function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    output.write(prompt);
    input.setRawMode?.(true);
    input.resume();
    input.setEncoding('utf8');

    let value = '';
    const onData = (chunk: string) => {
      if (chunk === '\n' || chunk === '\r' || chunk === '\u0004') {
        cleanup();
        output.write('\n');
        resolve(value);
        return;
      }
      if (chunk === '\u0003') {
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }
      if (chunk === '\u007f') {
        value = value.slice(0, -1);
        return;
      }
      value += chunk;
    };

    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode?.(wasRaw ?? false);
      input.pause();
    };

    input.on('data', onData);
  });
}

async function promptValue(
  label: string,
  envValue: string | undefined,
  hidden = false,
): Promise<string> {
  if (envValue && envValue.trim().length > 0) {
    return envValue.trim();
  }

  if (!input.isTTY) {
    throw new Error(
      `${label} is required. Set AUTH_ADMIN_* environment variables in non-interactive mode.`,
    );
  }

  if (hidden) {
    return readHidden(`${label}: `);
  }

  const rl = createInterface({ input, output });
  try {
    return (await rl.question(`${label}: `)).trim();
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const env = loadAuthEnv();
  const email = normalizeEmail(await promptValue('Email', process.env.AUTH_ADMIN_EMAIL));
  const rawUsername = await promptValue('Username', process.env.AUTH_ADMIN_USERNAME);
  let username: string;
  let usernameNormalized: string;
  try {
    username = canonicalizeUsername(rawUsername);
    usernameNormalized = normalizeUsername(rawUsername);
  } catch (error) {
    if (error instanceof UsernameValidationError) {
      throw error;
    }
    throw new Error('Username is invalid');
  }
  const password = await promptValue('Password', process.env.AUTH_ADMIN_PASSWORD, true);

  if (!email || !username || !password) {
    throw new Error('Email, username, and password are required');
  }

  const policyErrors = evaluatePassword(password);
  if (policyErrors.length > 0) {
    throw new Error(policyErrors.join('\n'));
  }

  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

  try {
    const role = await prisma.role.findUnique({ where: { name: ROLES.SUPER_ADMIN } });
    if (!role) {
      throw new Error('Role super_admin is missing. Run `pnpm db:seed` first.');
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { usernameNormalized }] },
    });
    if (existing) {
      if (existing.email === email && existing.usernameNormalized === usernameNormalized) {
        console.log(`Admin ${existing.username} already exists; leaving unchanged`);
        return;
      }
      throw new Error('A user with this email or username already exists');
    }

    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });

    const user = await prisma.user.create({
      data: {
        email,
        username,
        usernameNormalized,
        passwordHash,
        status: 'ACTIVE',
        roles: { create: { roleId: role.id } },
      },
    });

    console.log(`Created super_admin user ${user.username} <${user.email}>`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to create admin';
  console.error(message);
  process.exit(1);
});
