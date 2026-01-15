/**
 * Room ID Generator Utility
 * Generates unique room IDs using UUID v4 or custom URL-safe slugs
 */

/**
 * Character set for generating custom slugs (URL-safe)
 * Excludes confusing characters like 0O, 1lI
 */
const SLUG_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

/**
 * Session storage to track used room IDs and ensure uniqueness
 */
const usedRoomIds = new Set<string>();

/**
 * Configuration for room ID generation
 */
export interface RoomIdGeneratorOptions {
  /**
   * Type of ID to generate
   * - 'uuid': Full UUID v4 (e.g., '550e8400-e29b-41d4-a716-446655440000')
   * - 'short-uuid': Shortened UUID (e.g., 'a1b2c3d4')
   * - 'slug': Custom URL-friendly slug (e.g., 'clever-wombat-42')
   * - 'nanoid': NanoID-style string (e.g., 'V1StGXR8_Z5jdHi6B-myT')
   */
  type?: 'uuid' | 'short-uuid' | 'slug' | 'nanoid';

  /**
   * Length for slug/nanoid types (default: 12 for slug, 21 for nanoid)
   */
  length?: number;

  /**
   * Custom prefix for the room ID (e.g., 'room-')
   */
  prefix?: string;

  /**
   * Separator for slug type (default: '-')
   */
  separator?: string;

  /**
   * Whether to check uniqueness in session (default: true)
   */
  checkUnique?: boolean;

  /**
   * Maximum number of retries to generate a unique ID (default: 100)
   */
  maxRetries?: number;
}

/**
 * Generates a random UUID v4
 * @returns UUID v4 string
 */
function generateUUID(): string {
  // Generate random values for UUID
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version bits to 0100 (UUID v4)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  // Set variant bits to 10xxxxxx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  // Convert to hex string with proper formatting
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Shortens a UUID to a specified length
 * @param uuid - Full UUID string
 * @param length - Desired length (default: 8)
 * @returns Shortened UUID string
 */
function shortenUUID(uuid: string, length: number = 8): string {
  return uuid.replace(/-/g, '').substring(0, length);
}

/**
 * Generates a random string from the SLUG_CHARS character set
 * @param length - Length of the string to generate
 * @returns Random string
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += SLUG_CHARS[array[i]! % SLUG_CHARS.length];
  }

  return result;
}

/**
 * Generates a NanoID-style string
 * Uses URL-safe characters and random generation
 * @param length - Length of the NanoID (default: 21)
 * @returns NanoID string
 */
function generateNanoID(length: number = 21): string {
  const urlSafeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += urlSafeChars[array[i]! % urlSafeChars.length];
  }

  return result;
}

/**
 * Word list for generating memorable slugs
 */
const ADJECTIVES = [
  'clever', 'swift', 'happy', 'brave', 'calm', 'eager', 'gentle', 'kind',
  'lucky', 'noble', 'proud', 'silly', 'witty', 'zealous', 'alert', 'bold',
  'bright', 'calm', 'cozy', 'daring', 'eager', 'fancy', 'gentle', 'jolly',
  'keen', 'merry', 'neat', 'polite', 'quick', 'sharp', 'smart', 'vast',
  'warm', 'wise', 'zesty'
];

const NOUNS = [
  'panda', 'tiger', 'eagle', 'dolphin', 'fox', 'wolf', 'bear', 'lion',
  'hawk', 'owl', 'koala', 'penguin', 'rabbit', 'deer', 'whale', 'shark',
  'badger', 'beaver', 'bobcat', 'coyote', 'falcon', 'lemur', 'meerkat',
  'otter', 'raccoon', 'seal', 'skunk', 'squirrel', 'turtle', 'wombat'
];

/**
 * Generates a memorable slug with adjective + noun + number
 * @returns Memorable slug string
 */
function generateMemorableSlug(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective}-${noun}-${number}`;
}

/**
 * Validates that a room ID is URL-safe
 * @param roomId - Room ID to validate
 * @returns True if URL-safe, false otherwise
 */
export function isUrlSafe(roomId: string): boolean {
  // URL-safe characters: alphanumeric, hyphen, underscore, tilde
  const urlSafePattern = /^[a-zA-Z0-9\-_~]+$/;
  return urlSafePattern.test(roomId);
}

/**
 * Validates that a room ID is unique within the session
 * @param roomId - Room ID to check
 * @returns True if unique, false if already used
 */
export function isUniqueInSession(roomId: string): boolean {
  return !usedRoomIds.has(roomId);
}

/**
 * Generates a unique room ID based on the specified options
 * @param options - Configuration options for generation
 * @returns Unique room ID string
 * @throws Error if unable to generate unique ID after max retries
 */
export function generateRoomId(options: RoomIdGeneratorOptions = {}): string {
  const {
    type = 'slug',
    length,
    prefix = '',
    separator = '-',
    checkUnique = true,
    maxRetries = 100
  } = options;

  let roomId = '';
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;

    switch (type) {
      case 'uuid':
        roomId = generateUUID();
        break;

      case 'short-uuid':
        roomId = shortenUUID(generateUUID(), length || 8);
        break;

      case 'slug':
        if (length) {
          // Generate custom length slug
          roomId = generateRandomString(length);
        } else {
          // Generate memorable slug
          roomId = generateMemorableSlug();
        }
        break;

      case 'nanoid':
        roomId = generateNanoID(length || 21);
        break;

      default:
        throw new Error(`Invalid room ID type: ${type}`);
    }

    // Add prefix if specified
    if (prefix) {
      roomId = `${prefix}${separator}${roomId}`;
    }

    // Check uniqueness if required
    if (!checkUnique || isUniqueInSession(roomId)) {
      usedRoomIds.add(roomId);
      return roomId;
    }
  }

  throw new Error(
    `Failed to generate unique room ID after ${maxRetries} attempts`
  );
}

/**
 * Marks a room ID as used in the current session
 * @param roomId - Room ID to mark as used
 */
export function markRoomIdAsUsed(roomId: string): void {
  usedRoomIds.add(roomId);
}

/**
 * Checks if a room ID is valid (URL-safe and optionally unique)
 * @param roomId - Room ID to validate
 * @param options - Validation options
 * @returns Validation result with isValid flag and error message if invalid
 */
export function validateRoomId(
  roomId: string,
  options: { checkUnique?: boolean } = {}
): { isValid: boolean; error?: string } {
  if (!roomId || roomId.length === 0) {
    return { isValid: false, error: 'Room ID cannot be empty' };
  }

  if (roomId.length > 255) {
    return { isValid: false, error: 'Room ID is too long (max 255 characters)' };
  }

  if (!isUrlSafe(roomId)) {
    return {
      isValid: false,
      error: 'Room ID contains invalid characters (only alphanumeric, hyphen, underscore, and tilde allowed)'
    };
  }

  if (options.checkUnique && !isUniqueInSession(roomId)) {
    return {
      isValid: false,
      error: 'Room ID is already in use in this session'
    };
  }

  return { isValid: true };
}

/**
 * Clears all tracked room IDs from the session
 * Useful for testing or resetting state
 */
export function clearRoomIdCache(): void {
  usedRoomIds.clear();
}

/**
 * Gets the count of currently tracked room IDs
 * @returns Number of tracked room IDs
 */
export function getTrackedRoomIdCount(): number {
  return usedRoomIds.size;
}
