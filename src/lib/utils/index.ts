/**
 * Utility functions exports
 */

export {
  generateRoomId,
  validateRoomId,
  isUrlSafe,
  isUniqueInSession,
  markRoomIdAsUsed,
  clearRoomIdCache,
  getTrackedRoomIdCount,
  type RoomIdGeneratorOptions
} from './room-id-generator';

// Export file validation utilities
export {
  validateFile,
  validateFiles,
  sanitizeFilenameForPath,
  isFilenameSafe,
  getFileExtension,
  formatFileSize,
  getMimeTypeFromExtension,
  SAFE_MIME_TYPES,
  ALL_SAFE_MIME_TYPES,
  SAFE_FILE_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
  type FileValidationResult,
  type FileValidationOptions,
  type FileValidationErrorType,
} from './file-validation';

// Export cn function from shadcn-utils.ts file
export { cn } from '../shadcn-utils';

// Export time formatting utilities
export {
  formatRelativeTime,
  formatAbsoluteTime,
  formatTimeWithAbsolute,
  isRecent,
  isToday,
} from './time-format';
