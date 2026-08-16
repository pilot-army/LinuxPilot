import { type ZodError, type ZodTypeAny } from 'zod';

export class ConfigValidationError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

function formatIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'environment';
    return `${path}: ${issue.message}`;
  });
}

export function loadConfig<S extends ZodTypeAny>(
  schema: S,
  env: NodeJS.ProcessEnv = process.env,
): S['_output'] {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new ConfigValidationError(formatIssues(result.error));
  }
  return result.data;
}
