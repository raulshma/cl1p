/**
 * WebRTC Connection String Generator
 *
 * Serializes WebRTC peer connection data (SDP offer/answer) into a compact,
 * shareable string. Includes room metadata and password hash in the connection string.
 */

import * as SimplePeer from 'simple-peer';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Metadata about the room and peer connection
 */
export interface ConnectionStringMetadata {
  roomId: string;
  peerId: string;
  timestamp: number;
  version: string;
  hashedPassword?: string;
}

/**
 * Complete connection string data including SDP and metadata
 */
export interface WebRTCConnectionStringData {
  metadata: ConnectionStringMetadata;
  signalData: SimplePeer.SignalData | any;
}

/**
 * Parsed connection string result
 */
export interface ParsedWebRTCConnectionString {
  metadata: ConnectionStringMetadata;
  signalData: SimplePeer.SignalData | any;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

/**
 * Zod schema for validating connection string metadata
 */
const MetadataSchema = z.object({
  roomId: z.string().min(1),
  peerId: z.string().min(1),
  timestamp: z.number().int().positive(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  hashedPassword: z.string().optional(),
});

/**
 * Zod schema for validating signal data
 */
const SignalDataSchema = z.object({
  type: z.enum(['offer', 'answer', 'pranswer', 'rollback', 'candidate']),
  sdp: z.string().optional(),
  candidate: z.any().optional(),
});

// ============================================================================
// CONNECTION STRING GENERATOR
// ============================================================================

const CONNECTION_STRING_VERSION = '1.0.0';
const CONNECTION_STRING_PREFIX = 'live-clipboard-webrtc://';

/**
 * Generate a WebRTC connection string from signal data and metadata
 *
 * @param signalData - The WebRTC signal data (offer/answer)
 * @param metadata - Room and peer metadata
 * @returns A compact, shareable connection string
 *
 * @example
 * ```ts
 * const connString = generateWebRTCConnectionString(
 *   { type: 'offer', sdp: 'v=0\r\n...' },
 *   { roomId: 'room-123', peerId: 'peer-456', timestamp: Date.now(), version: '1.0.0' }
 * );
 * // Returns: 'live-clipboard-webrtc://eyJtZXRhZGF0YSI6e...SI6e319'
 * ```
 */
export function generateWebRTCConnectionString(
  signalData: SimplePeer.SignalData | any,
  metadata: Omit<ConnectionStringMetadata, 'version'>
): string {
  // Add version to metadata
  const completeMetadata: ConnectionStringMetadata = {
    ...metadata,
    version: CONNECTION_STRING_VERSION,
  };

  // Validate metadata
  const validationResult = MetadataSchema.safeParse(completeMetadata);
  if (!validationResult.success) {
    throw new Error(`Invalid metadata: ${validationResult.error.message}`);
  }

  // Validate signal data
  const signalValidation = SignalDataSchema.safeParse(signalData);
  if (!signalValidation.success) {
    throw new Error(`Invalid signal data: ${signalValidation.error.message}`);
  }

  // Create the connection string data object
  const connectionStringData: WebRTCConnectionStringData = {
    metadata: completeMetadata,
    signalData,
  };

  // Serialize to JSON
  const jsonString = JSON.stringify(connectionStringData);

  // Encode to base64 for URL-safe sharing
  const base64Encoded = base64Encode(jsonString);

  // Create the final connection string
  return `${CONNECTION_STRING_PREFIX}${base64Encoded}`;
}

// ============================================================================
// CONNECTION STRING PARSER
// ============================================================================

/**
 * Parse a WebRTC connection string and extract signal data and metadata
 *
 * @param connectionString - The connection string to parse
 * @returns The parsed signal data and metadata
 * @throws Error if the connection string is invalid
 *
 * @example
 * ```ts
 * const parsed = parseWebRTCConnectionString('live-clipboard-webrtc://eyJtZXRh...');
 * // Returns: { metadata: {...}, signalData: {...} }
 * ```
 */
export function parseWebRTCConnectionString(
  connectionString: string
): ParsedWebRTCConnectionString {
  if (!connectionString || typeof connectionString !== 'string') {
    throw new Error('Connection string must be a non-empty string');
  }

  if (!connectionString.startsWith(CONNECTION_STRING_PREFIX)) {
    throw new Error(
      `Connection string must start with "${CONNECTION_STRING_PREFIX}"`
    );
  }

  try {
    // Remove the prefix
    const base64Encoded = connectionString.replace(CONNECTION_STRING_PREFIX, '');

    // Decode from base64
    const jsonString = base64Decode(base64Encoded);

    // Parse JSON
    const connectionStringData: WebRTCConnectionStringData =
      JSON.parse(jsonString);

    // Validate metadata
    const metadataValidation = MetadataSchema.safeParse(
      connectionStringData.metadata
    );
    if (!metadataValidation.success) {
      throw new Error(
        `Invalid metadata in connection string: ${metadataValidation.error.message}`
      );
    }

    // Validate signal data
    const signalValidation = SignalDataSchema.safeParse(
      connectionStringData.signalData
    );
    if (!signalValidation.success) {
      throw new Error(
        `Invalid signal data in connection string: ${signalValidation.error.message}`
      );
    }

    return connectionStringData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Invalid connection string: ${connectionString}`);
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate a WebRTC connection string without fully parsing it
 *
 * @param connectionString - The connection string to validate
 * @returns True if the connection string is valid
 *
 * @example
 * ```ts
 * const isValid = isValidWebRTCConnectionString('live-clipboard-webrtc://...');
 * // Returns: true or false
 * ```
 */
export function isValidWebRTCConnectionString(
  connectionString: string
): boolean {
  try {
    parseWebRTCConnectionString(connectionString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a connection string is expired
 *
 * @param connectionString - The connection string to check
 * @param maxAge - Maximum age in milliseconds (default: 24 hours)
 * @returns True if the connection string is expired
 *
 * @example
 * ```ts
 * const isExpired = isConnectionStringExpired('live-clipboard-webrtc://...', 3600000);
 * // Returns: true if the string is older than 1 hour
 * ```
 */
export function isConnectionStringExpired(
  connectionString: string,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
): boolean {
  try {
    const parsed = parseWebRTCConnectionString(connectionString);
    const age = Date.now() - parsed.metadata.timestamp;
    return age > maxAge;
  } catch {
    return true;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Encode a string to base64 (URL-safe)
 *
 * @param str - The string to encode
 * @returns Base64 encoded string
 */
function base64Encode(str: string): string {
  // Convert to base64
  const base64 = Buffer.from(str, 'utf-8').toString('base64');

  // Make it URL-safe
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode a base64 string (URL-safe)
 *
 * @param str - The base64 string to decode
 * @returns Decoded string
 */
function base64Decode(str: string): string {
  // Convert from URL-safe to standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if necessary
  while (base64.length % 4) {
    base64 += '=';
  }

  // Decode from base64
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extract room ID from a connection string
 *
 * @param connectionString - The connection string
 * @returns The room ID
 *
 * @example
 * ```ts
 * const roomId = extractRoomId('live-clipboard-webrtc://...');
 * // Returns: 'room-123'
 * ```
 */
export function extractRoomId(connectionString: string): string {
  const parsed = parseWebRTCConnectionString(connectionString);
  return parsed.metadata.roomId;
}

/**
 * Extract peer ID from a connection string
 *
 * @param connectionString - The connection string
 * @returns The peer ID
 *
 * @example
 * ```ts
 * const peerId = extractPeerId('live-clipboard-webrtc://...');
 * // Returns: 'peer-456'
 * ```
 */
export function extractPeerId(connectionString: string): string {
  const parsed = parseWebRTCConnectionString(connectionString);
  return parsed.metadata.peerId;
}

/**
 * Extract signal data from a connection string
 *
 * @param connectionString - The connection string
 * @returns The signal data
 *
 * @example
 * ```ts
 * const signalData = extractSignalData('live-clipboard-webrtc://...');
 * // Returns: { type: 'offer', sdp: '...' }
 * ```
 */
export function extractSignalData(
  connectionString: string
): SimplePeer.SignalData | any {
  const parsed = parseWebRTCConnectionString(connectionString);
  return parsed.signalData;
}

/**
 * Check if a connection string has a password
 *
 * @param connectionString - The connection string
 * @returns True if the connection string has a password
 *
 * @example
 * ```ts
 * const hasPassword = hasConnectionStringPassword('live-clipboard-webrtc://...');
 * // Returns: true or false
 * ```
 */
export function hasConnectionStringPassword(
  connectionString: string
): boolean {
  try {
    const parsed = parseWebRTCConnectionString(connectionString);
    return !!parsed.metadata.hashedPassword;
  } catch {
    return false;
  }
}

/**
 * Get connection string version
 *
 * @param connectionString - The connection string
 * @returns The version string
 *
 * @example
 * ```ts
 * const version = getConnectionStringVersion('live-clipboard-webrtc://...');
 * // Returns: '1.0.0'
 * ```
 */
export function getConnectionStringVersion(connectionString: string): string {
  const parsed = parseWebRTCConnectionString(connectionString);
  return parsed.metadata.version;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateWebRTCConnectionString,
  parseWebRTCConnectionString,
  isValidWebRTCConnectionString,
  isConnectionStringExpired,
  extractRoomId,
  extractPeerId,
  extractSignalData,
  hasConnectionStringPassword,
  getConnectionStringVersion,
};
