'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRoomStore, usePeerStore, useMessageStore, useClipboardStore } from '@/store';
import { notFound } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  WifiIcon,
  SignalIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  validateRoomIdFormat,
  getValidationErrorMessage,
} from '@/lib/utils/room-join-validation';
import { ShareCurrentPageButton } from '@/components/ShareableUrlButton';
import { CopyButton } from '@/components/CopyButton';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import PeerList from '@/components/PeerList';
import MessageList from '@/components/MessageList';
import { ClipboardSyncControl } from '@/components/ClipboardSyncControl';
import FileDropzone from '@/components/FileDropzone';
import { FileTransferProgressList } from '@/components/FileTransferProgress';
import TextareaInput from '@/components/TextareaInput';
import { BackgroundSystem } from '@/components/layout/BackgroundSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMeshConnection } from '@/hooks/useMeshConnection';
import { useFileTransferProgress } from '@/hooks/useFileTransferProgress';
import { useFileReassembly } from '@/hooks/useFileReassembly';
import { PeerSelectionDialog } from '@/components/PeerSelectionDialog';
import QRCode from 'react-qr-code';
import { getCurrentPageUrl } from '@/lib/utils/url-encoder';
import { v4 as uuidv4 } from 'uuid';
import type { FileMetadata, FileTransferRequest, FileTransferResponse, FileChunkMetadata, FileTransferMethod } from '@/lib/webrtc';
import { formatFileSize } from '@/lib/utils';
import { downloadFile } from '@/lib/utils/file-download';
import { WEBTORRENT_THRESHOLD_BYTES, WEBTORRENT_TRACKERS } from '@/lib/utils/transfer-config';
import { getWebTorrentClient, destroyWebTorrentClient } from '@/lib/webtorrent/client';
import type { WebTorrentTorrent } from '@/lib/webtorrent/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FeatureSelectionDialog, FeatureType } from '@/components/FeatureSelectionDialog';
import { FeatureToggleControl } from '@/components/FeatureToggleControl';

// Helper to get/set role from sessionStorage
function getStoredRole(roomSlug: string): 'host' | 'joiner' | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(`room-role-${roomSlug}`);
  if (stored === 'host' || stored === 'joiner') return stored;
  return null;
}

function setStoredRole(roomSlug: string, role: 'host' | 'joiner') {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`room-role-${roomSlug}`, role);
}

function clearStoredRole(roomSlug: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`room-role-${roomSlug}`);
}

function clearStoredPeerIds(roomSlug: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`room-peer-${roomSlug}-host`);
  sessionStorage.removeItem(`room-peer-${roomSlug}-joiner`);
}

const TRANSFER_CHUNK_SIZE = 128 * 1024; // 64KB
const TRANSFER_REQUEST_TIMEOUT_MS = 30000;

type PendingIncomingRequest = {
  transferId: string;
  metadata: FileMetadata;
  senderPeerId: string;
  receivedAt: number;
  transferMethod: FileTransferMethod;
};

type OutgoingTransfer = {
  file: File;
  peerId: string;
  metadata: FileMetadata;
  transferMethod: FileTransferMethod;
};

