/**
 * Service Worker Registration Component
 * Registers the service worker when the app loads
 */

'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker/registerSW';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Check if we're in a secure context
    const isSecureContext = typeof window !== 'undefined' && (
      window.isSecureContext || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );

    // Only register service worker in production and secure contexts
    if (process.env.NODE_ENV === 'production' && isSecureContext) {
      // Register the service worker
      registerServiceWorker();

      // Log service worker status
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          console.log('[SW Component] Service worker is ready:', registration);

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[SW Component] Message from service worker:', event.data);
          });
        }).catch((error) => {
          console.error('[SW Component] Service worker ready failed:', error);
        });
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SW Component] Service worker disabled in development');
      } else if (!isSecureContext) {
        console.log('[SW Component] Service worker disabled - requires HTTPS or localhost');
      }
      
      // Unregister any existing service workers in development or insecure contexts
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then(() => {
              console.log('[SW Component] Unregistered service worker');
            });
          }
        });
      }
    }
  }, []);

  return null; // This component doesn't render anything
}
