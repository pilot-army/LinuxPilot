export type ListenRetryOptions = {
  retries?: number;
  delayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

export function isAddressInUse(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'EADDRINUSE'
  );
}

export async function listenWithRetry<T>(
  listen: () => Promise<T>,
  options: ListenRetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 10;
  const delayMs = options.delayMs ?? 100;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await listen();
    } catch (error) {
      lastError = error;
      if (!isAddressInUse(error) || attempt === retries) {
        throw error;
      }
      options.onRetry?.(attempt + 1, error);
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
