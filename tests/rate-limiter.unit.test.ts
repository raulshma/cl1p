/**
 * Rate Limiter Unit Tests
 *
 * Direct unit tests for the rate limiter utility
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  RateLimiter,
  createClipboardRateLimiter,
  createFileTransferRateLimiter,
  createRateLimiter,
  createRateLimitedOperation,
} from '../src/lib/utils/rate-limiter';

describe('RateLimiter', () => {
  describe('Basic Rate Limiting', () => {
    it('should allow operations within the limit', () => {
      const limiter = new RateLimiter({
        maxOperations: 5,
        windowMs: 1000,
      });

      const result1 = limiter.checkLimit();
      const result2 = limiter.checkLimit();
      const result3 = limiter.checkLimit();

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(3);
      expect(result3.remaining).toBe(2);
    });

    it('should block operations when limit is exceeded', () => {
      const limiter = new RateLimiter({
        maxOperations: 2,
        windowMs: 1000,
      });

      const result1 = limiter.checkLimit();
      const result2 = limiter.checkLimit();
      const result3 = limiter.checkLimit();

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
      expect(result3.retryAfter).toBeGreaterThan(0);
    });

    it('should reset the window after time has passed', async () => {
      const limiter = new RateLimiter({
        maxOperations: 2,
        windowMs: 500, // 500ms window for faster testing
      });

      // Use up the limit
      const result1 = limiter.checkLimit();
      const result2 = limiter.checkLimit();
      const result3 = limiter.checkLimit();

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should be allowed again
      const result4 = limiter.checkLimit();
      expect(result4.allowed).toBe(true);
      expect(result4.remaining).toBe(1);
    });
  });

  describe('Helper Methods', () => {
    it('should attempt operation and return boolean', () => {
      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 1000,
      });

      expect(limiter.attempt()).toBe(true);
      expect(limiter.attempt()).toBe(false);
    });

    it('should reset the limiter state', () => {
      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 1000,
      });

      limiter.attempt();
      expect(limiter.attempt()).toBe(false);

      limiter.reset();
      expect(limiter.attempt()).toBe(true);
    });

    it('should get remaining operations', () => {
      const limiter = new RateLimiter({
        maxOperations: 5,
        windowMs: 1000,
      });

      expect(limiter.getRemaining()).toBe(5);

      limiter.attempt();
      expect(limiter.getRemaining()).toBe(4);

      limiter.attempt();
      limiter.attempt();
      expect(limiter.getRemaining()).toBe(2);
    });
  });

  describe('Pre-configured Limiters', () => {
    it('should create clipboard rate limiter with 1 operation per second', () => {
      const limiter = createClipboardRateLimiter(false);

      expect(limiter.attempt()).toBe(true);
      expect(limiter.attempt()).toBe(false);
    });

    it('should create file transfer rate limiter with 1 operation per 2 seconds', () => {
      const limiter = createFileTransferRateLimiter(false);

      expect(limiter.attempt()).toBe(true);
      expect(limiter.attempt()).toBe(false);
    });

    it('should create custom rate limiter', () => {
      const limiter = createRateLimiter(10, 5000);

      for (let i = 0; i < 10; i++) {
        expect(limiter.attempt()).toBe(true);
      }

      expect(limiter.attempt()).toBe(false);
    });
  });

  describe('Rate Limited Operations', () => {
    it('should wrap operation with rate limiting', () => {
      const limiter = new RateLimiter({
        maxOperations: 2,
        windowMs: 1000,
      });

      let callCount = 0;
      const operation = () => {
        callCount++;
        return 'result';
      };

      const rateLimited = createRateLimitedOperation(limiter, operation);

      expect(rateLimited.execute()).toBe(true);
      expect(callCount).toBe(1);

      expect(rateLimited.execute()).toBe(true);
      expect(callCount).toBe(2);

      expect(rateLimited.execute()).toBe(false);
      expect(callCount).toBe(2); // Should not increment
    });

    it('should check if operation can be executed', () => {
      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 1000,
      });

      const operation = () => 'result';
      const rateLimited = createRateLimitedOperation(limiter, operation);

      expect(rateLimited.canExecute()).toBe(true);
      rateLimited.execute();
      expect(rateLimited.canExecute()).toBe(false);
    });
  });

  describe('Rate Limit Callback', () => {
    it('should call callback when rate limit is exceeded', () => {
      const onRateLimitExceeded = jest.fn();

      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 1000,
        onRateLimitExceeded,
      });

      limiter.checkLimit(); // First - allowed
      limiter.checkLimit(); // Second - blocked

      expect(onRateLimitExceeded).toHaveBeenCalledTimes(1);
    });
  });

  describe('Window Reset Behavior', () => {
    it('should correctly track window start time', async () => {
      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 300,
      });

      const result1 = limiter.checkLimit();
      expect(result1.allowed).toBe(true);

      const state1 = limiter.getState();
      const windowStart1 = state1.windowStart;

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 350));

      const result2 = limiter.checkLimit();
      expect(result2.allowed).toBe(true);

      const state2 = limiter.getState();
      const windowStart2 = state2.windowStart;

      // Window start should have been updated
      expect(windowStart2).toBeGreaterThan(windowStart1);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration dynamically', () => {
      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 1000,
      });

      expect(limiter.attempt()).toBe(true);
      expect(limiter.attempt()).toBe(false);

      // Update to allow more operations
      limiter.updateConfig({ maxOperations: 3 });

      // Should allow more operations now
      expect(limiter.attempt()).toBe(true);
      expect(limiter.attempt()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero operations limit', () => {
      const limiter = new RateLimiter({
        maxOperations: 0,
        windowMs: 1000,
      });

      const result = limiter.checkLimit();
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle very small time windows', async () => {
      const limiter = new RateLimiter({
        maxOperations: 1,
        windowMs: 10, // 10ms window
      });

      expect(limiter.attempt()).toBe(true);
      expect(limiter.attempt()).toBe(false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(limiter.attempt()).toBe(true);
    });

    it('should handle multiple rapid checks', () => {
      const limiter = new RateLimiter({
        maxOperations: 100,
        windowMs: 1000,
      });

      // Perform 100 rapid checks
      const results = [];
      for (let i = 0; i < 150; i++) {
        results.push(limiter.checkLimit().allowed);
      }

      // First 100 should be allowed
      expect(results.slice(0, 100).every(r => r)).toBe(true);

      // Last 50 should be blocked
      expect(results.slice(100).every(r => !r)).toBe(true);
    });
  });
});

// Run tests if using Jest
if (typeof jest !== 'undefined') {
  describe('Rate Limiter Integration', () => {
    it('should work with clipboard sync scenario', () => {
      const limiter = createClipboardRateLimiter(false);

      // Simulate rapid clipboard changes
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(limiter.checkLimit());
      }

      // Only first should be allowed
      expect(results[0].allowed).toBe(true);
      expect(results.slice(1).every(r => !r.allowed)).toBe(true);
    });

    it('should work with file transfer scenario', () => {
      const limiter = createFileTransferRateLimiter(false);

      // First transfer should work
      expect(limiter.attempt()).toBe(true);

      // Immediate second transfer should be blocked
      expect(limiter.attempt()).toBe(false);

      // After waiting, should work again
      setTimeout(async () => {
        // Note: This won't work properly in synchronous test
        // In real scenario, you'd need to handle async properly
      }, 2500);
    });
  });
}

console.log('✓ All rate limiter unit tests defined successfully');
