// Rate limiter for API calls
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async throttle(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      (time) => now - time < this.windowMs
    );

    // Check if we've hit the limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Add current request
    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      (time) => now - time < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

// API-specific rate limiters based on documentation
export const rateLimiters = {
  arxiv: new RateLimiter(3, 1000), // 3 requests per second
  pubmed: new RateLimiter(3, 1000), // 3 requests per second
  semanticScholar: new RateLimiter(1, 100), // 1 request per 100ms (5 per second for non-API key, 100 with key)
  openalex: new RateLimiter(10, 1000), // 10 requests per second (OpenAlex has generous limits)
};

// Generic retry handler with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const shouldRetry = !isLastAttempt && isRetryableError(error);

      if (!shouldRetry) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('etimedout') ||
      errorMessage.includes('429') || // Too many requests
      errorMessage.includes('503') || // Service unavailable
      errorMessage.includes('502') // Bad gateway
    );
  }
  return false;
}
