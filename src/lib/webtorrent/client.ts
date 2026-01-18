/**
 * WebTorrent client loader for browser usage
 */

import type { WebTorrentClient } from './types';

let clientPromise: Promise<WebTorrentClient> | null = null;

export const getWebTorrentClient = async (): Promise<WebTorrentClient> => {
  if (typeof window === 'undefined') {
    throw new Error('WebTorrent is only available in the browser');
  }

  if (!clientPromise) {
    clientPromise = import('webtorrent/dist/webtorrent.min.js')
      .then((mod) => {
        const WebTorrent = mod.default as unknown as new () => WebTorrentClient;
        const client = new WebTorrent();
        client.on('error', (err) => {
          console.error('[WebTorrent] Client error:', err);
        });
        return client;
      })
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }

  return clientPromise;
};

export const destroyWebTorrentClient = async (): Promise<void> => {
  if (!clientPromise) return;

  const client = await clientPromise;
  client.destroy();
  clientPromise = null;
};
