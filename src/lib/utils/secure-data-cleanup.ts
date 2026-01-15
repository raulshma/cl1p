/**
 * Secure Data Cleanup Utilities
 *
 * Provides utilities for securely clearing sensitive data from memory.
 * Implements zero-out patterns to prevent data recovery.
 */

/**
 * Securely clears a string by overwriting its memory with zeros
 * Note: JavaScript strings are immutable, so this creates a new string
 * and relies on the garbage collector to free the old reference.
 *
 * @param sensitive - The sensitive string to clear
 * @returns An empty string
 */
export function clearString(sensitive: string): string {
  if (!sensitive) return '';

  // Overwrite with zeros (creates new string due to immutability)
  const length = sensitive.length;
  return '\0'.repeat(Math.max(length, 1));
}

/**
 * Securely clears an ArrayBuffer by overwriting its contents with zeros
 *
 * @param buffer - The buffer to clear
 */
export function clearArrayBuffer(buffer: ArrayBuffer): void {
  if (!buffer || buffer.byteLength === 0) return;

  const uint8Array = new Uint8Array(buffer);
  for (let i = 0; i < uint8Array.length; i++) {
    uint8Array[i] = 0;
  }
}

/**
 * Securely clears a Uint8Array by overwriting its contents with zeros
 *
 * @param array - The array to clear
 */
export function clearUint8Array(array: Uint8Array): void {
  if (!array || array.length === 0) return;

  for (let i = 0; i < array.length; i++) {
    array[i] = 0;
  }
}

/**
 * Securely clears all data in a Map by overwriting values before clearing
 *
 * @param map - The map to clear
 * @param valueClearer - Optional function to clear each value before removal
 */
export function clearMap<K, V>(
  map: Map<K, V>,
  valueClearer?: (value: V) => void
): void {
  if (!map || map.size === 0) return;

  // Clear each value if a clearer function is provided
  if (valueClearer) {
    map.forEach((value) => {
      try {
        valueClearer(value);
      } catch (error) {
        // Ignore errors during cleanup
        console.warn('Error clearing map value:', error);
      }
    });
  }

  map.clear();
}

/**
 * Securely clears an array by overwriting elements before clearing
 *
 * @param array - The array to clear
 * @param elementClearer - Optional function to clear each element
 */
export function clearArray<T>(
  array: T[],
  elementClearer?: (element: T) => void
): void {
  if (!array || array.length === 0) return;

  // Clear each element if a clearer function is provided
  if (elementClearer) {
    for (let i = 0; i < array.length; i++) {
      try {
        const element = array[i];
        if (element !== undefined) {
          elementClearer(element);
        }
      } catch (error) {
        // Ignore errors during cleanup
        console.warn('Error clearing array element:', error);
      }
    }
  }

  array.length = 0;
}

/**
 * Securely clears all sensitive data from a room object
 *
 * @param room - The room object to sanitize
 */
export function clearRoomData(room: {
  id?: string;
  password?: string;
  connectionString?: string;
  peers?: Map<any, any>;
}): void {
  if (!room) return;

  // Clear password
  if (room.password) {
    room.password = clearString(room.password);
  }

  // Clear connection string
  if (room.connectionString) {
    room.connectionString = clearString(room.connectionString);
  }

  // Clear peers map
  if (room.peers instanceof Map) {
    clearMap(room.peers);
  }
}

/**
 * Securely clears message content
 *
 * @param message - The message to clear
 */
export function clearMessageData(message: {
  content?: { content?: string; data?: ArrayBuffer };
}): void {
  if (!message) return;

  // Clear text content
  if (message.content?.content && typeof message.content.content === 'string') {
    (message.content as any).content = clearString(message.content.content);
  }

  // Clear binary data
  if (message.content?.data instanceof ArrayBuffer) {
    clearArrayBuffer(message.content.data);
  }
}

/**
 * Securely clears clipboard data
 *
 * @param clipboardData - The clipboard data to clear
 */
export function clearClipboardData(clipboardData: {
  content?: string;
  data?: ArrayBuffer | Uint8Array;
}): void {
  if (!clipboardData) return;

  // Clear text content
  if (clipboardData.content) {
    clipboardData.content = clearString(clipboardData.content);
  }

  // Clear binary data
  if (clipboardData.data instanceof ArrayBuffer) {
    clearArrayBuffer(clipboardData.data);
  } else if (clipboardData.data instanceof Uint8Array) {
    clearUint8Array(clipboardData.data);
  }
}

/**
 * Securely clears file transfer data
 *
 * @param fileData - The file data to clear
 */
export function clearFileData(fileData: {
  data?: ArrayBuffer | Uint8Array;
  chunks?: Map<any, any> | any[];
}): void {
  if (!fileData) return;

  // Clear binary data
  if (fileData.data instanceof ArrayBuffer) {
    clearArrayBuffer(fileData.data);
  } else if (fileData.data instanceof Uint8Array) {
    clearUint8Array(fileData.data);
  }

  // Clear chunks
  if (fileData.chunks instanceof Map) {
    clearMap(fileData.chunks, (value) => {
      if (value?.data instanceof ArrayBuffer) {
        clearArrayBuffer(value.data);
      } else if (value?.data instanceof Uint8Array) {
        clearUint8Array(value.data);
      }
    });
  } else if (Array.isArray(fileData.chunks)) {
    clearArray(fileData.chunks, (chunk) => {
      if (chunk?.data instanceof ArrayBuffer) {
        clearArrayBuffer(chunk.data);
      } else if (chunk?.data instanceof Uint8Array) {
        clearUint8Array(chunk.data);
      }
    });
  }
}

/**
 * Comprehensive cleanup function that clears all sensitive data
 * This should be called when leaving a room or disconnecting from peers
 *
 * @param data - Object containing all sensitive data to clear
 */
export function performSecureCleanup(data: {
  rooms?: any[];
  messages?: any[];
  clipboard?: any;
  files?: any[];
  peers?: Map<any, any>;
}): void {
  if (!data) return;

  // Clear room data
  if (Array.isArray(data.rooms)) {
    data.rooms.forEach((room) => clearRoomData(room));
  }

  // Clear message data
  if (Array.isArray(data.messages)) {
    data.messages.forEach((message) => clearMessageData(message));
  }

  // Clear clipboard data
  if (data.clipboard) {
    clearClipboardData(data.clipboard);
  }

  // Clear file data
  if (Array.isArray(data.files)) {
    data.files.forEach((file) => clearFileData(file));
  }

  // Clear peers map
  if (data.peers instanceof Map) {
    clearMap(data.peers);
  }
}
