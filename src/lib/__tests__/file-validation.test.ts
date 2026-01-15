/**
 * Unit Tests for File Validation
 */

import { describe, it, expect } from 'vitest';
import {
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
} from '../utils/file-validation';

describe('File Validation', () => {
  describe('validateFile', () => {
    it('should validate a safe file', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBe('test.txt');
      expect(result.error).toBeUndefined();
    });

    it('should validate image files', () => {
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should validate PDF files', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should reject files exceeding max size', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('SIZE_EXCEEDED');
      expect(result.error?.message).toContain('exceeds maximum');
    });

    it('should reject invalid MIME types', () => {
      const file = new File(['content'], 'script.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_TYPE');
    });

    it('should reject invalid file extensions', () => {
      const file = new File(['content'], 'script.exe', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_EXTENSION');
    });

    it('should reject empty files', () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      const result = validateFile(file, { checkEmpty: true });

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('EMPTY_FILE');
    });

    it('should accept empty files when checkEmpty is false', () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      const result = validateFile(file, { checkEmpty: false });

      expect(result.isValid).toBe(true);
    });

    it('should use custom max size', () => {
      const content = new Array(2 * 1024 * 1024).fill('a').join('');
      const file = new File([content], 'file.txt', { type: 'text/plain' });
      const result = validateFile(file, { maxSize: 1024 * 1024 }); // 1MB

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('SIZE_EXCEEDED');
    });

    it('should use custom allowed MIME types', () => {
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      const result = validateFile(file, {
        allowedMimeTypes: ['text/plain']
      });

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_TYPE');
    });

    it('should use custom allowed extensions', () => {
      const file = new File(['content'], 'file.txt', { type: 'text/plain' });
      const result = validateFile(file, {
        allowedExtensions: ['.jpg', '.png']
      });

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_EXTENSION');
    });

    it('should sanitize filename by default', () => {
      const file = new File(['content'], 'test file.txt', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBe('test file.txt');
    });

    it('should skip sanitization when disabled', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(file, { sanitizeFilename: false });

      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).toBeUndefined();
    });

    it('should handle case-insensitive extension matching', () => {
      const file = new File(['content'], 'file.TXT', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'file3.pdf', { type: 'application/pdf' }),
      ];
      const results = validateFiles(files);

      expect(results).toHaveLength(3);
      expect(results[0]?.result.isValid).toBe(true);
      expect(results[1]?.result.isValid).toBe(true);
      expect(results[2]?.result.isValid).toBe(true);
    });

    it('should return validation results for each file', () => {
      const files = [
        new File(['content'], 'valid.txt', { type: 'text/plain' }),
        new File(['content'], 'invalid.exe', { type: 'application/x-msdownload' }),
      ];
      const results = validateFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0]?.result.isValid).toBe(true);
      expect(results[1]?.result.isValid).toBe(false);
    });

    it('should preserve file reference in results', () => {
      const files = [
        new File(['content'], 'test.txt', { type: 'text/plain' }),
      ];
      const results = validateFiles(files);

      expect(results[0]?.file).toBe(files[0]);
    });
  });

  describe('sanitizeFilenameForPath', () => {
    it('should remove path traversal characters', () => {
      expect(sanitizeFilenameForPath('../../../etc/passwd')).toBe('etcpasswd');
      expect(sanitizeFilenameForPath('..\\..\\windows\\system32')).toBe('windowssystem32');
    });

    it('should remove null bytes', () => {
      expect(sanitizeFilenameForPath('test\0file.txt')).toBe('testfile.txt');
    });

    it('should remove control characters', () => {
      const filename = 'test\x00\x01\x02file.txt';
      const sanitized = sanitizeFilenameForPath(filename);
      expect(sanitized).toBe('testfile.txt');
    });

    it('should remove leading dots', () => {
      expect(sanitizeFilenameForPath('.hidden')).toBe('hidden');
      expect(sanitizeFilenameForPath('...test')).toBe('test');
    });

    it('should remove Windows reserved characters', () => {
      expect(sanitizeFilenameForPath('test<file>.txt')).toBe('testfile.txt');
      expect(sanitizeFilenameForPath('test>file>.txt')).toBe('testfile.txt');
      expect(sanitizeFilenameForPath('test:file:.txt')).toBe('testfile.txt');
      expect(sanitizeFilenameForPath('test"file".txt')).toBe('testfile.txt');
      expect(sanitizeFilenameForPath('test|file|.txt')).toBe('testfile.txt');
      expect(sanitizeFilenameForPath('test?file?.txt')).toBe('testfile.txt');
      expect(sanitizeFilenameForPath('test*file*.txt')).toBe('testfile.txt');
    });

    it('should handle Windows reserved device names', () => {
      expect(sanitizeFilenameForPath('CON.txt')).toBe('file-CON.txt');
      expect(sanitizeFilenameForPath('PRN')).toBe('file-PRN');
      expect(sanitizeFilenameForPath('AUX.txt')).toBe('file-AUX.txt');
      expect(sanitizeFilenameForPath('NUL')).toBe('file-NUL');
      expect(sanitizeFilenameForPath('COM1.txt')).toBe('file-COM1.txt');
      expect(sanitizeFilenameForPath('LPT9.txt')).toBe('file-LPT9.txt');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilenameForPath('  test.txt  ')).toBe('test.txt');
    });

    it('should return empty string for unsafe filename', () => {
      expect(sanitizeFilenameForPath('')).toBe('');
      expect(sanitizeFilenameForPath('   ')).toBe('');
      expect(sanitizeFilenameForPath('...')).toBe('');
    });

    it('should limit filename length to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilenameForPath(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('should preserve file extension when truncating', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilenameForPath(longName);
      expect(sanitized).toContain('.txt');
    });
  });

  describe('isFilenameSafe', () => {
    it('should return true for safe filenames', () => {
      expect(isFilenameSafe('test.txt')).toBe(true);
      expect(isFilenameSafe('my-file_v1~2.txt')).toBe(true);
      expect(isFilenameSafe('document (1).pdf')).toBe(true);
    });

    it('should return false for path traversal attempts', () => {
      expect(isFilenameSafe('../test.txt')).toBe(false);
      expect(isFilenameSafe('..\\test.txt')).toBe(false);
      expect(isFilenameSafe('test/../file.txt')).toBe(false);
    });

    it('should return false for null bytes', () => {
      expect(isFilenameSafe('test\0file.txt')).toBe(false);
    });

    it('should return false for control characters', () => {
      expect(isFilenameSafe('test\x00file.txt')).toBe(false);
      expect(isFilenameSafe('test\x1ffile.txt')).toBe(false);
    });

    it('should return false for empty filename', () => {
      expect(isFilenameSafe('')).toBe(false);
      expect(isFilenameSafe('   ')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.txt')).toBe('.txt');
      expect(getFileExtension('document.pdf')).toBe('.pdf');
      expect(getFileExtension('image.jpeg')).toBe('.jpeg');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('test')).toBe('');
      expect(getFileExtension('test.')).toBe('.');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.hidden')).toBe('');
      expect(getFileExtension('.gitignore')).toBe(''); // .gitignore has no extension
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('test.file.txt')).toBe('.txt');
      expect(getFileExtension('file.name.with.dots.pdf')).toBe('.pdf');
    });

    it('should return empty string for empty input', () => {
      expect(getFileExtension('')).toBe('');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(512)).toBe('512 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10 * 1024)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return MIME type for known extensions', () => {
      expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(getMimeTypeFromExtension('.pdf')).toBe('application/pdf');
      expect(getMimeTypeFromExtension('.txt')).toBe('text/plain');
      expect(getMimeTypeFromExtension('.json')).toBe('application/json');
    });

    it('should handle extensions without dot', () => {
      expect(getMimeTypeFromExtension('jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('pdf')).toBe('application/pdf');
    });

    it('should return undefined for unknown extensions', () => {
      expect(getMimeTypeFromExtension('.unknown')).toBeUndefined();
      expect(getMimeTypeFromExtension('xyz')).toBeUndefined();
    });

    it('should be case insensitive', () => {
      expect(getMimeTypeFromExtension('.JPG')).toBe('image/jpeg');
      expect(getMimeTypeFromExtension('.PDF')).toBe('application/pdf');
    });
  });

  describe('Constants', () => {
    it('should have all safe MIME types defined', () => {
      expect(SAFE_MIME_TYPES.images).toHaveLength(6);
      expect(SAFE_MIME_TYPES.documents).toBeDefined();
      expect(SAFE_MIME_TYPES.archives).toBeDefined();
      expect(SAFE_MIME_TYPES.media).toBeDefined();
      expect(SAFE_MIME_TYPES.data).toBeDefined();
    });

    it('should have flattened list of all MIME types', () => {
      expect(ALL_SAFE_MIME_TYPES.length).toBeGreaterThan(0);
      expect(ALL_SAFE_MIME_TYPES).toContain('image/jpeg');
      expect(ALL_SAFE_MIME_TYPES).toContain('application/pdf');
      expect(ALL_SAFE_MIME_TYPES).toContain('text/plain');
    });

    it('should have safe file extensions', () => {
      expect(SAFE_FILE_EXTENSIONS.length).toBeGreaterThan(0);
      expect(SAFE_FILE_EXTENSIONS).toContain('.txt');
      expect(SAFE_FILE_EXTENSIONS).toContain('.pdf');
      expect(SAFE_FILE_EXTENSIONS).toContain('.jpg');
    });

    it('should have default max file size defined', () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with no extension', () => {
      const file = new File(['content'], 'noextension', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe('INVALID_EXTENSION');
    });

    it('should handle files with multiple dots', () => {
      const file = new File(['content'], 'file.name.with.dots.txt', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should handle unicode filenames', () => {
      const file = new File(['content'], '文件.txt', { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(250) + '.txt';
      const file = new File(['content'], longName, { type: 'text/plain' });
      const result = validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename?.length).toBeLessThanOrEqual(255);
    });
  });
});
