import { z } from 'zod';

export const nonEmptyString = (name: string) =>
  z
    .string({ required_error: `${name} is required` })
    .trim()
    .min(1, `${name} must not be empty`);

export const secretString = (name: string, minLength = 32) =>
  nonEmptyString(name).min(minLength, `${name} must be at least ${minLength} characters`);

export const boolFromEnv = (name: string) =>
  z
    .enum(['true', 'false', '1', '0'], {
      required_error: `${name} is required`,
      invalid_type_error: `${name} must be true, false, 1, or 0`,
    })
    .transform((value) => value === 'true' || value === '1');
