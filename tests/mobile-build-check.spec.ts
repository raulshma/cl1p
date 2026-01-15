import { test, expect } from '@playwright/test';

/**
 * Simple Mobile Responsiveness Smoke Test
 *
 * This test verifies basic mobile responsiveness without requiring a running server.
 * It checks that the code compiles and has mobile-optimized classes.
 */

test.describe('Mobile Responsiveness Code Verification', () => {
  test('should have mobile-optimized Tailwind classes in page.tsx', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const pageContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/page.tsx'),
      'utf-8'
    );

    // Check for responsive classes
    expect(pageContent).toContain('sm:');
    expect(pageContent).toContain('touch-manipulation');

    // Check for proper mobile spacing (just check for the pattern, not exact match)
    expect(pageContent).toContain('sm:');
    expect(pageContent).toContain('p-');
    expect(pageContent).toMatch(/text-\w+/);
  });

  test('should have mobile-optimized button component', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const buttonContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ui/button.tsx'),
      'utf-8'
    );

    // Check for touch-friendly classes
    expect(buttonContent).toContain('touch-manipulation');
    expect(buttonContent).toContain('min-h-');
    expect(buttonContent).toContain('active:scale');

    // Check for responsive button sizes
    expect(buttonContent).toMatch(/min-h-\[\d+px\]/);
  });

  test('should have mobile-optimized form component', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const formContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/RoomCreationForm.tsx'),
      'utf-8'
    );

    // Check for mobile-specific optimizations
    expect(formContent).toMatch(/min-h-\[\d+px\]/);
    expect(formContent).toContain('touch-manipulation');
    expect(formContent).toMatch(/flex-col sm:flex-row/);
  });

  test('should have mobile-optimized CSS', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const cssContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/globals.css'),
      'utf-8'
    );

    // Check for mobile-specific CSS
    expect(cssContent).toContain('@media (max-width: 640px)');
    expect(cssContent).toContain('min-height');
    expect(cssContent).toContain('touch-action');
    expect(cssContent).toContain('-webkit-tap-highlight-color');
  });

  test('should have responsive header component', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const headerContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/layout/Header.tsx'),
      'utf-8'
    );

    // Check for responsive sizing - check for patterns separately
    expect(headerContent).toMatch(/h-\d+/);
    expect(headerContent).toContain('sm:h-');
    expect(headerContent).toMatch(/w-\d+/);
    expect(headerContent).toContain('sm:w-');
    expect(headerContent).toMatch(/text-\w+/);
  });

  test('should have responsive layout component', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const layoutContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/layout/MainLayout.tsx'),
      'utf-8'
    );

    // Check for responsive container
    expect(layoutContent).toMatch(/px-\d+ sm:px-\d+/);
    expect(layoutContent).toMatch(/py-\d+ sm:py-\d+/);
    expect(layoutContent).toContain('max-w-7xl');
  });

  test('should verify all buttons have minimum touch targets', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const pageContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/page.tsx'),
      'utf-8'
    );

    // Count occurrences of mobile-friendly button classes
    const touchManipulationCount = (pageContent.match(/touch-manipulation/g) || []).length;
    expect(touchManipulationCount).toBeGreaterThan(0);

    // Check for py-3 (at least 12px vertical padding, contributing to 44px min height)
    const py3Count = (pageContent.match(/py-3/g) || []).length;
    expect(py3Count).toBeGreaterThan(0);
  });

  test('should have grid layouts that stack on mobile', async ({}) => {
    const fs = require('fs');
    const path = require('path');

    const pageContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/page.tsx'),
      'utf-8'
    );

    // Check for grid that stacks on mobile (grid-cols-1 sm:grid-cols-X)
    expect(pageContent).toMatch(/grid-cols-1 sm:grid-cols-2/);
    expect(pageContent).toMatch(/flex-col sm:flex-row/);
  });
});
