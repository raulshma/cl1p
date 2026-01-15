/**
 * File Download Utility
 *
 * Provides utilities for downloading files on the client side.
 * Supports automatic and manual download triggers with progress tracking.
 */

export interface DownloadOptions {
  autoDownload?: boolean;
  cleanupTimeout?: number; // milliseconds before auto-cleanup
}

export interface DownloadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

/**
 * Generate a download URL for a file
 *
 * @param file - File to generate URL for
 * @returns Object URL for the file
 */
export function generateDownloadURL(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Trigger a file download in the browser
 *
 * @param file - File to download
 * @param url - Object URL for the file
 * @returns Download result
 */
export function triggerDownload(file: File, url: string): DownloadResult {
  try {
    // Create a temporary anchor element
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;

    // Append to document, click, and remove
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    return {
      success: true,
      url,
      filename: file.name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download a file with optional auto-trigger
 *
 * @param file - File to download
 * @param options - Download options
 * @returns Download result with cleanup function
 */
export function downloadFile(
  file: File,
  options: DownloadOptions = {}
): DownloadResult & { cleanup?: () => void } {
  const { autoDownload = true, cleanupTimeout = 60000 } = options;

  // Generate download URL
  const url = generateDownloadURL(file);

  let result: DownloadResult;

  if (autoDownload) {
    result = triggerDownload(file, url);
  } else {
    result = {
      success: true,
      url,
      filename: file.name,
    };
  }

  // Set up automatic cleanup of object URL
  const cleanup = () => {
    URL.revokeObjectURL(url);
  };

  // Auto-cleanup after timeout (default 60 seconds)
  if (cleanupTimeout > 0) {
    setTimeout(cleanup, cleanupTimeout);
  }

  return {
    ...result,
    cleanup,
  };
}

/**
 * Download multiple files
 *
 * @param files - Files to download
 * @param options - Download options
 * @returns Array of download results
 */
export function downloadMultipleFiles(
  files: File[],
  options: DownloadOptions = {}
): Array<DownloadResult & { cleanup?: () => void }> {
  const results: Array<DownloadResult & { cleanup?: () => void }> = [];

  // Add delay between downloads to prevent browser blocking
  const downloadWithDelay = async (file: File, index: number) => {
    const delay = index * 500; // 500ms delay between each download

    await new Promise((resolve) => setTimeout(resolve, delay));

    return downloadFile(file, options);
  };

  files.forEach((file, index) => {
    results.push(downloadWithDelay(file, index) as any);
  });

  return results;
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon type based on MIME type
 *
 * @param mimeType - File MIME type
 * @returns Icon type identifier
 */
export function getFileIconType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
  if (mimeType.includes('text')) return 'text';
  if (mimeType.includes('json')) return 'code';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  return 'file';
}

/**
 * Get file icon based on MIME type (legacy - returns emoji)
 * @deprecated Use getFileIconType instead
 *
 * @param mimeType - File MIME type
 * @returns Icon emoji
 */
export function getFileIcon(mimeType: string): string {
  const iconType = getFileIconType(mimeType);
  const iconMap: Record<string, string> = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    pdf: '📄',
    archive: '📦',
    text: '📝',
    code: '📋',
    spreadsheet: '📊',
    document: '📝',
    file: '📁',
  };
  return iconMap[iconType] || '📁';
}

/**
 * Verify file integrity before download
 *
 * @param file - File to verify
 * @param expectedSize - Expected file size
 * @param expectedChecksum - Optional expected checksum
 * @returns Verification result
 */
export async function verifyFile(
  file: File,
  expectedSize: number,
  expectedChecksum?: string
): Promise<{ valid: boolean; error?: string }> {
  // Check file size
  if (file.size !== expectedSize) {
    return {
      valid: false,
      error: `File size mismatch: expected ${expectedSize}, got ${file.size}`,
    };
  }

  // Check checksum if provided
  if (expectedChecksum) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== expectedChecksum) {
      return {
        valid: false,
        error: 'File checksum verification failed',
      };
    }
  }

  return { valid: true };
}

/**
 * Create a blob from array buffer
 *
 * @param buffer - Array buffer
 * @param mimeType - MIME type
 * @returns Blob object
 */
export function createBlob(buffer: ArrayBuffer, mimeType: string): Blob {
  return new Blob([buffer], { type: mimeType });
}

/**
 * Create a file from blob
 *
 * @param blob - Blob object
 * @param filename - File name
 * @param lastModified - Optional last modified timestamp
 * @returns File object
 */
export function createFileFromBlob(
  blob: Blob,
  filename: string,
  lastModified?: number
): File {
  return new File([blob], filename, {
    type: blob.type,
    lastModified: lastModified || Date.now(),
  });
}

/**
 * Cleanup object URLs
 *
 * @param urls - Object URLs to revoke
 */
export function cleanupObjectURLs(...urls: string[]): void {
  urls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn(`Failed to revoke object URL: ${url}`, error);
    }
  });
}

/**
 * Download manager class for handling multiple file downloads
 */
export class DownloadManager {
  private activeDownloads: Map<string, { url: string; cleanup: () => void }>;

  constructor() {
    this.activeDownloads = new Map();
  }

  /**
   * Add a file to the download queue
   *
   * @param id - Download ID
   * @param file - File to download
   * @param autoDownload - Whether to automatically trigger download
   * @returns Download result
   */
  addDownload(id: string, file: File, autoDownload = true): DownloadResult {
    const result = downloadFile(file, { autoDownload });

    if (result.success && result.url && result.cleanup) {
      this.activeDownloads.set(id, {
        url: result.url,
        cleanup: result.cleanup,
      });
    }

    return result;
  }

  /**
   * Get download URL by ID
   *
   * @param id - Download ID
   * @returns Download URL or null
   */
  getDownloadURL(id: string): string | null {
    return this.activeDownloads.get(id)?.url || null;
  }

  /**
   * Cleanup a specific download
   *
   * @param id - Download ID
   */
  cleanupDownload(id: string): void {
    const download = this.activeDownloads.get(id);
    if (download) {
      download.cleanup();
      this.activeDownloads.delete(id);
    }
  }

  /**
   * Cleanup all downloads
   */
  cleanupAll(): void {
    this.activeDownloads.forEach((download) => download.cleanup());
    this.activeDownloads.clear();
  }

  /**
   * Get active download count
   */
  getActiveCount(): number {
    return this.activeDownloads.size;
  }
}

/**
 * Create a download manager instance
 *
 * @returns Download manager instance
 */
export function createDownloadManager(): DownloadManager {
  return new DownloadManager();
}

export default {
  generateDownloadURL,
  triggerDownload,
  downloadFile,
  downloadMultipleFiles,
  formatFileSize,
  getFileIcon,
  verifyFile,
  createBlob,
  createFileFromBlob,
  cleanupObjectURLs,
  DownloadManager,
  createDownloadManager,
};
