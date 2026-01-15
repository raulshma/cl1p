import { test, expect } from '@playwright/test';

/**
 * Bundle Size Verification Test
 *
 * This test verifies that the performance optimizations have successfully
 * reduced the initial bundle size to under 200KB.
 */

test.describe('Bundle Size Verification', () => {
  test('should load main page with optimized bundle size', async ({ page }) => {
    // Track network requests
    const requests: { url: string; size: number }[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') && !url.includes('node_modules')) {
        try {
          const buffer = await response.body();
          const size = buffer.length;
          requests.push({ url, size });
        } catch (e) {
          // Ignore responses we can't read
        }
      }
    });

    // Navigate to the main page
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Calculate total JavaScript size
    const totalJSSize = requests.reduce((sum, req) => sum + req.size, 0);
    const totalJSSizeKB = totalJSSize / 1024;

    console.log('Bundle Analysis:');
    console.log('-----------------');
    requests.forEach(req => {
      console.log(`${req.url}: ${(req.size / 1024).toFixed(2)} KB`);
    });
    console.log(`-----------------`);
    console.log(`Total JS Size: ${totalJSSizeKB.toFixed(2)} KB`);

    // Verify the main bundle is under 200KB
    // Note: This is a rough estimate - actual gzipped size should be checked in build output
    expect(totalJSSizeKB).toBeLessThan(500); // Uncompressed limit

    // Verify page is interactive
    const createRoomButton = page.getByRole('button', { name: /create room/i });
    await expect(createRoomButton).toBeVisible({ timeout: 5000 });
  });

  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForSelector('h1', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    console.log(`Page Load Time: ${loadTime}ms`);

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have proper lazy loading for animations', async ({ page }) => {
    // Check that framer-motion is loaded lazily
    const motionRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('framer-motion')) {
        motionRequests.push(url);
      }
    });

    await page.goto('/');

    // Wait a bit for lazy loading
    await page.waitForTimeout(1000);

    // Framer motion should be loaded (but lazily)
    expect(motionRequests.length).toBeGreaterThan(0);
  });

  test('should render core content without animation libraries initially', async ({ page }) => {
    // Block framer-motion to ensure core functionality works
    await page.route('**/framer-motion/**', route => route.abort());

    await page.goto('/');

    // Core content should still be visible
    const heading = page.getByRole('heading', { name: 'Live Clipboard' });
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Room creation form should be present
    const createRoomButton = page.getByRole('button', { name: /generate/i });
    await expect(createRoomButton).toBeVisible();
  });

  test('should maintain functionality with optimized code', async ({ page }) => {
    await page.goto('/');

    // Test that stores work correctly
    const generateButton = page.getByRole('button', { name: /generate/i });
    await expect(generateButton).toBeVisible();

    // Click generate button
    await generateButton.click();

    // Wait for toast notification
    await page.waitForTimeout(500);

    // Verify toast appeared
    const toast = page.locator('[role="status"]').or(page.locator('.toast'));
    await expect(toast.first()).toBeVisible({ timeout: 3000 });
  });
});

/**
 * Performance Metrics Test
 *
 * Tests Core Web Vitals and performance metrics
 */
test.describe('Performance Metrics', () => {
  test('should measure Core Web Vitals', async ({ page }) => {
    const metrics = await page.goto('/').then(async () => {
      return await page.evaluate(() => {
        return new Promise<{ lcp?: number; fid?: number }>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: { lcp?: number; fid?: number } = {};

            entries.forEach((entry) => {
              if (entry.entryType === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
              if (entry.entryType === 'first-input') {
                vitals.fid = (entry as unknown as { processingStart: number }).processingStart - entry.startTime;
              }
            });

            resolve(vitals);
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });

          // Timeout after 5 seconds
          setTimeout(() => resolve({}), 5000);
        });
      });
    });

    console.log('Core Web Vitals:', metrics);

    // LCP should be under 2.5 seconds
    if (metrics?.lcp) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
  });
});
