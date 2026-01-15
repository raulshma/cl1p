/**
 * Room Join Validation Utilities
 *
 * Provides comprehensive validation for joining rooms including:
 * - Room ID format validation
 * - Password verification
 * - Connection string parsing
 */

import { validateRoomId } from './room-id-generator';
import {
  parseConnectionString,
  verifyPassword,
  validatePasswordStrength,
} from '@/lib/crypto/password-encryption';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  roomId?: string;
  requiresPassword?: boolean;
  hasPassword?: boolean;
}

/**
 * Join room options
 */
export interface JoinRoomOptions {
  roomId?: string;
  connectionString?: string;
  password?: string;
  skipPasswordVerification?: boolean;
}

/**
 * Validates a room ID format
 *
 * @param roomId - The room ID to validate
 * @returns Validation result
 */
export function validateRoomIdFormat(roomId: string): ValidationResult {
  if (!roomId || typeof roomId !== 'string') {
    return {
      isValid: false,
      error: 'Room ID is required and must be a string',
    };
  }

  // Trim whitespace
  const trimmedRoomId = roomId.trim();

  if (trimmedRoomId.length === 0) {
    return {
      isValid: false,
      error: 'Room ID cannot be empty',
    };
  }

  // Use existing room ID validator
  const validation = validateRoomId(trimmedRoomId);

  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.error || 'Invalid room ID format',
    };
  }

  return {
    isValid: true,
    roomId: trimmedRoomId,
  };
}

/**
 * Parses and validates a connection string
 *
 * @param connectionString - The connection string to parse
 * @returns Validation result with parsed room ID and password info
 */
