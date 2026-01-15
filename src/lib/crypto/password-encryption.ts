/**
 * Password encryption utilities for room protection
 * Uses SHA-256 hashing for secure password storage and transmission
 */

import SHA256 from 'crypto-js/sha256';

// Export SHA256 for use in tests
export { SHA256 };

/**
 * Hash a password using SHA-256
 *
 * @param password - The plain text password to hash
 * @returns The hashed password as a hexadecimal string
 *
 * @example
 * ```ts
 * const hashedPassword = hashPassword('myRoomPassword123');
 * // Returns: 'a5d3e...9f2b' (SHA-256 hash)
 * ```
 */
export function hashPassword(password: string): string {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  // Use SHA-256 for one-way hashing
  const hash = SHA256(password.trim());
  return hash.toString();
}

/**
 * Verify a password against a hashed password
 *
 * @param password - The plain text password to verify
 * @param hashedPassword - The stored hashed password to compare against
 * @returns True if the password matches, false otherwise
 *
 * @example
 * ```ts
 * const storedHash = hashPassword('myRoomPassword123');
 * const isValid = verifyPassword('myRoomPassword123', storedHash);
 * // Returns: true
 * ```
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const inputHash = hashPassword(password);
    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(inputHash, hashedPassword);
  } catch (_error) {
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate a connection string with optional password protection
 *
 * @param roomId - The room ID
 * @param hashedPassword - Optional hashed password for protected rooms
 * @returns A connection string that can be shared with peers
 *
 * @example
 * ```ts
 * // Unprotected room
 * const connString = generateConnectionString('room-123');
 * // Returns: 'live-clipboard://room-123'
 *
 * // Protected room
 * const hash = hashPassword('mypassword');
 * const connString = generateConnectionString('room-123', hash);
 * // Returns: 'live-clipboard://room-123?pw=a5d3e...9f2b'
 * ```
 */
export function generateConnectionString(
  roomId: string,
  hashedPassword?: string
): string {
  const baseUrl = `live-clipboard://${roomId}`;

  if (!hashedPassword) {
    return baseUrl;
  }

  // Append hashed password as query parameter
  const params = new URLSearchParams();
  params.append('pw', hashedPassword);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse a connection string and extract room ID and password
 *
 * @param connectionString - The connection string to parse
 * @returns An object containing the room ID and optional hashed password
 * @throws Error if the connection string is invalid
 *
 * @example
 * ```ts
 * const parsed = parseConnectionString('live-clipboard://room-123?pw=a5d3e...9f2b');
 * // Returns: { roomId: 'room-123', hashedPassword: 'a5d3e...9f2b' }
 * ```
 */
export function parseConnectionString(connectionString: string): {
  roomId: string;
  hashedPassword?: string;
} {
  if (!connectionString || typeof connectionString !== 'string') {
    throw new Error('Connection string must be a non-empty string');
  }

  if (!connectionString.startsWith('live-clipboard://')) {
    throw new Error('Connection string must start with "live-clipboard://"');
  }

  try {
    // Remove the protocol prefix
    const withoutProtocol = connectionString.replace('live-clipboard://', '');

    // Check if there's a room ID
    if (!withoutProtocol || withoutProtocol.trim().length === 0) {
      throw new Error('Connection string must contain a room ID');
    }

    // Split on query string separator
    const [path, queryString] = withoutProtocol.split('?');

    if (!path) {
      throw new Error('Connection string must contain a room ID');
    }

    const roomId = path;

    let hashedPassword: string | undefined = undefined;

    if (queryString) {
      const params = new URLSearchParams(queryString);
      const pw = params.get('pw');
      if (pw) {
        hashedPassword = pw;
      }
    }

    return { roomId, hashedPassword };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Invalid connection string: ${connectionString}`);
  }
}

/**
 * Validate password strength
 *
 * @param password - The password to validate
 * @returns An object with validation result and message
 *
 * @example
 * ```ts
 * const validation = validatePasswordStrength('weak');
 * // Returns: { isValid: false, message: 'Password must be at least 8 characters' }
 * ```
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one letter',
    };
  }

  return { isValid: true };
}
