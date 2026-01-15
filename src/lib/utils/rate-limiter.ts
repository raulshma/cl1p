/**
 * Rate Limiter Utility
 *
 * Provides client-side rate limiting to prevent spam and excessive resource usage.
 * Supports token bucket algorithm for rate limiting with configurable intervals.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Rate limit configuration options
 */
export interface RateLimitConfig {
  /**
   * Maximum number of operations allowed within the time window
   */
  maxOperations: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Optional callback when rate limit is exceeded
   */
  onRateLimitExceeded?: () => void;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Whether the operation is allowed
   */
  allowed: boolean;

  /**
   * Number of operations remaining in current window
   */
  remaining: number;

  /**
   * Time until the window resets (milliseconds)
   */
  resetTime: number;

  /**
   * Estimated time until next operation is allowed (milliseconds)
   */
  retryAfter?: number;
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  operations: number;
  windowStart: number;
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

/**
 * Rate Limiter Class
 *
 * Implements token bucket algorithm for rate limiting.
 * Limits operations to a maximum number within a sliding time window.
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private state: RateLimiterState;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxOperations: config.maxOperations,
      windowMs: config.windowMs,
      onRateLimitExceeded: config.onRateLimitExceeded || (() => {}),
      debug: config.debug || false,
    };

    this.state = {
      operations: 0,
      windowStart: Date.now(),
    };

    this.debug('RateLimiter initialized', this.config);
  }

  /**
   * Check if an operation is allowed under the rate limit
   * @returns RateLimitResult indicating if operation is allowed
   */
  public checkLimit(): RateLimitResult {
    const now = Date.now();
    const windowElapsed = now - this.state.windowStart;

    // Reset window if enough time has passed
    if (windowElapsed >= this.config.windowMs) {
      this.debug('Rate limit window reset', {
        previousOperations: this.state.operations,
        windowElapsed,
      });
      this.state.operations = 0;
      this.state.windowStart = now;
    }

    const remaining = Math.max(0, this.config.maxOperations - this.state.operations);
    const resetTime = this.config.windowMs - windowElapsed;

    // Check if operation is allowed
    if (this.state.operations < this.config.maxOperations) {
      this.state.operations++;

      this.debug('Operation allowed', {
        operations: this.state.operations,
        maxOperations: this.config.maxOperations,
        remaining: remaining - 1,
      });

      return {
        allowed: true,
        remaining: remaining - 1,
        resetTime,
      };
    }

    // Rate limit exceeded
    const retryAfter = resetTime;

    this.debug('Rate limit exceeded', {
      operations: this.state.operations,
      maxOperations: this.config.maxOperations,
      resetTime,
      retryAfter,
    });

    // Trigger callback
    this.config.onRateLimitExceeded();

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter,
    };
  }

  /**
   * Attempt to perform a rate-limited operation
   * @returns True if operation was allowed, false otherwise
   */
  public attempt(): boolean {
    return this.checkLimit().allowed;
  }

  /**
   * Reset the rate limiter state
   */
  public reset(): void {
    this.debug('Rate limiter manually reset');
    this.state = {
      operations: 0,
      windowStart: Date.now(),
    };
  }

  /**
   * Get current state information
   */
  public getState(): RateLimiterState {
    return { ...this.state };
  }

  /**
   * Get remaining operations in current window
   */
  public getRemaining(): number {
    const now = Date.now();
    const windowElapsed = now - this.state.windowStart;

    // Reset window if enough time has passed
    if (windowElapsed >= this.config.windowMs) {
      return this.config.maxOperations;
    }

    return Math.max(0, this.config.maxOperations - this.state.operations);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    this.debug('Rate limiter config updated', this.config);
  }

  /**
   * Debug logging
   */
  private debug(message: string, data?: any): void {
    if (this.config.debug) {
      if (data !== undefined) {
        console.log(`[RateLimiter] ${message}`, data);
      } else {
        console.log(`[RateLimiter] ${message}`);
      }
    }
  }
}

// ============================================================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================================================

/**
 * Create a rate limiter for clipboard updates (1 operation per second)
 */
export function createClipboardRateLimiter(debug = false): RateLimiter {
  return new RateLimiter({
    maxOperations: 1,
    windowMs: 1000, // 1 second
    debug,
  });
}

/**
 * Create a rate limiter for file transfers (1 transfer per 2 seconds)
 */
export function createFileTransferRateLimiter(debug = false): RateLimiter {
  return new RateLimiter({
    maxOperations: 1,
    windowMs: 2000, // 2 seconds
    debug,
  });
}

/**
 * Create a rate limiter for broadcast operations (3 per second)
 */
export function createBroadcastRateLimiter(debug = false): RateLimiter {
  return new RateLimiter({
    maxOperations: 3,
    windowMs: 1000, // 1 second
    debug,
  });
}

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(
  maxOperations: number,
  windowMs: number,
  options: Partial<RateLimitConfig> = {}
): RateLimiter {
  return new RateLimiter({
    maxOperations,
    windowMs,
    ...options,
  });
}

// ============================================================================
// HOOK FOR REACT INTEGRATION
// ============================================================================

/**
 * Hook result for rate-limited operations
 */
export interface RateLimitedOperationResult {
  /**
   * Execute the operation if rate limit allows
   */
  execute: () => boolean;

  /**
   * Check if operation is allowed without executing
   */
  canExecute: () => boolean;

  /**
   * Get remaining operations
   */
  getRemaining: () => number;

  /**
   * Reset the rate limiter
   */
  reset: () => void;
}

/**
 * Create a rate-limited operation wrapper
 * @param rateLimiter - Rate limiter instance
 * @param operation - Operation to execute
 * @returns Wrapper object with execute method
 */
export function createRateLimitedOperation<T extends (...args: any[]) => any>(
  rateLimiter: RateLimiter,
  operation: T
): RateLimitedOperationResult {
  return {
    execute: (...args: Parameters<T>): boolean => {
      const result = rateLimiter.checkLimit();
      if (result.allowed) {
        operation(...args);
        return true;
      }
      return false;
    },

    canExecute: (): boolean => {
      return rateLimiter.getRemaining() > 0;
    },

    getRemaining: (): number => {
      return rateLimiter.getRemaining();
    },

    reset: (): void => {
      rateLimiter.reset();
    },
  };
}

export default RateLimiter;
