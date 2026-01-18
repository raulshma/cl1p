/**
 * Minimal WebTorrent types for browser usage
 */

export interface WebTorrentFile {
  name: string;
  length: number;
  blob: (opts?: { start?: number; end?: number }) => Promise<Blob>;
}

export interface WebTorrentTorrent {
  infoHash: string;
  magnetURI: string;
  name: string;
  length: number;
  progress: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  files: WebTorrentFile[];
  on: (
    event: 'download' | 'upload' | 'done' | 'error',
    handler: (...args: unknown[]) => void
  ) => void;
  destroy: (opts?: { destroyStore?: boolean }, cb?: (err?: Error) => void) => void;
}

export interface WebTorrentClient {
  seed: (
    input: File | File[],
    opts: { announce?: string[] },
    cb: (torrent: WebTorrentTorrent) => void
  ) => WebTorrentTorrent;
  add: (
    torrentId: string,
    opts: { announce?: string[] },
    cb: (torrent: WebTorrentTorrent) => void
  ) => WebTorrentTorrent;
  remove: (
    torrentId: string,
    opts?: { destroyStore?: boolean },
    cb?: (err?: Error) => void
  ) => void;
  on: (event: 'error', handler: (err: Error) => void) => void;
  destroy: (cb?: (err?: Error) => void) => void;
}
