/**
 * WebRTC Peer Connection Manager Verification Test
 *
 * This test verifies the core functionality of the PeerConnectionManager class.
 */

import { test, expect } from '@playwright/test';

test.describe('WebRTC Peer Connection Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the WebRTC demo page
    await page.goto('/webrtc-demo');
  });

  test('should load the demo page', async ({ page }) => {
    // Check if the main heading is visible
    await expect(
      page.getByRole('heading', { name: 'WebRTC Peer Connection Manager Demo' })
    ).toBeVisible();

    // Check if peer management section is visible
    await expect(page.getByRole('heading', { name: 'Peer Management' })).toBeVisible();

    // Check if send data section is visible
    await expect(page.getByRole('heading', { name: 'Send Data' })).toBeVisible();

    // Check if logs section is visible
    await expect(page.getByRole('heading', { name: 'Event Logs' })).toBeVisible();
  });

  test('should create peers successfully', async ({ page }) => {
    // Click the "Create Peers" button
    await page.click('button:has-text("Create Peers")');

    // Wait for logs to appear
    await page.waitForTimeout(1000);

    // Check if success log appears
    const logs = page.locator('.bg-gray-900');
    await expect(logs).toContainText('Creating peers');
    await expect(logs).toContainText('Created initiator peer');
    await expect(logs).toContainText('Created receiver peer');
    await expect(logs).toContainText('Peers created successfully');

    // Check if peers are displayed
    await expect(page.locator('text=Active Peers')).toBeVisible();
  });

  test('should establish connection between peers', async ({ page }) => {
    // Create peers
    await page.click('button:has-text("Create Peers")');

    // Wait for connection to establish (simple-peer should auto-connect locally)
    await page.waitForTimeout(2000);

    // Check if connection status shows "Connected"
    const statusText = await page.locator('text=Status:').textContent();
    expect(statusText).toContain('Connected');

    // Check logs for connection events
    const logs = page.locator('.bg-gray-900');
    await expect(logs).toContainText('signal generated');
    await expect(logs).toContainText('connected');
  });

  test('should send data between peers', async ({ page }) => {
    // Create peers and wait for connection
    await page.click('button:has-text("Create Peers")');
    await page.waitForTimeout(2000);

    // Enter a message
    const testMessage = 'Test message from Playwright';
    await page.fill('input[placeholder="Enter message to send..."]', testMessage);

    // Clear logs before sending
    await page.click('button:has-text("Clear Logs")');

    // Send the message
    await page.click('button:has-text("Send")');

    // Wait for the message to be sent and received
    await page.waitForTimeout(1000);

    // Check logs for sent and received messages
    const logs = page.locator('.bg-gray-900');
    await expect(logs).toContainText('Sent to peer-2');
    await expect(logs).toContainText(testMessage);
  });

  test('should disconnect peers', async ({ page }) => {
    // Create peers and wait for connection
    await page.click('button:has-text("Create Peers")');
    await page.waitForTimeout(2000);

    // Verify connected state
    await expect(page.locator('text=Status: Connected')).toBeVisible();

    // Click disconnect button
    await page.click('button:has-text("Disconnect")');

    // Wait for disconnect
    await page.waitForTimeout(1000);

    // Check logs for disconnect event
    const logs = page.locator('.bg-gray-900');
    await expect(logs).toContainText('All peers disconnected');

    // Verify disconnected status
    await expect(page.locator('text=Status: Disconnected')).toBeVisible();
  });

  test('should remove peers', async ({ page }) => {
    // Create peers
    await page.click('button:has-text("Create Peers")');
    await page.waitForTimeout(1000);

    // Verify peers exist
    await expect(page.locator('text=Active Peers')).toBeVisible();

    // Click remove peers button
    await page.click('button:has-text("Remove Peers")');

    // Wait for removal
    await page.waitForTimeout(1000);

    // Check logs for removal event
    const logs = page.locator('.bg-gray-900');
    await expect(logs).toContainText('All peers removed');

    // Verify peers are no longer displayed
    await expect(page.locator('text=Active Peers')).not.toBeVisible();

    // Verify create peers button is enabled again
    const createButton = page.locator('button:has-text("Create Peers")');
    await expect(createButton).toBeEnabled();
  });

  test('should handle multiple messages', async ({ page }) => {
    // Create peers and wait for connection
    await page.click('button:has-text("Create Peers")');
    await page.waitForTimeout(2000);

    const messages = ['Message 1', 'Message 2', 'Message 3'];

    for (const msg of messages) {
      // Enter message
      await page.fill('input[placeholder="Enter message to send..."]', msg);
      // Send message
      await page.click('button:has-text("Send")');
      // Wait a bit between messages
      await page.waitForTimeout(200);
    }

    // Check logs contain all messages
    const logs = page.locator('.bg-gray-900');
    for (const msg of messages) {
      await expect(logs).toContainText(msg);
    }
  });

  test('should validate peer ID inputs', async ({ page }) => {
    // Check if peer ID inputs are visible and enabled initially
    const peer1Input = page.locator('input').nth(0);
    const peer2Input = page.locator('input').nth(1);

    await expect(peer1Input).toBeVisible();
    await expect(peer1Input).toBeEnabled();
    await expect(peer2Input).toBeVisible();
    await expect(peer2Input).toBeEnabled();

    // Create peers
    await page.click('button:has-text("Create Peers")');
    await page.waitForTimeout(1000);

    // Verify inputs are disabled after peer creation
    await expect(peer1Input).toBeDisabled();
    await expect(peer2Input).toBeDisabled();
  });

  test('should clear logs', async ({ page }) => {
    // Create peers to generate logs
    await page.click('button:has-text("Create Peers")');
    await page.waitForTimeout(1000);

    // Verify logs exist
    const logs = page.locator('.bg-gray-900');
    await expect(logs).not.toContainText('No logs yet');

    // Clear logs
    await page.click('button:has-text("Clear Logs")');
    await page.waitForTimeout(200);

    // Verify logs are cleared
    await expect(logs).toContainText('No logs yet');
  });
});