export function validateAndParseConnectionString(
  connectionString: string
): ValidationResult {
  if (!connectionString || typeof connectionString !== 'string') {
    return {
      isValid: false,
      error: 'Connection string is required and must be a string',
    };
  }

  // Trim whitespace
  const trimmedConnectionString = connectionString.trim();

  if (trimmedConnectionString.length === 0) {
    return {
      isValid: false,
      error: 'Connection string cannot be empty',
    };
  }

  try {
    // Try to parse as live-clipboard:// connection string
    if (trimmedConnectionString.startsWith('live-clipboard://')) {
      const parsed = parseConnectionString(trimmedConnectionString);

      // Validate the room ID from the connection string
      const roomIdValidation = validateRoomIdFormat(parsed.roomId);
      if (!roomIdValidation.isValid) {
        return {
          isValid: false,
          error: `Invalid room ID in connection string: ${roomIdValidation.error}`,
        };
      }

      return {
        isValid: true,
        roomId: parsed.roomId,
        requiresPassword: !!parsed.hashedPassword,
        hasPassword: !!parsed.hashedPassword,
      };
    }

    // Try to parse as live-clipboard-webrtc:// connection string
    if (trimmedConnectionString.startsWith('live-clipboard-webrtc://')) {
      // Import WebRTC connection string parser dynamically to avoid circular dependencies
      try {
        const { extractRoomId, hasConnectionStringPassword } = require('@/lib/webrtc/connection-string-generator');

        const roomId = extractRoomId(trimmedConnectionString);
        const hasPassword = hasConnectionStringPassword(trimmedConnectionString);

        // Validate the room ID
        const roomIdValidation = validateRoomIdFormat(roomId);
        if (!roomIdValidation.isValid) {
          return {
            isValid: false,
            error: `Invalid room ID in connection string: ${roomIdValidation.error}`,
          };
        }

        return {
          isValid: true,
          roomId,
          requiresPassword: hasPassword,
          hasPassword: hasPassword,
        };
      } catch (error) {
        return {
          isValid: false,
          error: `Invalid WebRTC connection string: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // If it's not a recognized connection string format, try to validate as plain room ID
    const roomIdValidation = validateRoomIdFormat(trimmedConnectionString);
    if (roomIdValidation.isValid) {
      return {
        isValid: true,
        roomId: trimmedConnectionString,
        requiresPassword: false,
        hasPassword: false,
      };
    }

    return {
      isValid: false,
      error: 'Invalid connection string format. Expected live-clipboard:// or live-clipboard-webrtc://',
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to parse connection string: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validates a password against requirements
 *
 * @param password - The password to validate
 * @returns Validation result
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password must be a string',
    };
  }

  const trimmedPassword = password.trim();

  if (trimmedPassword.length === 0) {
    // Empty password is valid (room is not protected)
    return {
      isValid: true,
    };
  }

  // Validate password strength
  const strengthValidation = validatePasswordStrength(trimmedPassword);
  if (!strengthValidation.isValid) {
    return {
      isValid: false,
      error: strengthValidation.message || 'Invalid password',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates all parameters for joining a room
 *
 * @param options - Join room options
 * @returns Comprehensive validation result
 */
export function validateJoinRoom(options: JoinRoomOptions): ValidationResult {
  const { roomId, connectionString, password, skipPasswordVerification = false } = options;

  // Either roomId or connectionString must be provided
  if (!roomId && !connectionString) {
    return {
      isValid: false,
      error: 'Either room ID or connection string is required',
    };
  }

  // If both are provided, prefer connection string
  if (roomId && connectionString) {
    return {
      isValid: false,
      error: 'Provide either room ID or connection string, not both',
    };
  }

  let finalRoomId: string | undefined;
  let requiresPassword = false;
  let hasPasswordInString = false;

  // Validate connection string or room ID
  if (connectionString) {
    const connValidation = validateAndParseConnectionString(connectionString);
    if (!connValidation.isValid) {
      return connValidation;
    }
    finalRoomId = connValidation.roomId;
    requiresPassword = connValidation.requiresPassword || false;
    hasPasswordInString = connValidation.hasPassword || false;
  } else if (roomId) {
    const roomIdValidation = validateRoomIdFormat(roomId);
    if (!roomIdValidation.isValid) {
      return roomIdValidation;
    }
    finalRoomId = roomIdValidation.roomId;
  }

  // Ensure finalRoomId is assigned
  if (!finalRoomId) {
    return {
      isValid: false,
      error: 'Failed to determine room ID',
    };
  }

  // Validate password if provided
  if (password !== undefined) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }
  }

  // Check if password is required but not provided
  if (requiresPassword && !password && !skipPasswordVerification && !hasPasswordInString) {
    return {
      isValid: false,
      error: 'This room requires a password',
      roomId: finalRoomId,
      requiresPassword: true,
    };
  }

  return {
    isValid: true,
    roomId: finalRoomId,
    requiresPassword,
    hasPassword: hasPasswordInString || !!password,
  };
}

/**
 * Verifies a password against a stored hashed password
 *
 * @param password - The plain text password to verify
 * @param hashedPassword - The stored hashed password
 * @returns True if password matches
 */
export function verifyRoomPassword(
  password: string,
  hashedPassword: string
): boolean {
  try {
    return verifyPassword(password, hashedPassword);
  } catch (error) {
    return false;
  }
}

/**
 * Error messages for different validation scenarios
 */
export const VALIDATION_ERRORS = {
  EMPTY_ROOM_ID: 'Room ID cannot be empty',
  INVALID_ROOM_ID_FORMAT: 'Invalid room ID format. Use letters, numbers, hyphens, underscores, and tildes only',
  ROOM_ID_TOO_LONG: 'Room ID is too long (max 255 characters)',
  INVALID_CONNECTION_STRING: 'Invalid connection string format',
  PASSWORD_REQUIRED: 'This room requires a password',
  INVALID_PASSWORD: 'Invalid password',
  WEAK_PASSWORD: 'Password must be at least 8 characters with letters and numbers',
  ROOM_ID_OR_CONNECTION_REQUIRED: 'Either room ID or connection string is required',
  BOTH_PROVIDED: 'Provide either room ID or connection string, not both',
} as const;

/**
 * Helper function to get user-friendly error message
 *
 * @param error - The error code or message
 * @returns User-friendly error message
 */
export function getValidationErrorMessage(error: string | undefined): string {
  if (!error) return 'An unknown error occurred';

  // Check if it's a known error code
  if (Object.values(VALIDATION_ERRORS).includes(error as any)) {
    return error;
  }

  // Return the error as-is
  return error;
}
