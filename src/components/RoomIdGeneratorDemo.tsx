'use client';

import { useState } from 'react';
import {
  generateRoomId,
  validateRoomId,
  type RoomIdGeneratorOptions
} from '@/lib/utils';

export function RoomIdGeneratorDemo() {
  const [roomId, setRoomId] = useState<string>('');
  const [roomType, setRoomType] = useState<RoomIdGeneratorOptions['type']>('slug');
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string } | null>(null);

  const handleGenerate = () => {
    const newId = generateRoomId({ type: roomType });
    setRoomId(newId);
    setValidation(validateRoomId(newId));
  };

  return (
    <div className="p-6 bg-card border border-border rounded-lg shadow space-y-4">
      <h2 className="text-2xl font-bold">Room ID Generator Demo</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Room ID Type</label>
        <select
          value={roomType}
          onChange={(e) => setRoomType(e.target.value as RoomIdGeneratorOptions['type'])}
          className="w-full p-2 border rounded"
        >
          <option value="uuid">UUID</option>
          <option value="short-uuid">Short UUID</option>
          <option value="slug">Slug</option>
          <option value="nanoid">NanoID</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Generate Room ID
      </button>

      {roomId && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Generated Room ID</label>
          <input
            type="text"
            value={roomId}
            readOnly
            className="w-full p-2 border rounded bg-gray-50"
          />
          {validation && (
            <p className={validation.isValid ? 'text-green-600' : 'text-red-600'}>
              {validation.isValid ? '✓ Valid' : `✗ ${validation.error}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
