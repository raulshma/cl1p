/**
 * URL Encoder Utilities
 *
 * Handles encoding and decoding of WebRTC connection data for URL parameters.
 * Uses compression to minimize URL length while maintaining data integrity.
 */

import type { WebRTCConnectionStringData } from '@/lib/webrtc/connection-string-generator';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Connection data extracted from URL parameter
 */
export interface UrlConnectionData {
  metadata: {
    roomId: string;
    peerId: string;
    timestamp: number;
    version: string;
    hashedPassword?: string;
  };
  signalData: {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback' | 'candidate';
    sdp?: string;
    candidate?: any;
  };
}

/**
 * Shareable URL components
 */
export interface ShareableUrlComponents {
  baseUrl: string;
  roomSlug: string;
  connectionData: string;
  fullUrl: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const URL_PARAM_NAME = 'data';
const MAX_URL_LENGTH = 2000; // Safe browser URL length limit
const COMPRESSION_THRESHOLD = 500; // Characters above which to attempt compression

// ============================================================================
// ENCODING FUNCTIONS
// ============================================================================

/**
 * Encode connection data to URL-safe base64 string
 *
 * @param connectionStringData - The connection data to encode
 * @returns URL-safe encoded string
 *
 * @example
 * ```ts
 * const encoded = encodeConnectionDataToParam({
 *   metadata: { roomId: 'room-123', peerId: 'peer-456', timestamp: Date.now(), version: '1.0.0' },
 *   signalData: { type: 'offer', sdp: 'v=0\r\n...' }
 * });
 * ```
 */
export function encodeConnectionDataToParam(
  connectionStringData: WebRTCConnectionStringData
): string {
  try {
    // Serialize to JSON
    const jsonString = JSON.stringify(connectionStringData);

    // Check if compression is needed (simple check for now)
    if (jsonString.length > COMPRESSION_THRESHOLD) {
      // For now, just use base64 encoding
      // Could add LZ-string compression in the future
    }

    // Encode to URL-safe base64
    const base64Encoded = base64UrlEncode(jsonString);

    return base64Encoded;
  } catch (error) {
    throw new Error(`Failed to encode connection data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a complete connection string and encode it for URL parameter
 *
 * @param signalData - WebRTC signal data
 * @param roomId - Room identifier
 * @param peerId - Peer identifier
 * @param hashedPassword - Optional hashed password
 * @returns URL-safe encoded string
 */
export function encodeSignalDataToParam(
  signalData: any,
  roomId: string,
  peerId: string,
  hashedPassword?: string
): string {
  const connectionStringData: WebRTCConnectionStringData = {
    metadata: {
      roomId,
      peerId,
      timestamp: Date.now(),
      version: '1.0.0',
      hashedPassword,
    },
    signalData,
  };

  return encodeConnectionDataToParam(connectionStringData);
}

// ============================================================================
// DECODING FUNCTIONS
// ============================================================================

/**
 * Decode connection data from URL parameter
 *
 * @param encodedParam - The URL-encoded connection data
 * @returns Parsed connection data
 * @throws Error if encoding is invalid
 *
 * @example
 * ```ts
 * const data = decodeConnectionDataFromParam('eyJtZXRhZGF0YSI6...');
 * ```
 */
export function decodeConnectionDataFromParam(encodedParam: string): UrlConnectionData {
  if (!encodedParam || typeof encodedParam !== 'string') {
    throw new Error('Encoded parameter must be a non-empty string');
  }

  try {
    // Decode from URL-safe base64
    const jsonString = base64UrlDecode(encodedParam);

    // Parse JSON directly
    const connectionStringData: WebRTCConnectionStringData = JSON.parse(jsonString);

    // Validate required fields
    if (!connectionStringData.metadata || !connectionStringData.signalData) {
      throw new Error('Invalid connection data structure');
    }

    if (!connectionStringData.metadata.roomId || !connectionStringData.metadata.peerId) {
      throw new Error('Missing required metadata fields');
    }

    return {
      metadata: connectionStringData.metadata,
      signalData: connectionStringData.signalData,
    };
  } catch (error) {
    throw new Error(
      `Failed to decode connection data: ${error instanceof Error ? error.message : 'Invalid encoding'}`
    );
  }
}

/**
 * Safely decode connection data with validation
 *
 * @param encodedParam - The URL-encoded connection data
 * @returns Parsed connection data or null if invalid
 */
export function safeDecodeConnectionDataFromParam(encodedParam: string): UrlConnectionData | null {
  try {
    return decodeConnectionDataFromParam(encodedParam);
  } catch {
    return null;
  }
}

// ============================================================================
// URL GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a complete shareable URL
 *
 * @param baseUrl - The base URL (e.g., 'https://example.com')
 * @param roomSlug - The room identifier
 * @param connectionData - The encoded connection data
 * @returns Complete shareable URL
 *
 * @example
 * ```ts
 * const url = generateShareableUrl(
 *   'https://example.com',
 *   'clever-panda-42',
 *   'eyJtZXRhZGF0YSI6...'
 * );
 * // Returns: 'https://example.com/room/clever-panda-42?data=eyJtZXRhZGF0YSI6...'
 * ```
 */
export function generateShareableUrl(
  baseUrl: string,
  roomSlug: string,
  connectionData: string
): string {
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Construct the URL
  const url = new URL(`${cleanBaseUrl}/room/${roomSlug}`);
  url.searchParams.set(URL_PARAM_NAME, connectionData);

  const urlString = url.toString();

  // Check URL length
  if (urlString.length > MAX_URL_LENGTH) {
    console.warn(
      `Generated URL exceeds ${MAX_URL_LENGTH} characters. Current length: ${urlString.length}`
    );
  }

  return urlString;
}

/**
 * Generate shareable URL from connection string data
 *
 * @param baseUrl - The base URL
 * @param connectionStringData - The connection data
 * @returns Complete shareable URL
 */
export function generateShareableUrlFromData(
  baseUrl: string,
  connectionStringData: WebRTCConnectionStringData
): string {
  const encodedParam = encodeConnectionDataToParam(connectionStringData);
  return generateShareableUrl(baseUrl, connectionStringData.metadata.roomId, encodedParam);
}

/**
 * Parse a shareable URL to extract components
 *
 * @param url - The shareable URL to parse
 * @returns Parsed URL components
 * @throws Error if URL is invalid
 *
 * @example
 * ```ts
 * const components = parseShareableUrl('https://example.com/room/clever-panda-42?data=...');
 * // Returns: { baseUrl: 'https://example.com', roomSlug: 'clever-panda-42', ... }
 * ```
 */
export function parseShareableUrl(url: string): ShareableUrlComponents {
  try {
    const urlObj = new URL(url);

    // Extract room slug from pathname
    const pathMatch = urlObj.pathname.match(/^\/room\/([^\/]+)$/);
    if (!pathMatch || !pathMatch[1]) {
      throw new Error('Invalid room URL format');
    }
    const roomSlug = pathMatch[1];

    // Extract connection data from query parameters
    const connectionData = urlObj.searchParams.get(URL_PARAM_NAME);
    if (!connectionData) {
      throw new Error('No connection data found in URL');
    }

    // Construct base URL
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    return {
      baseUrl,
      roomSlug,
      connectionData,
      fullUrl: url,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse shareable URL: ${error instanceof Error ? error.message : 'Invalid URL'}`
    );
  }
}

/**
 * Safely parse a shareable URL
 *
 * @param url - The shareable URL to parse
 * @returns Parsed URL components or null if invalid
 */
export function safeParseShareableUrl(url: string): ShareableUrlComponents | null {
  try {
    return parseShareableUrl(url);
  } catch {
    return null;
  }
}

/**
 * Extract connection data from a shareable URL
 *
 * @param url - The shareable URL
 * @returns Decoded connection data or null if invalid
 */
export function extractConnectionDataFromUrl(url: string): UrlConnectionData | null {
  try {
    const components = parseShareableUrl(url);
    return decodeConnectionDataFromParam(components.connectionData);
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a valid shareable URL
 *
 * @param url - The URL to validate
 * @returns True if valid shareable URL
 */
export function isValidShareableUrl(url: string): boolean {
  try {
    const components = parseShareableUrl(url);
    const connectionData = decodeConnectionDataFromParam(components.connectionData);
    return !!connectionData;
  } catch {
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Encode string to URL-safe base64
 *
 * @param str - String to encode
 * @returns URL-safe base64 encoded string
 */
function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode URL-safe base64 string
 *
 * @param str - URL-safe base64 string
 * @returns Decoded string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if necessary
  while (base64.length % 4) {
    base64 += '=';
  }

  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Get current page URL (client-side only)
 *
 * @returns Current page URL or empty string if not available
 */
export function getCurrentPageUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.href;
}

/**
 * Get base URL from current page
 *
 * @returns Base URL (protocol + host)
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return `${window.location.protocol}//${window.location.host}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  encodeConnectionDataToParam,
  encodeSignalDataToParam,
  decodeConnectionDataFromParam,
  safeDecodeConnectionDataFromParam,
  generateShareableUrl,
  generateShareableUrlFromData,
  parseShareableUrl,
  safeParseShareableUrl,
  extractConnectionDataFromUrl,
  isValidShareableUrl,
  getCurrentPageUrl,
  getBaseUrl,
};