type FileTransferChunkMessage = {
  transferId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  lastModified?: number;
  data: string; // base64 payload
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomSlug = params.roomSlug as string;
  const { createRoom, leaveRoom, error: roomError } = useRoomStore();
  const { peers, localPeerId, clearPeers } = usePeerStore();
  const { clearMessages } = useMessageStore();
  const { clearClipboardItems } = useClipboardStore();

  const [isValidRoom, setIsValidRoom] = React.useState(true);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [shareUrl, setShareUrl] = React.useState('');
  const [isQrOpen, setIsQrOpen] = React.useState(false);
  const [qrUrls, setQrUrls] = React.useState<
    Array<{ label: string; url: string }>
  >([]);
  const [localIps, setLocalIps] = React.useState<string[]>([]);
  const [selectedLocalIp, setSelectedLocalIp] = React.useState<string>('');
  const [urlParts, setUrlParts] = React.useState<{
    currentUrl: string;
    protocol: string;
    portPart: string;
    path: string;
    localhostUrl: string;
    isLocalHost: boolean;
  } | null>(null);

  const [showTransferPeerDialog, setShowTransferPeerDialog] = React.useState(false);
  const [selectedTransferPeerId, setSelectedTransferPeerId] = React.useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [pendingIncomingRequests, setPendingIncomingRequests] = React.useState<PendingIncomingRequest[]>([]);

  // Feature Selection State
  const [activeFeatures, setActiveFeatures] = React.useState<Set<FeatureType>>(new Set());
  const [primaryFeature, setPrimaryFeature] = React.useState<FeatureType | null>(null);

  // Refs for accessing state in callbacks/effects without dependencies
  const activeFeaturesRef = React.useRef<Set<FeatureType>>(new Set());
  const primaryFeatureRef = React.useRef<FeatureType | null>(null);
  const isHostRef = React.useRef<boolean>(false);

  const handleFeatureSelect = (feature: FeatureType) => {
    setPrimaryFeature(feature);
    setActiveFeatures(prev => {
      const next = new Set(prev);
      next.add(feature);
      return next;
    });
  };

  const handleFeatureToggle = (feature: FeatureType) => {
    // Only host can toggle features
    if (!isHostRef.current) return;

    const isActive = activeFeaturesRef.current.has(feature);

    if (isActive) {
      toast(`Disabled ${feature}`);
    } else {
      toast.success(`Enabled ${feature}`);
    }

    setActiveFeatures(prev => {
      const next = new Set(prev);
      if (next.has(feature)) {
        next.delete(feature);
      } else {
        next.add(feature);
      }
      return next;
    });
  };

  // Derived theme class
  const themeClass = primaryFeature ? `theme-${primaryFeature}` : '';

  const outgoingTransfersRef = React.useRef<Map<string, OutgoingTransfer>>(new Map());
  const incomingTransfersRef = React.useRef<Map<string, { metadata: FileMetadata; senderPeerId: string }>>(new Map());
  const webTorrentTransfersRef = React.useRef<Map<string, { torrent: WebTorrentTorrent; peerId: string; direction: 'upload' | 'download' }>>(new Map());
  const sendToPeerRef = React.useRef<(peerId: string, data: string | object | ArrayBuffer) => boolean>(() => false);
  const localPeerIdRef = React.useRef<string>('');

  const {
    transfers,
    addTransfer,
    updateTransferProgress,
    setTransferStatus,
    cancelTransfer,
    clearAll: clearTransfers,
  } = useFileTransferProgress({
    updateInterval: 500,
  });

  const { initializeFile, addChunk, reassemble, cancel: cancelReassembly } = useFileReassembly({
    autoDownload: true,
    onProgress: (fileId, progress) => {
      updateTransferProgress(fileId, progress.percentage, progress.receivedBytes);
      if (progress.receivedChunks === progress.totalChunks) {
        void (async () => {
          const result = await reassemble(fileId);
          setTransferStatus(fileId, result.success ? 'completed' : 'failed', result.error);
        })();
      }
    },
  });

  React.useEffect(() => {
    const activeTransfers = webTorrentTransfersRef.current;

    return () => {
      for (const { torrent } of activeTransfers.values()) {
        try {
          torrent.destroy({ destroyStore: true });
        } catch {
          // Ignore cleanup errors
        }
      }
      activeTransfers.clear();
      void destroyWebTorrentClient();
    };
  }, []);

  const arrayBufferToBase64 = React.useCallback((buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }, []);

  const base64ToArrayBuffer = React.useCallback((base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }, []);

  const createFileMetadata = React.useCallback((file: File, transferId: string): FileMetadata => {
    const chunkCount = Math.ceil(file.size / TRANSFER_CHUNK_SIZE);
    return {
      id: transferId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      chunkCount,
      chunkSize: TRANSFER_CHUNK_SIZE,
    };
  }, []);

  const sendTransferRequest = React.useCallback((file: File, peerId: string): string | null => {
    const transferId = uuidv4();
    const metadata = createFileMetadata(file, transferId);
    const transferMethod: FileTransferMethod = file.size > WEBTORRENT_THRESHOLD_BYTES ? 'webtorrent' : 'webrtc';
    const request: FileTransferRequest = {
      transferId,
      metadata,
      senderId: localPeerIdRef.current,
      timestamp: Date.now(),
      expiresAt: Date.now() + TRANSFER_REQUEST_TIMEOUT_MS,
      transferMethod,
    };

    const sent = sendToPeerRef.current(peerId, {
      type: 'file-transfer-request',
      data: request,
    });

    if (!sent) {
      toast.error('Failed to send transfer request');
      return null;
    }

    outgoingTransfersRef.current.set(transferId, { file, peerId, metadata, transferMethod });

    addTransfer({
      transferId,
      fileName: metadata.name,
      fileSize: metadata.size,
      direction: 'upload',
      method: transferMethod,
      status: 'pending',
      progress: 0,
      peerId,
    });

    return transferId;
  }, [addTransfer, createFileMetadata]);

  const startOutgoingWebRtcTransfer = React.useCallback(async (transferId: string) => {
    const outgoing = outgoingTransfersRef.current.get(transferId);
    if (!outgoing) return;

    const { file, peerId, metadata } = outgoing;
    const totalChunks = metadata.chunkCount ?? Math.ceil(file.size / TRANSFER_CHUNK_SIZE);

    sendToPeerRef.current(peerId, {
      type: 'file-transfer-start',
      data: {
        transferId,
        senderId: localPeerIdRef.current,
        timestamp: Date.now(),
      },
    });

    setTransferStatus(transferId, 'in-progress');

    let bytesSent = 0;
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * TRANSFER_CHUNK_SIZE;
      const end = Math.min(start + TRANSFER_CHUNK_SIZE, file.size);
      const buffer = await file.slice(start, end).arrayBuffer();
      const payload: FileTransferChunkMessage = {
        transferId,
        chunkIndex,
        totalChunks,
        chunkSize: TRANSFER_CHUNK_SIZE,
        fileName: metadata.name,
        fileSize: metadata.size,
        fileType: metadata.type,
        lastModified: metadata.lastModified,
        data: arrayBufferToBase64(buffer),
      };

      const sent = sendToPeerRef.current(peerId, {
        type: 'file-transfer-chunk',
        data: payload,
      });

      if (!sent) {
        setTransferStatus(transferId, 'failed', 'Failed to send file chunk');
        return;
      }

      bytesSent += buffer.byteLength;
      updateTransferProgress(transferId, (bytesSent / file.size) * 100, bytesSent);
    }

    sendToPeerRef.current(peerId, {
      type: 'file-transfer-complete',
      data: {
        transferId,
        senderId: localPeerIdRef.current,
        timestamp: Date.now(),
      },
    });

    setTransferStatus(transferId, 'completed');
  }, [arrayBufferToBase64, setTransferStatus, updateTransferProgress]);

  const stopWebTorrentTransfer = React.useCallback((transferId: string) => {
    const active = webTorrentTransfersRef.current.get(transferId);
    if (!active) return;

    try {
      active.torrent.destroy({ destroyStore: true });
    } catch {
      // Ignore cleanup errors
    }

    webTorrentTransfersRef.current.delete(transferId);
  }, []);

  const startOutgoingWebTorrentTransfer = React.useCallback(async (transferId: string) => {
    const outgoing = outgoingTransfersRef.current.get(transferId);
    if (!outgoing) return;

    const { file, peerId, metadata } = outgoing;

    try {
      const client = await getWebTorrentClient();

      setTransferStatus(transferId, 'in-progress');

      const torrent = client.seed(file, { announce: WEBTORRENT_TRACKERS }, (seeded) => {
        sendToPeerRef.current(peerId, {
          type: 'file-transfer-webtorrent',
          data: {
            transferId,
            magnetURI: seeded.magnetURI,
            metadata,
          },
        });
      });

      webTorrentTransfersRef.current.set(transferId, {
        torrent,
        peerId,
        direction: 'upload',
      });

      torrent.on('upload', () => {
        const uploaded = torrent.uploaded ?? 0;
        const progress = Math.min(100, (uploaded / Math.max(1, metadata.size)) * 100);
        updateTransferProgress(transferId, progress, uploaded);
      });

      torrent.on('error', (error) => {
        const message = error instanceof Error ? error.message : 'WebTorrent upload failed';
        setTransferStatus(transferId, 'failed', message);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WebTorrent upload failed';
      setTransferStatus(transferId, 'failed', message);
    }
  }, [setTransferStatus, updateTransferProgress]);

  const startIncomingWebTorrentTransfer = React.useCallback(async (
    transferId: string,
    magnetURI: string,
    metadata: FileMetadata,
    senderPeerId: string
  ) => {
    try {
      const client = await getWebTorrentClient();

      setTransferStatus(transferId, 'in-progress');

      const torrent = client.add(magnetURI, { announce: WEBTORRENT_TRACKERS }, () => {
        // Metadata ready
      });

      webTorrentTransfersRef.current.set(transferId, {
        torrent,
        peerId: senderPeerId,
        direction: 'download',
      });

      const syncProgress = () => {
        const progress = Math.max(0, Math.min(100, torrent.progress * 100));
        updateTransferProgress(transferId, progress, torrent.downloaded);
      };

      torrent.on('download', () => {
        syncProgress();
      });

      torrent.on('done', () => {
        syncProgress();
        void (async () => {
          const targetFile = torrent.files.find(file => file.name === metadata.name) ?? torrent.files[0];
          if (!targetFile) {
            setTransferStatus(transferId, 'failed', 'No files found in torrent');
            stopWebTorrentTransfer(transferId);
            return;
          }

          const blob = await targetFile.blob();
          const receivedFile = new File([blob], targetFile.name, {
            type: metadata.type || 'application/octet-stream',
            lastModified: metadata.lastModified || Date.now(),
          });

          const downloadResult = downloadFile(receivedFile, { autoDownload: true });
          if (!downloadResult.success) {
            setTransferStatus(transferId, 'failed', downloadResult.error || 'Failed to download file');
            stopWebTorrentTransfer(transferId);
            return;
          }

          setTransferStatus(transferId, 'completed');

          sendToPeerRef.current(senderPeerId, {
            type: 'file-transfer-webtorrent-complete',
            data: { transferId },
          });

          stopWebTorrentTransfer(transferId);
        })();
      });

      torrent.on('error', (error) => {
        const message = error instanceof Error ? error.message : 'WebTorrent download failed';
        setTransferStatus(transferId, 'failed', message);
        stopWebTorrentTransfer(transferId);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WebTorrent download failed';
      setTransferStatus(transferId, 'failed', message);
      stopWebTorrentTransfer(transferId);
    }
  }, [setTransferStatus, stopWebTorrentTransfer, updateTransferProgress]);

  const handleIncomingChunk = React.useCallback(async (payload: FileTransferChunkMessage, senderPeerId: string) => {
    try {
      const metadata: FileChunkMetadata = {
        fileId: payload.transferId,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        fileType: payload.fileType,
        totalChunks: payload.totalChunks,
        chunkSize: payload.chunkSize,
        lastModified: payload.lastModified,
      };

      if (!incomingTransfersRef.current.has(payload.transferId)) {
        incomingTransfersRef.current.set(payload.transferId, {
          metadata: {
            id: payload.transferId,
            name: payload.fileName,
            size: payload.fileSize,
            type: payload.fileType,
            lastModified: payload.lastModified,
            chunkCount: payload.totalChunks,
            chunkSize: payload.chunkSize,
          },
          senderPeerId,
        });

        addTransfer({
          transferId: payload.transferId,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          direction: 'download',
          method: 'webrtc',
          status: 'in-progress',
          progress: 0,
          peerId: senderPeerId,
        });
      }

      initializeFile(metadata);
      await addChunk({
        metadata,
        chunkIndex: payload.chunkIndex,
        data: base64ToArrayBuffer(payload.data),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process chunk';
      setTransferStatus(payload.transferId, 'failed', message);
    }
  }, [addChunk, addTransfer, base64ToArrayBuffer, initializeFile, setTransferStatus]);

  const handleDataMessage = React.useCallback((message: Record<string, unknown>, senderPeerId: string) => {
    const type = message.type;
    if (typeof type !== 'string') return false;

    if (type === 'file-transfer-request') {
      const request = message.data as FileTransferRequest;
      if (!request?.transferId) return true;

      const transferMethod: FileTransferMethod = request.transferMethod ?? 'webrtc';

      setPendingIncomingRequests(prev => {
        if (prev.some(p => p.transferId === request.transferId)) return prev;
        return [...prev, {
          transferId: request.transferId,
          metadata: request.metadata,
          senderPeerId,
          receivedAt: Date.now(),
          transferMethod,
        }];
      });

      addTransfer({
        transferId: request.transferId,
        fileName: request.metadata.name,
        fileSize: request.metadata.size,
        direction: 'download',
        method: transferMethod,
        status: 'pending',
        progress: 0,
        peerId: senderPeerId,
      });

      toast(`Incoming file: ${request.metadata.name}`);
      return true;
    }

    if (type === 'file-transfer-response') {
      const response = message.data as FileTransferResponse;
      if (!response?.transferId) return true;

      const outgoing = outgoingTransfersRef.current.get(response.transferId);
      if (!outgoing) return true;

      if (response.accepted) {
        if (outgoing.transferMethod === 'webtorrent') {
          void startOutgoingWebTorrentTransfer(response.transferId);
        } else {
          void startOutgoingWebRtcTransfer(response.transferId);
        }
      } else {
        setTransferStatus(response.transferId, 'failed', response.reason || 'Transfer rejected');
      }

      return true;
    }

    if (type === 'file-transfer-start') {
      const startData = message.data as { transferId?: string };
      if (startData?.transferId) {
        setTransferStatus(startData.transferId, 'in-progress');
      }
      return true;
    }

    if (type === 'file-transfer-webtorrent') {
      const data = message.data as { transferId?: string; magnetURI?: string; metadata?: FileMetadata };
      if (!data?.transferId || !data?.magnetURI) return true;

      const existing = incomingTransfersRef.current.get(data.transferId);
      const metadata = data.metadata ?? existing?.metadata;

      if (!metadata) {
        setTransferStatus(data.transferId, 'failed', 'Missing WebTorrent metadata');
        return true;
      }

      incomingTransfersRef.current.set(data.transferId, {
        metadata,
        senderPeerId,
      });

      void startIncomingWebTorrentTransfer(data.transferId, data.magnetURI, metadata, senderPeerId);
      return true;
    }

    if (type === 'file-transfer-webtorrent-complete') {
      const data = message.data as { transferId?: string };
      if (data?.transferId) {
        setTransferStatus(data.transferId, 'completed');
        stopWebTorrentTransfer(data.transferId);
      }
      return true;
    }

    if (type === 'file-transfer-chunk') {
      const payload = message.data as FileTransferChunkMessage;
      void handleIncomingChunk(payload, senderPeerId);
      return true;
    }

    if (type === 'file-transfer-cancel') {
      const cancelData = message.data as { transferId?: string; reason?: string };
      if (cancelData?.transferId) {
        setTransferStatus(cancelData.transferId, 'cancelled', cancelData.reason || 'Transfer cancelled');
        cancelReassembly(cancelData.transferId);
        stopWebTorrentTransfer(cancelData.transferId);
      }
      return true;
    }

    if (type === 'feature-sync') {
      // Host should not process incoming feature syncs as it is the source of truth
      if (isHostRef.current) return true;

      const syncData = message.data as { primaryFeature: FeatureType; activeFeatures: FeatureType[] };
      if (syncData) {
        const prevPrimary = primaryFeatureRef.current;
        const prevActive = activeFeaturesRef.current;
        const newActive = new Set(syncData.activeFeatures);

        setPrimaryFeature(syncData.primaryFeature);
        setActiveFeatures(newActive);

        // Determine what changed for the toast
        if (prevPrimary !== syncData.primaryFeature) {
             toast.success(`Host changed primary mode to: ${syncData.primaryFeature}`);
        } else {
            // Find added/removed features
            const added = syncData.activeFeatures.find(f => !prevActive.has(f));
            const removed = Array.from(prevActive).find(f => !newActive.has(f));

            if (added) {
                toast.success(`${added.charAt(0).toUpperCase() + added.slice(1)} enabled by host`);
            } else if (removed) {
                toast.success(`${removed.charAt(0).toUpperCase() + removed.slice(1)} disabled by host`);
            } else {
                 toast('Room features updated');
            }
        }
      }
      return true;
    }

    return false;
  }, [
    addTransfer,
    cancelReassembly,
    handleIncomingChunk,
    setTransferStatus,
    startIncomingWebTorrentTransfer,
    startOutgoingWebRtcTransfer,
    startOutgoingWebTorrentTransfer,
    stopWebTorrentTransfer,
  ]);

  // Check if this is a join link (has 'join' query param)
  const isJoinLink = searchParams?.get('join') === 'true';

  // Combined state for atomic updates - prevents race condition where hook starts before role is set
  const [initState, setInitState] = React.useState<{
    isHost: boolean;
    initialized: boolean;
    joining: boolean;
  }>(() => {
    // Try to restore from sessionStorage on initial render
    const storedRole =
      typeof window !== 'undefined' ? getStoredRole(roomSlug) : null;
    if (storedRole) {
      console.log(
        `[RoomPage] Initial state from storage: ${storedRole.toUpperCase()}`
      );
      return {
        isHost: storedRole === 'host',
        initialized: true,
        joining: false,
      };
    }
    // If this is a join link, we know we're not the host
    if (isJoinLink) {
      console.log('[RoomPage] Initial state: JOINER (from join link)');
      return { isHost: false, initialized: false, joining: true };
    }
    return { isHost: false, initialized: false, joining: true };
  });

  const isHost = initState.isHost;
  const roomInitialized = initState.initialized;
  const isJoining = initState.joining;

  // Keep refs in sync
  React.useEffect(() => {
    activeFeaturesRef.current = activeFeatures;
    primaryFeatureRef.current = primaryFeature;
    isHostRef.current = isHost;
  }, [activeFeatures, primaryFeature, isHost]);

  // Ref to track if we've already checked role
  const roleCheckedRef = React.useRef(initState.initialized);

  // Update ref to ensure we don't double-check
  React.useEffect(() => {
    if (initState.initialized) {
      roleCheckedRef.current = true;
    }
  }, [initState.initialized]);

  // Initialize room - check signaling server to determine role
  React.useEffect(() => {
    if (!roomSlug) return;

    // Only check role once - use a more robust check
    if (roleCheckedRef.current) {
      console.log('[RoomPage] Role already checked, skipping');
      return;
    }

    // Clear previous room data when entering a new room
    clearMessages();
    clearClipboardItems();
    clearTransfers();
    // Ensure peer store is also clean
    clearPeers();

    console.log('[RoomPage] Starting role check for:', roomSlug);
    roleCheckedRef.current = true;

    // Validate room slug format
    const validation = validateRoomIdFormat(roomSlug);
    if (!validation.isValid) {
      const errorMessage = getValidationErrorMessage(validation.error);
      setJoinError(errorMessage);
      setIsValidRoom(false);
      setInitState((prev) => ({ ...prev, joining: false }));
      toast.error(errorMessage);
      return;
    }

    setJoinError(null);

    // Check for stored role first (persists across HMR/refreshes)
    const storedRole = getStoredRole(roomSlug);
    if (storedRole) {
      console.log(
        `[RoomPage] Restored role from storage: ${storedRole.toUpperCase()}`
      );
      const hostStatus = storedRole === 'host';
      createRoom(roomSlug);
      setInitState({ isHost: hostStatus, initialized: true, joining: false });
      return;
    }

    // Determine role based on join link or server check
    const checkRoomStatus = async () => {
      try {
        // If this is a join link, we're definitely a joiner
        if (isJoinLink) {
          console.log('[RoomPage] Join link detected - becoming JOINER');
          setStoredRole(roomSlug, 'joiner');
          createRoom(roomSlug);
          setInitState({ isHost: false, initialized: true, joining: false });
          return;
        }

        // Otherwise, check if room exists on server
        console.log(`[RoomPage] Checking room status for: ${roomSlug}`);
        const response = await fetch(
          `/api/signaling/room?roomId=${encodeURIComponent(roomSlug)}`
        );
        const data = await response.json();

        console.log(`[RoomPage] Room check response:`, data);

        // If room doesn't exist, we're the host
        const weAreHost = !data.exists;

        // Store role for persistence
        setStoredRole(roomSlug, weAreHost ? 'host' : 'joiner');

        console.log(
          `[RoomPage] Determined role: ${weAreHost ? 'HOST' : 'JOINER'} (exists: ${data.exists})`
        );

        createRoom(roomSlug);
        setInitState({ isHost: weAreHost, initialized: true, joining: false });
      } catch (error) {
        console.error('[RoomPage] Error checking room status:', error);
        // Default to joiner on error to avoid conflicts
        setStoredRole(roomSlug, 'joiner');
        createRoom(roomSlug);
        setInitState({ isHost: false, initialized: true, joining: false });
      }
    };

    checkRoomStatus();
  }, [roomSlug, createRoom, isJoinLink, clearClipboardItems, clearMessages, clearPeers, clearTransfers]);

  // Use the mesh connection hook for WebRTC with peer selection
  // Only enable after room is initialized AND we know our role
  const {
    connectionState,
    peerId: localPeerIdFromHook,
    error: connectionError,
    connectedPeers,
    availablePeers,
    showPeerSelection,
    setShowPeerSelection,
    connectToPeers,
    reconnect: hookReconnect,
    sendMessage,
    sendToPeer,
    broadcast,
    refreshPeerList,
  } = useMeshConnection({
    roomId: roomSlug,
    isHost: isHost,
    enabled: roomInitialized,
    debug: true,
    onDataMessage: handleDataMessage,
  });

  // Sync features to peers (Host only)
  React.useEffect(() => {
    if (!isHost || !primaryFeature) return;

    // Broadcast current feature state
    const syncData = {
      type: 'feature-sync',
      data: {
        primaryFeature,
        activeFeatures: Array.from(activeFeatures)
      }
    };
    
    broadcast(syncData);
  }, [isHost, primaryFeature, activeFeatures, connectedPeers.length, broadcast]);

  React.useEffect(() => {
    sendToPeerRef.current = sendToPeer;
  }, [sendToPeer]);

  React.useEffect(() => {
    localPeerIdRef.current = localPeerIdFromHook || localPeerId || '';
  }, [localPeerIdFromHook, localPeerId]);

  React.useEffect(() => {
    if (selectedTransferPeerId && !connectedPeers.includes(selectedTransferPeerId)) {
      setSelectedTransferPeerId(null);
    }
  }, [connectedPeers, selectedTransferPeerId]);

  React.useEffect(() => {
    if (pendingFiles.length === 0 || !selectedTransferPeerId) return;
    const files = [...pendingFiles];
    setPendingFiles([]);
    files.forEach((file) => sendTransferRequest(file, selectedTransferPeerId));
  }, [pendingFiles, selectedTransferPeerId, sendTransferRequest]);

  const getPeerLabel = React.useCallback((peerId: string) => {
    return peers.get(peerId)?.metadata?.nickname || `Peer ${peerId.slice(-6)}`;
  }, [peers]);

  // Custom reconnect that preserves role
  const reconnect = React.useCallback(() => {
    console.log(`[RoomPage] Reconnecting as ${isHost ? 'HOST' : 'JOINER'}`);
    hookReconnect();
  }, [hookReconnect, isHost]);

  // Handle peer selection
  const handlePeerSelection = React.useCallback(
    (selectedPeerIds: string[]) => {
      console.log('[RoomPage] Connecting to selected peers:', selectedPeerIds);
      connectToPeers(selectedPeerIds);
      toast.success(`Connecting to ${selectedPeerIds.length} peer(s)...`);
    },
    [connectToPeers]
  );

  // Show error message from store if any
  React.useEffect(() => {
    if (roomError) {
      setJoinError(roomError);
    }
  }, [roomError]);

  // Show connection status toast
  React.useEffect(() => {
    if (connectionState === 'connected') {
      toast.success('Connected to peer!');
    } else if (connectionState === 'failed' && connectionError) {
      toast.error(`Connection failed: ${connectionError}`);
    }
  }, [connectionState, connectionError]);

  React.useEffect(() => {
    const currentUrl = getCurrentPageUrl();
    setShareUrl(currentUrl);

    if (typeof window === 'undefined') return;

    const { protocol, hostname, port, pathname, search, hash } =
      window.location;
    const portPart = port ? `:${port}` : '';
    const path = `${pathname}${search}${hash}`;
    const localhostUrl = `${protocol}//localhost${portPart}${path}`;
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1';

    setUrlParts({
      currentUrl,
      protocol,
      portPart,
      path,
      localhostUrl,
      isLocalHost,
    });

    if (!isLocalHost) {
      setQrUrls([{ label: 'Current', url: currentUrl }]);
      setLocalIps([]);
      setSelectedLocalIp('');
      return;
    }

    setQrUrls([{ label: 'Localhost', url: localhostUrl }]);
    setLocalIps([]);
    setSelectedLocalIp('');

    const controller = new AbortController();

    fetch('/api/network/local-ip', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch local IP');
        }
        return response.json() as Promise<{ ips?: string[] }>;
      })
      .then((data) => {
        const ips = (data?.ips ?? []).filter(Boolean);
        if (ips.length === 0) return;
        setLocalIps(ips);
        const previousIp = selectedLocalIp;
        const nextIp = previousIp && ips.includes(previousIp) ? previousIp : (ips[0] ?? '');
        setSelectedLocalIp(nextIp);
      })
      .catch(() => {
        // Silently fallback to localhost-only QR
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug]);

  React.useEffect(() => {
    if (!urlParts) return;
    if (!urlParts.isLocalHost) return;

    if (!selectedLocalIp) {
      setQrUrls([{ label: 'Localhost', url: urlParts.localhostUrl }]);
      return;
    }

    const ipUrl = `${urlParts.protocol}//${selectedLocalIp}${urlParts.portPart}${urlParts.path}`;
    setQrUrls([
      { label: 'Local IP', url: ipUrl },
      { label: 'Localhost', url: urlParts.localhostUrl },
    ]);
  }, [selectedLocalIp, urlParts]);

  const handleLeaveRoom = async () => {
    if (isLeaving) return;

    setIsLeaving(true);

    try {
      clearPeers();
      clearMessages();
      clearClipboardItems();
      clearTransfers();
      leaveRoom();
      // Clear the role from sessionStorage so next visit starts fresh
      clearStoredRole(roomSlug);
      clearStoredPeerIds(roomSlug);
      toast.success('Left room successfully');
      router.push('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
      setIsLeaving(false);
    }
  };

  const handleFilesDrop = (files: File[]) => {
    if (files.length === 0) return;

    if (!selectedTransferPeerId) {
      setPendingFiles(files);
      setShowTransferPeerDialog(true);
      toast('Select a peer to send files');
      return;
    }

    files.forEach((file) => sendTransferRequest(file, selectedTransferPeerId));
    toast.success(`${files.length} file(s) queued for transfer`);
  };

  const handleAcceptIncomingRequest = (transferId: string) => {
    const pending = pendingIncomingRequests.find(request => request.transferId === transferId);
    if (!pending) return;

    sendToPeerRef.current(pending.senderPeerId, {
      type: 'file-transfer-response',
      data: {
        transferId,
        accepted: true,
        receiverId: localPeerIdRef.current,
        timestamp: Date.now(),
      },
    });

    incomingTransfersRef.current.set(transferId, {
      metadata: pending.metadata,
      senderPeerId: pending.senderPeerId,
    });

    setPendingIncomingRequests(prev => prev.filter(req => req.transferId !== transferId));
    setTransferStatus(transferId, 'pending');
  };

  const handleRejectIncomingRequest = (transferId: string, reason?: string) => {
    const pending = pendingIncomingRequests.find(request => request.transferId === transferId);
    if (!pending) return;

    sendToPeerRef.current(pending.senderPeerId, {
      type: 'file-transfer-response',
      data: {
        transferId,
        accepted: false,
        receiverId: localPeerIdRef.current,
        reason: reason || 'Transfer rejected',
        timestamp: Date.now(),
      },
    });

    setPendingIncomingRequests(prev => prev.filter(req => req.transferId !== transferId));
    setTransferStatus(transferId, 'cancelled', reason || 'Transfer rejected');
  };

  const handleCancelTransfer = (transferId: string) => {
    cancelTransfer(transferId);

    const outgoing = outgoingTransfersRef.current.get(transferId);
    if (outgoing) {
      sendToPeerRef.current(outgoing.peerId, {
        type: 'file-transfer-cancel',
        data: {
          transferId,
          reason: 'Cancelled by sender',
        },
      });
    }

    cancelReassembly(transferId);
    stopWebTorrentTransfer(transferId);
  };

  const handleMessageSend = (message: string) => {
    if (!message.trim()) {
      return;
    }

    const success = sendMessage(message);
    if (success) {
      toast.success('Message sent to peers');
    } else {
      toast.error('Failed to send message');
    }
  };

  // Show 404 for invalid room IDs
  if (!isValidRoom) {
    notFound();
  }

  // Show error state if validation failed
  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg">
            <h2 className="text-lg font-bold mb-2">Failed to Join Room</h2>
            <p className="text-sm">{joinError}</p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-block"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show loading state while joining
  if (isJoining || !roomInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Connecting to room...</p>
        </div>
      </div>
    );
  }

  // Render the Feature Selection Dialog if no primary feature selected (and room is ready)
  if (!primaryFeature) {
    if (isHost) {
      return (
        <FeatureSelectionDialog
          open={true}
          onSelectFeature={handleFeatureSelect}
        />
      );
    }

    // Peers waiting for host to select feature
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4">
        <BackgroundSystem />
        <Card className="glass-card max-w-md w-full border-white/10 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary to-transparent animate-pulse" />
          <div className="flex flex-col items-center text-center space-y-6">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative bg-background/50 p-4 rounded-full border border-white/10 shadow-inner">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
             </div>
             
             <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Waiting for Host</h2>
                <div className="h-1 w-12 bg-primary/30 rounded-full mx-auto" />
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    The host is configuring the room capabilities. Sit tight, we'll be ready in a moment.
                </p>
             </div>

             {isJoining && (
                <div className="bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                    <p className="text-xs font-medium text-primary animate-pulse">Establishing Connection...</p>
                </div>
             )}
          </div>
        </Card>
      </div>
    );
  }

  // Render the main room interface
  return (
    <div className={themeClass}>
      <BackgroundSystem />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[80px_350px_1fr] xl:grid-cols-[80px_400px_1fr] gap-6 h-full min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8 max-w-480 mx-auto">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col items-center gap-4 py-6 glass-card rounded-2xl h-fit sticky top-24 z-20">
          <Link
            href="/"
            className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
            title="Home"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div className="w-8 h-px bg-border/50" />
          <button
            onClick={handleLeaveRoom}
            disabled={isLeaving}
            className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
            title="Leave Room"
          >
            {isLeaving ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
            ) : (
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            )}
          </button>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex items-center justify-between p-4 glass-card rounded-xl mb-4 sticky top-4 z-50">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" /> Back
          </Link>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" /> Leave
          </button>
        </div>

        {/* Left Column - Info & Status */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Room Header Info */}
          <Card className="glass-card border-white/10 shadow-lg overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent opacity-50" />
            <CardHeader className="pb-3 bg-white/5 border-b border-white/5">
              <CardTitle className="text-lg font-bold flex items-center justify-between tracking-tight">
                <span>Room Status</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${isHost ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/50 text-muted-foreground border-transparent'}`}
                >
                  {isHost ? '👑 Host' : 'Participant'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="flex items-center justify-between p-3.5 bg-background/40 rounded-xl border border-white/5 shadow-inner">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Room ID
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-medium text-foreground/90">{roomSlug}</code>
                  <CopyButton
                    textToCopy={roomSlug}
                    size="sm"
                    variant="ghost"
                    iconOnly={true}
                    label="Copy ID"
                    className="hover:bg-primary/10 hover:text-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Connection
                </p>
                <div
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 ${
                    connectionState === 'connected'
                      ? 'bg-green-500/10 border-green-500/20 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]'
                      : connectionState === 'failed'
                        ? 'bg-destructive/10 border-destructive/20'
                        : 'bg-muted/30 border-white/5'
                  }`}
                >
                  <ConnectionStatusIndicator
                    state={connectionState}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        connectionState === 'connected'
                          ? 'text-green-600 dark:text-green-400'
                          : connectionState === 'failed'
                            ? 'text-destructive'
                            : 'text-foreground/80'
                      }`}
                    >
                      {connectionState === 'connected'
                        ? 'Securely Connected'
                        : connectionState === 'connecting'
                          ? 'Establishing connection...'
                          : 'Disconnected'}
                    </p>
                  </div>
                  {connectionState === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reconnect}
                      className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <SignalIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                  Share Room
                </p>
                <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-4 flex items-center justify-between gap-3 p-2 bg-background/40 rounded-lg border border-white/5">
                        <div className="min-w-0 px-2">
                            <code className="text-[10px] text-muted-foreground block truncate">
                            {shareUrl ? new URL(shareUrl).host + '/...' + roomSlug.slice(0,4) : '...'}
                            </code>
                        </div>
                        <ShareCurrentPageButton
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                        />
                    </div>
                     <button
                        type="button"
                        onClick={() => setIsQrOpen(true)}
                        className="col-span-1 flex items-center justify-center rounded-lg bg-background/40 border border-white/5 hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95 text-primary"
                        aria-label="Show QR"
                    >
                        <span className="text-xl">📱</span>
                    </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peer List */}
          <Card className="flex-1 glass-card border-white/10 shadow-lg flex flex-col overflow-hidden">
            <CardHeader className="pb-3 bg-white/5 border-b border-white/5">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Peers</span>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    {connectedPeers.length}
                  </span>
                </div>
                {availablePeers.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      refreshPeerList();
                      setShowPeerSelection(true);
                    }}
                    className="gap-2 h-8 text-xs hover:bg-primary/10 hover:text-primary"
                  >
                    <UserGroupIcon className="h-3.5 w-3.5" />
                    Connect ({availablePeers.length})
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-0 py-0 min-h-62.5 relative">
              {connectedPeers.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6">
                  <div className="p-4 bg-muted/30 rounded-full mb-3 backdrop-blur-sm">
                    <WifiIcon className="h-8 w-8 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Waiting for peers...</p>
                  
                   {availablePeers.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPeerSelection(true)}
                      className="mt-4 gap-2 text-xs border-primary/20 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    >
                      Connect to {availablePeers.length} Peer{availablePeers.length !== 1 ? 's' : ''}
                    </Button>
                  ) : (
                     <p className="text-xs text-muted-foreground/60 mt-2 max-w-45 text-center">
                        Share the room link to invite others.
                     </p>
                  )}
                </div>
              ) : (
                <div className="p-4">
                     <PeerList
                        peers={peers}
                        localPeerId={localPeerId}
                        showHeader={false}
                        gridClassName="grid-cols-1 gap-3"
                    />
                </div>
               
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Features */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Feature Toggles (Host Only) */}
          {isHost && (
            <div className="flex justify-end animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="glass-panel p-1 rounded-xl shadow-lg">
                    <FeatureToggleControl
                        activeFeatures={activeFeatures}
                        onToggleFeature={handleFeatureToggle}
                        primaryFeature={primaryFeature}
                    />
                </div>
            </div>
          )}

          {/* Messages / Chat */}
          {activeFeatures.has('chat') && (
            <Card className="flex-1 min-h-100 glass-card border-white/10 shadow-lg flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <CardHeader className="bg-white/5 border-b border-white/5 py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span className="text-xl">💬</span> Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 p-4">
                <div className="flex-1 min-h-50 border border-white/10 rounded-xl bg-background/30 backdrop-blur-sm overflow-hidden shadow-inner">
                  <MessageList className="h-full" localPeerId={localPeerId} />
                </div>
                <TextareaInput
                  placeholder="Type a message..."
                  onSubmit={handleMessageSend}
                  submitLabel="Send"
                  disabled={connectionState !== 'connected'}
                  showActions={true}
                  showCounter={false}
                  maxLength={2000}
                  className="min-h-20 bg-background/50 focus:bg-background/80 transition-all border-white/10"
                  showHeader={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Clipboard Sync */}
          {activeFeatures.has('clipboard') && (
            <Card className="glass-card border-primary/20 shadow-xl ring-1 ring-primary/5 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <span className="text-2xl bg-primary/10 p-2 rounded-lg">📋</span> Clipboard Sync
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ClipboardSyncControl />
              </CardContent>
            </Card>
          )}

          {/* File Transfer */}
          {activeFeatures.has('files') && (
              <Card className="md:col-span-2 glass-card border-white/10 shadow-lg animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="bg-white/5 border-b border-white/5 py-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                     <span className="text-xl">📂</span> File Transfer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Recipient Selection */}
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-background/30 p-4 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-foreground/90">Recipient</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedTransferPeerId
                          ? getPeerLabel(selectedTransferPeerId)
                          : connectedPeers.length === 0
                            ? 'No connected peers'
                            : 'No peer selected'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTransferPeerDialog(true)}
                      disabled={connectedPeers.length === 0}
                      className="glass-panel hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
                    >
                      {selectedTransferPeerId ? 'Change' : 'Select Peer'}
                    </Button>
                  </div>

                  {pendingIncomingRequests.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                        Incoming requests
                      </p>
                      <div className="space-y-2">
                        {pendingIncomingRequests.map((request) => (
                          <div
                            key={request.transferId}
                            className="flex flex-col gap-3 rounded-lg border bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{request.metadata.name}</p>
                              <p className="text-xs text-muted-foreground">
                                From {getPeerLabel(request.senderPeerId)} • {formatFileSize(request.metadata.size)} • {request.transferMethod === 'webtorrent' ? 'WebTorrent' : 'WebRTC'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => handleAcceptIncomingRequest(request.transferId)} className="h-8">
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectIncomingRequest(request.transferId)}
                                className="h-8 text-destructive hover:bg-destructive/10"
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-background/20 rounded-xl p-1">
                      <FileDropzone
                        onDrop={handleFilesDrop}
                        maxFiles={5}
                        disabled={connectionState !== 'connected' || connectedPeers.length === 0}
                      />
                  </div>

                  {transfers.length > 0 && (
                    <FileTransferProgressList
                      transfers={transfers}
                      onCancel={handleCancelTransfer}
                    />
                  )}
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Peer Selection Dialog */}
      <PeerSelectionDialog
        open={showPeerSelection}
        onOpenChange={setShowPeerSelection}
        peers={availablePeers}
        onSelectPeers={handlePeerSelection}
        roomId={roomSlug}
        currentPeerId={localPeerIdFromHook || localPeerId || ''}
      />

      <Dialog open={showTransferPeerDialog} onOpenChange={setShowTransferPeerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select a recipient</DialogTitle>
            <DialogDescription>
              Choose a connected peer to receive your files.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {connectedPeers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No connected peers available.
              </div>
            ) : (
              connectedPeers.map((peerId) => {
                const isSelected = selectedTransferPeerId === peerId;
                return (
                  <button
                    key={peerId}
                    type="button"
                    onClick={() => {
                      setSelectedTransferPeerId(peerId);
                      setShowTransferPeerDialog(false);
                    }}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {getPeerLabel(peerId)}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-primary">Selected</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{peerId}</p>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Room QR Code</DialogTitle>
            <DialogDescription>
              Scan to open this room on another device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {localIps.length > 1 && (
              <div className="w-full">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="local-ip-select"
                >
                  Select local IP
                </label>
                <select
                  id="local-ip-select"
                  value={selectedLocalIp}
                  onChange={(event) => setSelectedLocalIp(event.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {localIps.map((ip) => (
                    <option key={ip} value={ip}>
                      {ip}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {qrUrls.length > 0 ? (
              <div
                className={`grid gap-6 ${qrUrls.length > 1 ? 'sm:grid-cols-2' : ''}`}
              >
                {qrUrls.map((qr) => (
                  <div
                    key={qr.label}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                      <QRCode
                        value={qr.url}
                        size={qrUrls.length > 1 ? 180 : 240}
                      />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {qr.label}
                    </p>
                    <code className="text-[11px] text-muted-foreground break-all text-center max-w-65">
                      {qr.url}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="h-60 w-60 rounded-md bg-muted animate-pulse" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
