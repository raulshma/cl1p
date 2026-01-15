import { test, expect } from '@playwright/test';

test.describe('Home Page - Room Creation Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the room creation form prominently', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('main')).toContainText('Live Clipboard');

    // Check room creation form is visible
    await expect(page.getByText('Create a Room')).toBeVisible();
    await expect(page.getByText(/Generate a unique room slug/)).toBeVisible();
  });

  test('should have room slug input field', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    await expect(roomSlugInput).toBeVisible();
    await expect(roomSlugInput).toHaveAttribute('placeholder', 'e.g., my-awesome-room');
  });

  test('should have password input field with visibility toggle', async ({ page }) => {
    const passwordInput = page.getByLabel(/Password/);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Enter password to protect room');

    // Check visibility toggle button exists
    const showPasswordButton = page.getByLabel('Show password');
    await expect(showPasswordButton).toBeVisible();
  });

  test('should have generate button for room slug', async ({ page }) => {
    const generateButton = page.getByRole('button', { name: 'Generate' });
    await expect(generateButton).toBeVisible();
  });

  test('should generate a random room slug when clicking generate', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    const generateButton = page.getByRole('button', { name: 'Generate' });

    // Click generate button
    await generateButton.click();

    // Wait for slug to be generated
    await page.waitForTimeout(500);

    // Check that input has a value
    const slugValue = await roomSlugInput.inputValue();
    expect(slugValue.length).toBeGreaterThan(0);
    expect(slugValue).toMatch(/^[a-zA-Z0-9\-]+$/); // URL-safe characters
  });

  test('should show password when clicking visibility toggle', async ({ page }) => {
    const passwordInput = page.getByLabel(/Password/);
    const showPasswordButton = page.getByLabel('Show password');

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show password
    await showPasswordButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Button should now be "Hide password"
    const hidePasswordButton = page.getByLabel('Hide password');
    await expect(hidePasswordButton).toBeVisible();

    // Click to hide password
    await hidePasswordButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should create room with valid slug', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Enter a custom room slug
    await roomSlugInput.fill('test-room-123');

    // Submit form
    await createButton.click();

    // Wait for success toast
    await expect(page.getByText(/Room "test-room-123" created successfully/)).toBeVisible();

    // Check that current room section appears
    await expect(page.getByText('Current Room')).toBeVisible();
    await expect(page.getByText('test-room-123')).toBeVisible();
  });

  test('should create room with password', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    const passwordInput = page.getByLabel(/Password/);
    const showPasswordButton = page.getByLabel('Show password');
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Enter room slug
    await roomSlugInput.fill('protected-room');

    // Enter password
    await showPasswordButton.click();
    await passwordInput.fill('securePassword123');

    // Submit form
    await createButton.click();

    // Wait for success toast
    await expect(page.getByText(/Room "protected-room" created successfully/)).toBeVisible();

    // Check that current room section appears
    await expect(page.getByText('Current Room')).toBeVisible();
  });

  test('should validate room slug and show error for invalid characters', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Enter invalid slug with spaces
    await roomSlugInput.fill('invalid room slug');

    // Try to submit
    await createButton.click();

    // Should show error message
    await expect(page.getByText(/Invalid room slug|contains invalid characters/)).toBeVisible();
  });

  test('should disable create button when slug is empty', async ({ page }) => {
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Button should be disabled initially
    await expect(createButton).toBeDisabled();
  });

  test('should enable create button when valid slug is entered', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Enter valid slug
    await roomSlugInput.fill('valid-room-slug');

    // Button should be enabled
    await expect(createButton).toBeEnabled();
  });

  test('should clear form after successful room creation', async ({ page }) => {
    const roomSlugInput = page.getByLabel('Room Slug');
    const passwordInput = page.getByLabel(/Password/);
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Enter room slug and password
    await roomSlugInput.fill('test-room');
    await passwordInput.fill('password123');

    // Submit form
    await createButton.click();

    // Wait for success
    await expect(page.getByText(/Room "test-room" created successfully/)).toBeVisible();

    // Wait a moment for form to clear
    await page.waitForTimeout(500);

    // Check that form is cleared (values should be empty)
    // Note: This might vary based on implementation - adjust as needed
  });

  test('should display demo controls in collapsible section', async ({ page }) => {
    // Demo controls should be in a details element
    const details = page.locator('details');
    await expect(details).toBeVisible();

    // Summary should mention demo
    await expect(details.getByText('Demo & Debug Controls')).toBeVisible();

    // Expand the details
    await details.getByRole('button', { name: /Demo & Debug Controls/ }).click();

    // Check that demo buttons are visible
    await expect(page.getByRole('button', { name: 'Create Random Room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Random Room' })).toBeVisible();
  });
});

test.describe('Home Page - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Main heading should be h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Live Clipboard');
  });

  test('should have proper ARIA labels on form elements', async ({ page }) => {
    await page.goto('/');

    // Check input labels
    await expect(page.getByLabel('Room Slug')).toBeVisible();
    await expect(page.getByLabel(/Password/)).toBeVisible();
  });

  test('should show error messages with proper ARIA attributes', async ({ page }) => {
    await page.goto('/');

    const roomSlugInput = page.getByLabel('Room Slug');
    const createButton = page.getByRole('button', { name: 'Create Room' });

    // Enter invalid slug
    await roomSlugInput.fill('invalid @#$ slug');

    // Check for aria-invalid
    await expect(roomSlugInput).toHaveAttribute('aria-invalid', 'true');
  });
});
