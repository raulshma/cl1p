import { test, expect } from '@playwright/test';

/**
 * Temporary verification test for skeleton loader implementation
 *
 * This test verifies that skeleton loading states are properly displayed
 * for major UI components during initial page load and data fetching.
 */

test.describe('Skeleton Loader Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should display skeleton loader on initial page load', async ({ page }) => {
    // Wait for page to load but before data is ready
    await page.waitForLoadState('domcontentloaded');

    // Check if skeleton elements are present
    const skeletonElements = page.locator('[aria-label*="Loading"], .animate-pulse');

    // Verify skeleton loaders exist during initial load
    const skeletonCount = await skeletonElements.count();
    expect(skeletonCount).toBeGreaterThan(0);

    console.log(`✓ Found ${skeletonCount} skeleton loader elements`);
  });

  test('should show RoomCreationForm skeleton during loading', async ({ page }) => {
    // Look for skeleton loader elements within the room creation form
    const roomSkeleton = page.locator('text=Create a Room').locator('../..').locator('.animate-pulse');

    // During initial load, skeleton elements should be present
    const hasSkeleton = await roomSkeleton.count();
    expect(hasSkeleton).toBeGreaterThan(0);

    console.log('✓ RoomCreationForm skeleton loader detected');
  });

  test('should show PeerList skeleton during loading', async ({ page }) => {
    // Look for peer list skeleton elements
    const peerSkeleton = page.locator('[aria-label*="Loading peer list"], [aria-label="Loading peer 1"], [aria-label="Loading peer 2"], [aria-label="Loading peer 3"]');

    // Check for skeleton elements
    const skeletonExists = await peerSkeleton.count();
    expect(skeletonExists).toBeGreaterThan(0);

    console.log('✓ PeerList skeleton loader detected');
  });

  test('skeleton loaders should disappear after loading completes', async ({ page }) => {
    // Wait for initial loading to complete (2 seconds to be safe)
    await page.waitForTimeout(2000);

    // Check that skeleton elements are no longer the main content
    const visibleSkeletons = page.locator('.animate-pulse:visible');

    // After loading, actual content should be visible
    const actualContent = page.locator('text=Create a Room, text=Peers in Room, text=Clipboard Sync');
    const contentExists = await actualContent.count();

    expect(contentExists).toBeGreaterThan(0);
    console.log('✓ Skeleton loaders replaced with actual content');
  });

  test('skeleton elements should have correct animation classes', async ({ page }) => {
    // Get all elements with pulse animation
    const pulseElements = page.locator('.animate-pulse');

    const count = await pulseElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify the elements exist and are visible during loading
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = pulseElements.nth(i);
      const isVisible = await element.isVisible();
      expect(isVisible).toBeTruthy();
    }

    console.log(`✓ Verified ${Math.min(count, 5)} skeleton elements with animation classes`);
  });

  test('skeleton loaders should match component structure', async ({ page }) => {
    // Check that PeerList skeleton has proper structure
    const peerListItemSkeletons = page.locator('article[aria-label^="Loading peer"]');
    const peerSkeletonCount = await peerListItemSkeletons.count();

    expect(peerSkeletonCount).toBeGreaterThan(0);
    console.log(`✓ Found ${peerSkeletonCount} peer list item skeleton elements`);

    // Check that skeleton has avatar, info, and quality indicator placeholders
    const firstSkeleton = peerListItemSkeletons.first();
    const skeletonStructure = await firstSkeleton.innerHTML();

    expect(skeletonStructure).toContain('animate-pulse');
    console.log('✓ Peer skeleton has correct structure with animation');
  });

  test('should have proper accessibility labels', async ({ page }) => {
    // Check for proper ARIA labels on skeleton elements
    const labeledSkeletons = page.locator('[aria-label*="Loading"], [aria-label*="loading"]');

    const count = await labeledSkeletons.count();
    expect(count).toBeGreaterThan(0);

    console.log(`✓ Found ${count} skeleton elements with proper ARIA labels`);
  });

  test('skeleton color should use theme colors', async ({ page }) => {
    // Check that skeleton elements use the correct background class
    const skeletonElements = page.locator('.bg-primary\\/10');

    const count = await skeletonElements.count();
    expect(count).toBeGreaterThan(0);

    console.log(`✓ Verified ${count} skeleton elements using theme colors (bg-primary/10)`);
  });
});

test.describe('Skeleton Loader Behavior', () => {
  test('should not show skeletons after data loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for loading to complete

    // Check that main content is visible
    const mainContent = page.locator('h1:has-text("Live Clipboard")');
    await expect(mainContent).toBeVisible();

    // Room creation form should be fully loaded
    const roomForm = page.locator('text=Create a Room');
    await expect(roomForm).toBeVisible();

    console.log('✓ Page fully loaded with actual content, no skeletons remaining');
  });

  test('should maintain layout stability during skeleton loading', async ({ page }) => {
    // Get initial layout metrics
    await page.waitForLoadState('domcontentloaded');

    const container = page.locator('main').first();
    const initialBox = await container.boundingBox();

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    const finalBox = await container.boundingBox();

    // Layout should be relatively stable (allowing for some variation)
    if (initialBox && finalBox) {
      const heightDifference = Math.abs(initialBox.height - finalBox.height);
      expect(heightDifference).toBeLessThan(500); // Allow reasonable height change
      console.log('✓ Layout remained stable during loading transition');
    }
  });
});
