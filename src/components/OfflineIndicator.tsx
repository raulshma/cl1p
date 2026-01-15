/**
 * Offline Indicator Component
 * Displays a visual indicator when the user is offline
 */

'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, isServiceWorkerActive } = useServiceWorker();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Show indicator when offline
    if (!isOnline) {
      setShowIndicator(true);
      return;
    }

    // Hide indicator when online (after a short delay)
    const timer = setTimeout(() => {
      setShowIndicator(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isOnline]);

  // Don't render if online and service worker is not active
  if (isOnline && !showIndicator) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${
        isOnline
          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
      } ${showIndicator ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-900 dark:text-green-100">
            You're back online
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-900 dark:text-red-100">
            You're offline
          </span>
          {!isServiceWorkerActive && (
            <span className="text-xs text-red-700 dark:text-red-300 ml-2">
              (Limited functionality)
            </span>
          )}
        </>
      )}

      {!isOnline && (
        <button
          onClick={() => window.location.reload()}
          className="ml-2 rounded-md bg-red-100 p-1.5 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 transition-colors"
          aria-label="Retry connection"
        >
          <RefreshCw className="h-3 w-3 text-red-700 dark:text-red-300" />
        </button>
      )}
    </div>
  );
}

/**
 * Connection Status Bar Component
 * Shows a small indicator in the header area
 */
export function ConnectionStatusBar() {
  const { isOnline } = useServiceWorker();

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
        isOnline
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}
      title={isOnline ? 'Online' : 'Offline'}
    >
      <div
        className={`h-2 w-2 rounded-full ${
          isOnline
            ? 'bg-green-600 dark:bg-green-400 animate-pulse'
            : 'bg-red-600 dark:bg-red-400'
        }`}
      />
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
