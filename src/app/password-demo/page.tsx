'use client';

import { useState } from 'react';
import { useRoomStore } from '@/store';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';

/**
 * Password Encryption Demo Page
 *
 * This page demonstrates the password encryption feature for room protection.
 * It shows how to:
 * 1. Create password-protected rooms
 * 2. Generate secure connection strings
 * 3. Verify passwords before joining
 */

export default function PasswordEncryptionDemo() {
  const { currentRoom, connectionState, createRoom, joinRoom, leaveRoom, connectionString, verifyRoomPassword, error } = useRoomStore();

  const [roomIdInput, setRoomIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateRoom = () => {
    const roomId = roomIdInput.trim() || `room-${Date.now()}`;
    const password = passwordInput.trim() || undefined;

    createRoom(roomId, password);
  };

  const handleJoinRoom = () => {
    const roomId = roomIdInput.trim();
    if (!roomId) {
      alert('Please enter a room ID');
      return;
    }

    const password = passwordInput.trim() || undefined;
    joinRoom(roomId, password);
  };

  const handleVerifyPassword = () => {
    const isValid = verifyRoomPassword(verifyPassword);
    alert(`Password is ${isValid ? 'VALID' : 'INVALID'}`);
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            🔐 Password Encryption Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Client-side password encryption using crypto-js SHA-256
          </p>
          <div className="mt-4 flex justify-center">
            <ConnectionStatusIndicator state={connectionState} size="lg" />
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-indigo-600 dark:text-indigo-400">
              🔒 Secure Hashing
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Passwords are hashed using SHA-256 before storage or transmission.
              The original password is never stored or sent in plain text.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-green-600 dark:text-green-400">
              🛡️ Connection Strings
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Connection strings include hashed passwords as query parameters,
              allowing secure sharing without exposing the original password.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-purple-600 dark:text-purple-400">
              ✅ Strength Validation
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Passwords must be at least 8 characters with both letters and numbers
              to ensure strong security for protected rooms.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-orange-600 dark:text-orange-400">
              ⚡ Client-Side
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              All encryption happens in the browser using crypto-js.
              No server-side processing required for password hashing.
            </p>
          </div>
        </div>

        {/* Create Room Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span>🏠</span> Create Room
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room ID (optional)
              </label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password (optional - leave empty for open room)
              </label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Min 8 chars, letters + numbers"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {passwordInput && passwordInput.length > 0 && (
                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                  {passwordInput.length >= 8 && /\d/.test(passwordInput) && /[a-zA-Z]/.test(passwordInput)
                    ? '✅ Strong password'
                    : '⚠️ Password must be 8+ chars with letters and numbers'}
                </p>
              )}
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-md"
            >
              Create Room
            </button>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>
        </section>

        {/* Current Room Info */}
        {currentRoom && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <span>📋</span> Current Room
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Room ID:
                  </p>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{currentRoom.id}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Is Host:
                  </p>
                  <p className="text-gray-900 dark:text-white">{currentRoom.isHost ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Password Protected:
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {currentRoom.password ? '🔒 Yes' : '🔓 No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Connection State:
                  </p>
                  <p className="text-gray-900 dark:text-white">{connectionState}</p>
                </div>
              </div>

              {connectionString && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Connection String (share this):
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs rounded overflow-x-auto">
                      {connectionString}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(connectionString)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={leaveRoom}
                className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-md"
              >
                Leave Room
              </button>
            </div>
          </section>
        )}

        {/* Password Verification Demo */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span>🔐</span> Verify Password
          </h2>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Test if a password matches the current room's password. This demonstrates
              the verification functionality without storing the original password.
            </p>
            <div className="flex gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                placeholder="Enter password to verify"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleVerifyPassword}
                disabled={!currentRoom?.password}
                className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
            {!currentRoom?.password && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ℹ️ Create a password-protected room first to test verification
              </p>
            )}
          </div>
        </section>

        {/* Technical Details */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span>⚙️</span> Technical Details
          </h2>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>Algorithm:</strong> SHA-256 (Secure Hash Algorithm 256-bit)
            </div>
            <div>
              <strong>Hash Length:</strong> 64 hexadecimal characters (256 bits)
            </div>
            <div>
              <strong>Password Requirements:</strong> Min 8 characters, at least one letter and one number
            </div>
            <div>
              <strong>Connection String Format:</strong>{' '}
              <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                live-clipboard://room-id?pw=hashedpassword
              </code>
            </div>
            <div>
              <strong>Security Features:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>One-way hashing (password cannot be decrypted)</li>
                <li>Constant-time comparison (prevents timing attacks)</li>
                <li>Client-side only (no server exposure)</li>
                <li>Input validation and sanitization</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
