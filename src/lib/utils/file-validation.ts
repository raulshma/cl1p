/**
 * File Validation Utilities
 * Provides secure file validation with type whitelisting, size limits, and filename sanitization
 */

// ============================================================================
// CONSTANTS
// ============================================================================

import { getRuntimeEnvNumber } from '@/lib/runtime-config';

/**
 * Maximum file size in bytes (10GB default)
 */
export const DEFAULT_MAX_FILE_SIZE = getRuntimeEnvNumber(
  'NEXT_PUBLIC_MAX_FILE_SIZE',
  6 * 1024 * 1024 * 1024
);

/**
 * Whitelist of safe MIME types for file uploads
 * Grouped by category for easier maintenance
 */
export const SAFE_MIME_TYPES = {
  // Images
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],

  // Documents
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/markdown',
  ],

  // Archives
  archives: [
    'application/zip',
    'application/x-zip-compressed',
    'application/gzip',
    'application/x-gzip',
    'application/x-tar',
    'application/x-rar-compressed',
  ],

  // Media
  media: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
  ],

  // Data/JSON
  data: [
    'application/json',
    'application/xml',
    'text/xml',
  ],
} as const;

/**
 * Flatten all safe MIME types into a single array
 */
export const ALL_SAFE_MIME_TYPES = Object.values(SAFE_MIME_TYPES).flat();

/**
 * Whitelist of safe file extensions
 */
export const SAFE_FILE_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',

  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.md',

  // Archives
  '.zip', '.gz', '.tar', '.rar',

  // Media
  '.mp3', '.wav', '.ogg', '.mp4', '.mpeg', '.mov', '.webm',

  // Data
  '.json', '.xml',
];

// ============================================================================
// TYPES
// ============================================================================

/**
 * File validation error types
 */
export type FileValidationErrorType =
  | 'SIZE_EXCEEDED'
  | 'INVALID_TYPE'
  | 'INVALID_EXTENSION'
  | 'INVALID_FILENAME'
  | 'EMPTY_FILE'
  | 'SANITIZATION_FAILED';

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  sanitizedFilename?: string;
  error?: {
    type: FileValidationErrorType;
    message: string;
  };
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  sanitizeFilename?: boolean;
  checkEmpty?: boolean;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a file against security rules
 *
 * @param file - The file to validate
 * @param options - Validation options
 * @returns Validation result with sanitized filename and error details if invalid
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes = ALL_SAFE_MIME_TYPES,
    allowedExtensions = SAFE_FILE_EXTENSIONS,
    sanitizeFilename = true,
    checkEmpty = true,
  } = options;

  // Check if file is empty
  if (checkEmpty && file.size === 0) {
    return {
      isValid: false,
      error: {
        type: 'EMPTY_FILE',
        message: 'File is empty and cannot be uploaded.',
      },
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: {
        type: 'SIZE_EXCEEDED',
        message: `File size (${fileSizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB.`,
      },
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_TYPE',
        message: `File type "${file.type || 'unknown'}" is not allowed. Allowed types: ${getAllowedTypesDescription(allowedMimeTypes)}.`,
      },
    };
  }

  // Extract and validate file extension
  const extension = getFileExtension(file.name);

  if (!extension) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_EXTENSION',
        message: 'File must have a valid extension.',
      },
    };
  }

  if (!allowedExtensions.includes(extension.toLowerCase())) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_EXTENSION',
        message: `File extension "${extension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}.`,
      },
    };
  }

  // Sanitize filename
  if (sanitizeFilename) {
    const sanitized = sanitizeFilenameForPath(file.name);

    if (!sanitized) {
      return {
        isValid: false,
        error: {
          type: 'INVALID_FILENAME',
          message: 'Filename contains invalid characters and cannot be sanitized.',
        },
      };
    }

    return {
      isValid: true,
      sanitizedFilename: sanitized,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates multiple files
 *
 * @param files - Array of files to validate
 * @param options - Validation options
 * @returns Array of validation results
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): Array<{ file: File; result: FileValidationResult }> {
  return files.map((file) => ({
    file,
    result: validateFile(file, options),
  }));
}

/**
 * Sanitizes a filename to prevent path traversal attacks
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for file system operations
 */
export function sanitizeFilenameForPath(filename: string): string {
  if (!filename || filename.trim() === '') {
    return '';
  }

  // Remove any path components (prevent directory traversal)
  let sanitized = filename.replace(/[\\\/]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Remove leading/trailing spaces and dots
  sanitized = sanitized.trim();

  // Remove leading dots (prevent hidden files on Unix)
  sanitized = sanitized.replace(/^\.+/, '');

  // Remove Windows reserved characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');

  // Remove Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const baseName = (sanitized.split('.')[0] || '').toUpperCase();
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ];

  if (reservedNames.includes(baseName)) {
    sanitized = `file-${sanitized}`;
  }

  // Ensure filename is not empty after sanitization
  if (sanitized === '') {
    return '';
  }

  // Limit filename length (255 characters is a common file system limit)
  if (sanitized.length > 255) {
    const extension = getFileExtension(sanitized);
    const maxLength = 255 - (extension?.length || 0);
    sanitized = sanitized.substring(0, maxLength) + (extension || '');
  }

  return sanitized;
}

/**
 * Checks if a filename is safe (contains only valid characters)
 *
 * @param filename - The filename to check
 * @returns True if the filename is safe, false otherwise
 */
export function isFilenameSafe(filename: string): boolean {
  if (!filename || filename.trim() === '') {
    return false;
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('\\') || filename.includes('/')) {
    return false;
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    return false;
  }

  // Check for control characters
  if (/[\x00-\x1f\x80-\x9f]/.test(filename)) {
    return false;
  }

  return true;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts the file extension from a filename
 *
 * @param filename - The filename to extract extension from
 * @returns The file extension (including the dot) or empty string if none
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';

  const lastDotIndex = filename.lastIndexOf('.');

  // If no dot or dot is at the first character (hidden file), return empty string
  if (lastDotIndex <= 0) {
    return '';
  }

  return filename.substring(lastDotIndex);
}

/**
 * Gets a human-readable description of allowed file types
 *
 * @param allowedTypes - Array of allowed MIME types
 * @returns Human-readable description
 */
function getAllowedTypesDescription(allowedTypes: string[]): string {
  // Group by category
  const categories: Record<string, string[]> = {};

  allowedTypes.forEach((type) => {
    const category = type.split('/')[0] || 'other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(type);
  });

  // Build description
  const descriptions: string[] = [];

  if (categories.image) {
    descriptions.push('images');
  }
  if (categories.video) {
    descriptions.push('videos');
  }
  if (categories.audio) {
    descriptions.push('audio');
  }
  if (categories.application || categories.text) {
    descriptions.push('documents');
  }

  return descriptions.length > 0
    ? descriptions.join(', ')
    : allowedTypes.join(', ');
}

/**
 * Formats file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Gets MIME type from file extension
 *
 * @param extension - File extension (with or without dot)
 * @returns MIME type or undefined if not found
 */
export function getMimeTypeFromExtension(extension: string): string | undefined {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.zip': 'application/zip',
  };

  return mimeMap[ext.toLowerCase()];
}
