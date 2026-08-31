export async function withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = error instanceof Error && /429|5\d\d|timeout|rate limit|temporar/i.test(error.message);
      if (!isRetryable || attempt >= retries) {
        throw error;
      }

      attempt += 1;
      const delayMs = 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
