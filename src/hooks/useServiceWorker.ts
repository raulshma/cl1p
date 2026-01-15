/**
 * React hook for service worker functionality
 * Provides online/offline status and service worker control
 */

import { useState, useEffect } from 'react';

interface ServiceWorkerState {
  isOnline: boolean;
  isServiceWorkerActive: boolean;
  isUpdateAvailable: boolean;
}

interface ServiceWorkerActions {
  refreshPage: () => void;
  clearCache: () => Promise<boolean>;
  checkForUpdates: () => Promise<void>;
}

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[SW Hook] User is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[SW Hook] User is offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const hasServiceWorker = 'serviceWorker' in navigator;

    // Check initial service worker status
    const checkServiceWorker = () => {
      const isActive = hasServiceWorker && navigator.serviceWorker.controller !== null;
      setIsServiceWorkerActive(isActive);

      if (!hasServiceWorker) {
        return;
      }

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Hook] Service worker controller changed');
        setIsServiceWorkerActive(true);
      });

      // Listen for update found
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          setIsUpdateAvailable(true);
        }
      });

      // Check for updates
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            setIsUpdateAvailable(true);
          });
        }
      });
    };

    checkServiceWorker();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshPage = () => {
    window.location.reload();
  };

  const clearCache = async (): Promise<boolean> => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        console.log('[SW Hook] All caches cleared');
        return true;
      } catch (error) {
        console.error('[SW Hook] Failed to clear caches:', error);
        return false;
      }
    }
    return false;
  };

  const checkForUpdates = async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.error('[SW Hook] Failed to check for updates:', error);
      }
    }
  };

  return {
    isOnline,
    isServiceWorkerActive,
    isUpdateAvailable,
    refreshPage,
    clearCache,
    checkForUpdates,
  };
}
