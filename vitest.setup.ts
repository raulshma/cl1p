/**
 * Vitest Setup File
 * Global test configuration and mocks
 */

import { vi } from 'vitest';

// Ensure File API has arrayBuffer method in jsdom environment
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          resolve(new ArrayBuffer(0));
        }
      };
      reader.onerror = () => resolve(new ArrayBuffer(0));
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock crypto.getRandomValues if needed
if (typeof crypto === 'undefined') {
  (global as any).crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: async (_algorithm: string, data: ArrayBuffer) => {
        const msgUint8 = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          hash[i] = (msgUint8[i % msgUint8.length] || 0) ^ (i * 17);
        }
        return hash.buffer;
      },
    },
  };
}
