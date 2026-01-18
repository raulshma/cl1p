/**
 * File Validation Feature Verification Test (Temporary)
 *
 * This test verifies that the file validation feature works correctly:
 * - Type whitelisting (safe formats only)
 * - Size limits (max 10GB)
 * - Filename sanitization (prevents path traversal)
 * - Clear error messages for invalid files
 */

import { test, expect } from '@playwright/test';

test.describe('File Validation Feature Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the file dropzone demo page
    await page.goto('/file-dropzone-demo');
  });

  test('should load the file dropzone demo page', async ({ page }) => {
    // Check if the main heading is visible
    await expect(
      page.getByRole('heading', { name: /file dropzone demo/i })
    ).toBeVisible();

    // Check if dropzone is visible
    await expect(page.locator('text=Drag & drop files here').first()).toBeVisible();
  });

  test('should display file size limit information', async ({ page }) => {
    // Check if max file size is displayed (first dropzone has 10GB limit)
    const firstDropzoneSize = page.getByText('Maximum file size: 10 GB');
    await expect(firstDropzoneSize).toBeVisible();
  });

  test('should accept valid file types', async ({ page }) => {
    // Create a small valid text file for testing
    const fileContent = 'This is a test file for validation.';
    const fileBuffer = Buffer.from(fileContent, 'utf-8');
    const fileName = 'test-file.txt';

    // Get the first file input (from the main dropzone)
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: fileBuffer,
    });

    // Wait for the file to be processed
    await page.waitForTimeout(500);

    // Check if file appears in the list
    await expect(page.locator('text=Selected Files').first()).toBeVisible();
    await expect(page.locator(`text=${fileName}`).first()).toBeVisible();
  });

  test('should reject files exceeding size limit', async ({ page }) => {
    // Note: Testing with actual 10GB+ files is impractical in browser tests
    // This test validates the error message appears for oversized files
    // The actual 10GB limit is tested in unit tests
    
    // For demo purposes, we'll test against a smaller dropzone on the page
    // Navigate to the "Small Files Only" dropzone which has 1MB limit
    const smallFileInput = page.locator('input[type="file"]').nth(2);
    
    // Create a file larger than 1MB
    const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
    const fileBuffer = Buffer.from(largeContent, 'utf-8');
    const fileName = 'large-file.txt';

    // Try to upload a large file to the 1MB-limited dropzone
    await smallFileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: fileBuffer,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Check if validation error is displayed
    await expect(page.locator('text=Validation Errors').first()).toBeVisible();
    await expect(page.locator('text=exceeds maximum allowed size').first()).toBeVisible();
  });

  test('should sanitize dangerous filenames', async ({ page }) => {
    // Test filename with path traversal attempt
    const dangerousFileName = '../../../etc/passwd';
    const fileContent = 'malicious content';
    const fileBuffer = Buffer.from(fileContent, 'utf-8');

    // Get the first file input
    const fileInput = page.locator('input[type="file"]').first();

    // Try to upload file with dangerous filename
    await fileInput.setInputFiles({
      name: dangerousFileName,
      mimeType: 'text/plain',
      buffer: fileBuffer,
    });

    // Wait for processing
    await page.waitForTimeout(500);

    // Check if the filename was sanitized
    // The sanitized filename should not contain path traversal characters
    await expect(page.locator('text=etcpasswd').first()).toBeVisible();
    await expect(page.locator(`text=${dangerousFileName}`).first()).not.toBeVisible();
  });

  test('should show clear error messages for invalid file types', async ({ page }) => {
    // Try to upload a file with unsafe extension (.exe)
    const fileContent = 'executable content';
    const fileBuffer = Buffer.from(fileContent, 'utf-8');
    const fileName = 'malicious.exe';

    // Get the first file input
    const fileInput = page.locator('input[type="file"]').first();

    // Try to upload the file
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/x-msdownload',
      buffer: fileBuffer,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Check if validation error is displayed
    await expect(page.locator('text=Validation Errors').first()).toBeVisible();
    await expect(page.locator('text=is not allowed').first()).toBeVisible();
  });

  test('should handle multiple files with mixed validity', async ({ page }) => {
    // Create multiple files - some valid, some invalid
    const validFile = {
      name: 'valid-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('valid content', 'utf-8'),
    };

    const invalidFile = {
      name: 'invalid-file.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('invalid content', 'utf-8'),
    };

    // Get the first file input
    const fileInput = page.locator('input[type="file"]').first();

    // Upload both files
    await fileInput.setInputFiles([validFile, invalidFile]);

    // Wait for processing
    await page.waitForTimeout(500);

    // Check that valid file appears
    await expect(page.locator('text=valid-file.txt').first()).toBeVisible();

    // Check that invalid file shows error
    await expect(page.locator('text=invalid-file.exe').first()).toBeVisible();
    await expect(page.locator('text=Validation Errors').first()).toBeVisible();
  });

  test('should allow dismissing validation errors', async ({ page }) => {
    // Upload an invalid file to trigger error
    const invalidFile = {
      name: 'test.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('content', 'utf-8'),
    };

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(invalidFile);

    // Wait for error to appear
    await page.waitForTimeout(500);
    await expect(page.locator('text=Validation Errors').first()).toBeVisible();

    // Dismiss the error (click X button)
    const dismissButton = page.locator('button[aria-label="Dismiss error"]').first();
    await dismissButton.click();

    // Wait for dismissal
    await page.waitForTimeout(200);

    // Check if error is dismissed (error count should decrease)
    const errorSection = page.locator('text=Validation Errors');
    const errorCount = await errorSection.count();
    expect(errorCount).toBe(0); // Error section should be gone
  });

  test('should remove files from the list', async ({ page }) => {
    // Upload a valid file
    const validFile = {
      name: 'removable-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('content', 'utf-8'),
    };

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(validFile);

    // Wait for file to appear
    await page.waitForTimeout(500);
    await expect(page.locator('text=removable-file.txt').first()).toBeVisible();

    // Remove the file
    const removeButton = page.locator('button[aria-label="Remove file"]').first();
    await removeButton.click();

    // Wait for removal
    await page.waitForTimeout(200);

    // Check if file is removed
    await expect(page.locator('text=removable-file.txt').first()).not.toBeVisible();
  });

  test('should display sanitized filename when different from original', async ({ page }) => {
    // Upload file with filename that needs sanitization
    const fileNameWithSpaces = '  test file  .txt  ';
    const fileContent = 'content';
    const fileBuffer = Buffer.from(fileContent, 'utf-8');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: fileNameWithSpaces,
      mimeType: 'text/plain',
      buffer: fileBuffer,
    });

    // Wait for processing
    await page.waitForTimeout(500);

    // Check if the file appears with sanitized name
    await expect(page.locator('text=test file.txt').first()).toBeVisible();

    // The display should show the original name in parentheses if different
    await expect(page.locator('text=(was:').first()).toBeVisible();
  });
});
