export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRetryable = error instanceof Error && (
        error.message.includes('rate_limit') ||
        error.message.includes('429') ||
        error.message.includes('overloaded') ||
        error.message.includes('529')
      );
      if (!isRetryable || attempt === maxRetries) throw error;
      const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
      console.log(`Rate limited, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
