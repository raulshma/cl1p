/**
 * Unit Tests for Room ID Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRoomId,
  isUrlSafe,
  isUniqueInSession,
  validateRoomId,
  markRoomIdAsUsed,
  clearRoomIdCache,
  getTrackedRoomIdCount,
} from '../utils/room-id-generator';

describe('Room ID Generator', () => {
  beforeEach(() => {
    clearRoomIdCache();
  });

  describe('generateRoomId', () => {
    it('should generate a slug by default', () => {
      const roomId = generateRoomId();
      expect(roomId).toBeTruthy();
      expect(roomId.length).toBeGreaterThan(0);
      expect(isUrlSafe(roomId)).toBe(true);
    });

    it('should generate UUID type room ID', () => {
      const roomId = generateRoomId({ type: 'uuid' });
      expect(roomId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate a slug type room ID', () => {
      const roomId = generateRoomId({ type: 'slug' });
      expect(roomId).toBeTruthy();
      expect(roomId.length).toBeGreaterThan(0);
      expect(isUrlSafe(roomId)).toBe(true);
    });

    it('should generate a short-uuid type room ID', () => {
      const roomId = generateRoomId({ type: 'short-uuid' });
      expect(roomId).toBeTruthy();
      expect(roomId.length).toBe(8);
      expect(roomId).toMatch(/^[0-9a-f]{8}$/i);
    });

    it('should generate a nanoid type room ID', () => {
      const roomId = generateRoomId({ type: 'nanoid' });
      expect(roomId).toBeTruthy();
      expect(roomId.length).toBe(21);
      expect(isUrlSafe(roomId)).toBe(true);
    });

    it('should generate custom length slug', () => {
      const roomId = generateRoomId({ type: 'slug', length: 16 });
      expect(roomId.length).toBe(16);
      expect(isUrlSafe(roomId)).toBe(true);
    });

    it('should add prefix to room ID', () => {
      const roomId = generateRoomId({ type: 'slug', prefix: 'room', length: 8 });
      expect(roomId).toMatch(/^room-/);
      expect(roomId.length).toBeGreaterThan(5);
    });

    it('should use custom separator', () => {
      const roomId = generateRoomId({ type: 'slug', prefix: 'room', separator: '_', length: 8 });
      expect(roomId).toMatch(/^room_/);
    });

    it('should generate unique room IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const roomId = generateRoomId({ type: 'slug', length: 12 });
        ids.add(roomId);
      }
      // With 12 characters from a 57-char set, collisions are extremely unlikely
      expect(ids.size).toBeGreaterThanOrEqual(99);
    });

    it('should throw error for invalid type', () => {
      expect(() => generateRoomId({ type: 'invalid' as any })).toThrow('Invalid room ID type');
    });

    it('should mark generated room IDs as used', () => {
      const roomId = generateRoomId({ type: 'slug', checkUnique: true });
      expect(isUniqueInSession(roomId)).toBe(false);
      expect(getTrackedRoomIdCount()).toBe(1);
    });
  });

  describe('isUrlSafe', () => {
    it('should return true for URL-safe characters', () => {
      expect(isUrlSafe('abc123-ABC_123~test')).toBe(true);
      expect(isUrlSafe('Room-123')).toBe(true);
      expect(isUrlSafe('test_room')).toBe(true);
      expect(isUrlSafe('test~room')).toBe(true);
    });

    it('should return false for URL-unsafe characters', () => {
      expect(isUrlSafe('room@123')).toBe(false);
      expect(isUrlSafe('room#123')).toBe(false);
      expect(isUrlSafe('room$123')).toBe(false);
      expect(isUrlSafe('room%20')).toBe(false);
      expect(isUrlSafe('room/123')).toBe(false);
      expect(isUrlSafe('room\\123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isUrlSafe('')).toBe(false);
    });
  });

  describe('isUniqueInSession', () => {
    it('should return true for new room ID', () => {
      expect(isUniqueInSession('new-room-id')).toBe(true);
    });

    it('should return false for used room ID', () => {
      markRoomIdAsUsed('existing-room');
      expect(isUniqueInSession('existing-room')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      markRoomIdAsUsed('MyRoom');
      expect(isUniqueInSession('myroom')).toBe(true);
      expect(isUniqueInSession('MyRoom')).toBe(false);
    });
  });

  describe('validateRoomId', () => {
    it('should validate correct room IDs', () => {
      const result = validateRoomId('valid-room-123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty room IDs', () => {
      const result = validateRoomId('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Room ID cannot be empty');
    });

    it('should reject room IDs that are too long', () => {
      const longId = 'a'.repeat(256);
      const result = validateRoomId(longId);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject room IDs with invalid characters', () => {
      const result = validateRoomId('room@123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should check uniqueness when requested', () => {
      markRoomIdAsUsed('existing-room');
      const result = validateRoomId('existing-room', { checkUnique: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already in use');
    });

    it('should not check uniqueness when not requested', () => {
      markRoomIdAsUsed('existing-room');
      const result = validateRoomId('existing-room', { checkUnique: false });
      expect(result.isValid).toBe(true);
    });
  });

  describe('markRoomIdAsUsed', () => {
    it('should mark room ID as used', () => {
      markRoomIdAsUsed('test-room');
      expect(isUniqueInSession('test-room')).toBe(false);
    });

    it('should handle duplicate marks', () => {
      markRoomIdAsUsed('test-room');
      markRoomIdAsUsed('test-room');
      expect(getTrackedRoomIdCount()).toBe(1);
    });
  });

  describe('clearRoomIdCache', () => {
    it('should clear all tracked room IDs', () => {
      markRoomIdAsUsed('room1');
      markRoomIdAsUsed('room2');
      markRoomIdAsUsed('room3');
      expect(getTrackedRoomIdCount()).toBe(3);

      clearRoomIdCache();
      expect(getTrackedRoomIdCount()).toBe(0);
      expect(isUniqueInSession('room1')).toBe(true);
    });
  });

  describe('getTrackedRoomIdCount', () => {
    it('should return zero when no IDs are tracked', () => {
      expect(getTrackedRoomIdCount()).toBe(0);
    });

    it('should return count of tracked IDs', () => {
      markRoomIdAsUsed('room1');
      markRoomIdAsUsed('room2');
      expect(getTrackedRoomIdCount()).toBe(2);
    });

    it('should not count duplicates', () => {
      markRoomIdAsUsed('room1');
      markRoomIdAsUsed('room1');
      expect(getTrackedRoomIdCount()).toBe(1);
    });
  });
});
