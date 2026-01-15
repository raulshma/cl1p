/**
 * Service Worker Registration Utility
 * Handles service worker registration and lifecycle events
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers are not supported in this browser');
    return;
  }

  // Service workers require HTTPS or localhost
  const isSecureContext = window.isSecureContext || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

  if (!isSecureContext) {
    console.warn('[SW] Service workers require HTTPS or localhost. Current origin is not secure.');
    return;
  }

  // Wait for the page to finish loading
  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

function registerSW() {
  const swUrl = '/sw.js';

  navigator.serviceWorker
    .register(swUrl, {
      updateViaCache: 'none', // Always fetch the latest service worker
    })
    .then((registration) => {
      console.log('[SW] Service worker registered successfully:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          console.log('[SW] New service worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available, show update notification
              console.log('[SW] New content is available; please refresh');
              showUpdateNotification(newWorker);
            }
          });
        }
      });

      // Listen for controlling changes
      if (navigator.serviceWorker.controller) {
        console.log('[SW] This page is currently controlled by:', navigator.serviceWorker.controller.scriptURL);
      }

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page');
        window.location.reload();
      });

      // Periodically check for updates (every hour)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    })
    .catch((error) => {
      console.error('[SW] Service worker registration failed:', error);
    });
}

function showUpdateNotification(worker: ServiceWorker) {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.id = 'sw-update-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: hsl(var(--card));
    color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="margin-bottom: 12px; font-weight: 500;">
      🔄 Update Available
    </div>
    <div style="margin-bottom: 12px; opacity: 0.8;">
      A new version of the app is available.
    </div>
    <button id="sw-update-btn" style="
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
    ">
      Refresh to Update
    </button>
  `;

  document.body.appendChild(notification);

  const updateBtn = document.getElementById('sw-update-btn');
  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  // Auto-remove after 30 seconds
  setTimeout(() => {
    notification.remove();
  }, 30000);
}

/**
 * Check if the service worker is active and controlling the page
 */
export function isServiceWorkerActive(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller !== null
  );
}

/**
 * Get the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.getRegistration() ?? null;
  } catch (error) {
    console.error('[SW] Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('[SW] Service worker unregistered:', result);
      return result;
    }
    return true;
  } catch (error) {
    console.error('[SW] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log('[SW] All caches cleared');
    return true;
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
    return false;
  }
}

/**
 * Post message to service worker
 */
export function postMessageToSW(message: any): boolean {
  if (!isServiceWorkerActive()) {
    return false;
  }

  try {
    navigator.serviceWorker.controller?.postMessage(message);
    return true;
  } catch (error) {
    console.error('[SW] Failed to post message to service worker:', error);
    return false;
  }
}
