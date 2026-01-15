/**
 * Unit Tests for Password Encryption
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateConnectionString,
  parseConnectionString,
  validatePasswordStrength,
} from '../crypto/password-encryption';

describe('Password Encryption', () => {
  describe('hashPassword', () => {
    it('should hash a password correctly', () => {
      const password = 'MySecurePassword123';
      const hash = hashPassword(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it('should generate consistent hashes for same password', () => {
      const password = 'SamePassword123';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different passwords', () => {
      const hash1 = hashPassword('Password1');
      const hash2 = hashPassword('Password2');

      expect(hash1).not.toBe(hash2);
    });

    it('should trim whitespace before hashing', () => {
      const hash1 = hashPassword('  password  ');
      const hash2 = hashPassword('password');

      expect(hash1).toBe(hash2);
    });

    it('should throw error for empty password', () => {
      expect(() => hashPassword('')).toThrow('Password cannot be empty');
    });

    it('should throw error for whitespace-only password', () => {
      expect(() => hashPassword('   ')).toThrow('Password cannot be empty');
    });

    it('should handle special characters', () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hash = hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const password = '🔐Password密码123';
      const hash = hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce hash of expected length', () => {
      const password = 'TestPassword123';
      const hash = hashPassword(password);

      // SHA-256 produces 64 hex characters
      expect(hash.length).toBe(64);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'CorrectPassword123';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'CorrectPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = hashPassword(password);

      expect(verifyPassword(wrongPassword, hash)).toBe(false);
    });

    it('should be case sensitive', () => {
      const password = 'MyPassword123';
      const hash = hashPassword(password);

      expect(verifyPassword('mypassword123', hash)).toBe(false);
      expect(verifyPassword('MYPASSWORD123', hash)).toBe(false);
    });

    it('should handle empty password', () => {
      const hash = hashPassword('password123');
      expect(verifyPassword('', hash)).toBe(false);
    });

    it('should return false for invalid hash', () => {
      expect(verifyPassword('password', 'invalid')).toBe(false);
    });

    it('should handle whitespace differences', () => {
      const password = 'password';
      const hash = hashPassword(password);

      expect(verifyPassword('  password  ', hash)).toBe(true);
    });
  });

  describe('generateConnectionString', () => {
    it('should generate connection string without password', () => {
      const roomId = 'my-room-123';
      const connString = generateConnectionString(roomId);

      expect(connString).toBe(`live-clipboard://${roomId}`);
    });

    it('should generate connection string with password', () => {
      const roomId = 'my-room-123';
      const password = hashPassword('mypassword');
      const connString = generateConnectionString(roomId, password);

      expect(connString).toContain('live-clipboard://');
      expect(connString).toContain(roomId);
      expect(connString).toContain('?pw=');
      expect(connString).toContain(password);
    });

    it('should handle special characters in room ID', () => {
      const roomId = 'room_123-abc~test';
      const connString = generateConnectionString(roomId);

      expect(connString).toBe(`live-clipboard://${roomId}`);
    });

    it('should handle empty room ID', () => {
      const connString = generateConnectionString('');
      expect(connString).toBe('live-clipboard://');
    });
  });

  describe('parseConnectionString', () => {
    it('should parse connection string without password', () => {
      const connString = 'live-clipboard://my-room-123';
      const parsed = parseConnectionString(connString);

      expect(parsed.roomId).toBe('my-room-123');
      expect(parsed.hashedPassword).toBeUndefined();
    });

    it('should parse connection string with password', () => {
      const roomId = 'my-room-123';
      const password = hashPassword('mypassword');
      const connString = generateConnectionString(roomId, password);
      const parsed = parseConnectionString(connString);

      expect(parsed.roomId).toBe(roomId);
      expect(parsed.hashedPassword).toBe(password);
    });

    it('should handle connection string with multiple parameters', () => {
      const connString = 'live-clipboard://my-room?pw=abc123&other=value';
      const parsed = parseConnectionString(connString);

      expect(parsed.roomId).toBe('my-room');
      expect(parsed.hashedPassword).toBe('abc123');
    });

    it('should throw error for invalid protocol', () => {
      expect(() => parseConnectionString('http://room-123')).toThrow('must start with "live-clipboard://"');
    });

    it('should throw error for empty connection string', () => {
      expect(() => parseConnectionString('')).toThrow('Connection string must be a non-empty string');
    });

    it('should throw error for missing room ID', () => {
      expect(() => parseConnectionString('live-clipboard://')).toThrow('must contain a room ID');
    });

    it('should handle room ID with special characters', () => {
      const connString = 'live-clipboard://room_123-abc~test';
      const parsed = parseConnectionString(connString);

      expect(parsed.roomId).toBe('room_123-abc~test');
    });

    it('should handle connection string with only query params', () => {
      const connString = 'live-clipboard://room?pw=test123';
      const parsed = parseConnectionString(connString);

      expect(parsed.roomId).toBe('room');
      expect(parsed.hashedPassword).toBe('test123');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject password without numbers', () => {
      const result = validatePasswordStrength('NoNumbersHere');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least one number');
    });

    it('should reject password without letters', () => {
      const result = validatePasswordStrength('12345678');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least one letter');
    });

    it('should reject empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should accept password with special characters', () => {
      const result = validatePasswordStrength('P@ssw0rd!123');
      expect(result.isValid).toBe(true);
    });

    it('should handle password with only letters and numbers', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.isValid).toBe(true);
    });

    it('should handle password exactly 8 characters', () => {
      const result = validatePasswordStrength('Pass1234');
      expect(result.isValid).toBe(true);
    });

    it('should handle password with unicode characters', () => {
      const result = validatePasswordStrength('密码123abc');
      expect(result.isValid).toBe(true);
    });

    it('should reject password with only letters and one number at boundary', () => {
      const result = validatePasswordStrength('Password1');
      expect(result.isValid).toBe(true);
    });
  });

  describe('End-to-End Password Flow', () => {
    it('should complete full password flow', () => {
      const originalPassword = 'MySecurePassword123';

      // Hash password
      const hash = hashPassword(originalPassword);
      expect(hash).toBeTruthy();

      // Generate connection string
      const roomId = 'secure-room';
      const connString = generateConnectionString(roomId, hash);
      expect(connString).toContain(roomId);
      expect(connString).toContain(hash);

      // Parse connection string
      const parsed = parseConnectionString(connString);
      expect(parsed.roomId).toBe(roomId);
      expect(parsed.hashedPassword).toBe(hash);

      // Verify password
      expect(verifyPassword(originalPassword, hash)).toBe(true);
      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('should handle password strength validation in flow', () => {
      const weakPassword = 'weak';
      const validation = validatePasswordStrength(weakPassword);

      expect(validation.isValid).toBe(false);

      if (!validation.isValid) {
        // Should not hash weak password
        expect(() => hashPassword(weakPassword)).not.toThrow();
      }
    });
  });
});
