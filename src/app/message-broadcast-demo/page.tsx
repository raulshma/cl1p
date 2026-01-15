'use client';

/**
 * Message Broadcast Demo Page
 *
 * Demonstrates the text message broadcast functionality using WebRTC data channels.
 * Shows message serialization, delivery confirmation, and broadcast to all connected peers.
 */

import { useState, useEffect, useRef } from 'react';
import PeerConnectionManager from '@/lib/webrtc/PeerConnectionManager';
import { MessageBroadcaster, serializeMessage, deserializeMessage, createDeliveryConfirmation } from '@/lib/webrtc/message-broadcaster';
import { MessageReceiver, type ReceivedMessageMetadata } from '@/lib/webrtc/message-receiver';
import type { BroadcastResult } from '@/lib/webrtc/message-broadcaster';
import type { Message } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export default function MessageBroadcastDemo() {
  const [peerManager] = useState(() => new PeerConnectionManager({ debug: true }));
  const [messageBroadcaster] = useState(() => new MessageBroadcaster({ debug: true }));
  const [peers, setPeers] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [broadcastResults, setBroadcastResults] = useState<BroadcastResult[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const logsRef = useRef<HTMLDivElement>(null);

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Setup peer event listeners with MessageReceiver
  useEffect(() => {
    // Create message receiver with event handlers
    const messageReceiver = new MessageReceiver(
      {
        onMessageReceived: (message: Message, metadata: ReceivedMessageMetadata) => {
          addLog(`✅ Message received from ${metadata.peerId}`);
          addLog(`   Content: ${message.content.type === 'text' ? message.content.content : '(non-text)'}`);
          setReceivedMessages((prev) => [...prev, message]);
        },
        onMessageValidated: (message: Message) => {
          addLog(`✅ Message validated: ${message.id}`);
        },
        onMessageInvalid: (error: string, _rawData: unknown) => {
          addLog(`❌ Invalid message: ${error}`);
        },
        onDeliveryConfirmation: (messageId: string, peerId: string) => {
          addLog(`📨 Delivery confirmation for message ${messageId.slice(0, 8)}... from ${peerId}`);
          messageBroadcaster.handleDeliveryConfirmation({
            messageId,
            recipientPeerId: peerId,
            deliveredAt: Date.now(),
            success: true,
          });
        },
      },
      { debug: true }
    );

    peerManager.on('connect', () => {
      setIsConnected(true);
      addLog('Peers connected successfully');
    });

    peerManager.on('data', (data: unknown, peerId?: string) => {
      // Use MessageReceiver to handle incoming data
      const result = messageReceiver.handleIncomingData(data as string | ArrayBuffer | object, peerId || 'unknown');

      if (result.isValid && result.message) {
        // Send delivery confirmation if required
        const broadcastMessage = deserializeMessage(data as string | object);
        if (broadcastMessage?.requiresConfirmation) {
          const confirmation = createDeliveryConfirmation(
            broadcastMessage.id,
            'local-peer',
            true
          );

          // Send confirmation back to sender
          const allPeers = peerManager.getAllPeers();
          for (const [peerId] of allPeers) {
            peerManager.send(peerId, {
              type: 'delivery-confirmation',
              data: confirmation,
            });
          }
        }
      }
    });

    peerManager.on('error', (error: Error) => {
      addLog(`Peer error: ${error.message}`);
    });

    return () => {
      peerManager.removeAllPeers();
      messageReceiver.destroy();
    };
  }, [peerManager, messageBroadcaster]);

  // Create local peers for testing
  const createLocalPeers = () => {
    try {
      addLog('Creating peers for testing...');

      // Create two peers
      peerManager.createPeer('peer-1', 'initiator');
      peerManager.createPeer('peer-2', 'receiver');

      // Connect them locally
      const peer1 = peerManager.getPeer('peer-1');
      const peer2 = peerManager.getPeer('peer-2');

      if (peer1 && peer2) {
        peer1.on('signal', (data) => {
          peer2.signal(data);
        });

        peer2.on('signal', (data) => {
          peer1.signal(data);
        });

        setPeers(['peer-1', 'peer-2']);
        addLog('Peers created and connecting...');
      }
    } catch (error) {
      addLog(`Error creating peers: ${error}`);
    }
  };

  // Broadcast message to all peers
  const broadcastMessage = async () => {
    if (!messageInput.trim()) {
      addLog('Please enter a message to broadcast');
      return;
    }

    if (peers.length === 0) {
      addLog('No peers connected. Create peers first.');
      return;
    }

    try {
      addLog(`Broadcasting message: "${messageInput}"`);

      const allPeers = peerManager.getAllPeers();
      const connectedPeerIds = Array.from(allPeers.keys()).filter(
        (peerId) => peerManager.getConnectionState(peerId) === 'connected'
      );

      if (connectedPeerIds.length === 0) {
        addLog('No connected peers to broadcast to');
        return;
      }

      // Broadcast the message
      const result = await messageBroadcaster.broadcastTextMessage(
        messageInput,
        connectedPeerIds,
        'local-sender',
        // serializeMessage converts the payload object to a JSON string
        // peerManager.send will pass strings through without double-serialization
        (peerId, data) => peerManager.send(peerId, serializeMessage(data))
      );

      addLog(`Broadcast complete:`);
      addLog(`  - Total recipients: ${result.totalRecipients}`);
      addLog(`  - Successful deliveries: ${result.successfulDeliveries}`);
      addLog(`  - Failed deliveries: ${result.failedDeliveries}`);
      addLog(`  - Pending confirmations: ${result.pendingConfirmations}`);

      setBroadcastResults((prev) => [...prev, result]);
      setMessageInput('');
    } catch (error) {
      addLog(`Error broadcasting message: ${error}`);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerManager.destroy();
      messageBroadcaster.destroy();
    };
  }, [peerManager, messageBroadcaster]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Message Broadcast Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Demonstrates text message broadcasting with serialization and delivery confirmation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Peer Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Peer Management
              </h2>

              <div className="space-y-4">
                <button
                  onClick={createLocalPeers}
                  disabled={peers.length > 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Create Local Peers
                </button>

                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Status:</span>
                  <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {peers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Active Peers ({peers.length})
                    </h3>
                    <ul className="space-y-1">
                      {peers.map((peer) => (
                        <li
                          key={peer}
                          className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-3 py-1"
                        >
                          {peer}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Message Broadcasting */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Broadcast Message
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message to Broadcast
                  </label>
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Enter your message here..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={broadcastMessage}
                    disabled={!isConnected}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Broadcast to All Peers
                  </button>
                </div>
              </div>
            </div>

            {/* Broadcast Results */}
            {broadcastResults.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Broadcast Results ({broadcastResults.length})
                </h2>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {broadcastResults.map((result) => (
                    <div
                      key={result.messageId}
                      className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm"
                    >
                      <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {result.messageId.slice(0, 8)}...
                      </div>
                      <div className="space-y-1 text-gray-700 dark:text-gray-300">
                        <div>Recipients: {result.totalRecipients}</div>
                        <div className="text-green-600">
                          Success: {result.successfulDeliveries}
                        </div>
                        <div className="text-red-600">
                          Failed: {result.failedDeliveries}
                        </div>
                        <div className="text-yellow-600">
                          Pending: {result.pendingConfirmations}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Received Messages */}
            {receivedMessages.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Received Messages ({receivedMessages.length})
                </h2>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {receivedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 text-sm"
                    >
                      <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mb-2">
                        From: {msg.peerId} • {formatRelativeTime(msg.timestamp)}
                      </div>
                      <div className="text-gray-900 dark:text-gray-100">
                        {msg.content.type === 'text' ? msg.content.content : '(non-text message)'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Logs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Event Logs
              </h2>
              <button
                onClick={clearLogs}
                className="text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-1 px-3 rounded-md transition-colors"
              >
                Clear Logs
              </button>
            </div>

            <div
              ref={logsRef}
              className="bg-gray-900 dark:bg-gray-950 rounded-md p-4 h-[600px] overflow-y-auto font-mono text-sm"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-green-400">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature Description */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Message Serialization
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Messages are serialized to JSON format for transmission over WebRTC data channels
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                Broadcast to All Peers
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                Automatically send messages to all connected peers in a single operation
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                Delivery Confirmation
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Track which peers successfully received the message with confirmation callbacks
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                Message History
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                Maintain a history of broadcast operations for debugging and analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
