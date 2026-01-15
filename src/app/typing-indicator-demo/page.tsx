'use client';

/**
 * Typing Indicator Demo Page
 *
 * Demonstrates the typing indicator feature with WebRTC peer-to-peer communication.
 * Shows real-time typing status updates between connected peers.
 */

import React, { useState, useEffect, useRef } from 'react';
import { PeerConnectionManager } from '@/lib/webrtc';
import { TypingIndicator as TypingIndicatorManager } from '@/lib/webrtc';
import TypingIndicatorComponent from '@/components/TypingIndicator';
import { useUIStore } from '@/store';

export default function TypingIndicatorDemoPage() {
  const [manager] = useState(() => new PeerConnectionManager({ debug: true }));
  const [typingManager] = useState(() => new TypingIndicatorManager('local-peer', { debug: true }));
  const [peers, setPeers] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [peerId1, setPeerId1] = useState('peer-1');
  const [peerId2, setPeerId2] = useState('peer-2');
  const [message1, setMessage1] = useState('');
  const [message2, setMessage2] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const logsRef = useRef<HTMLDivElement>(null);
  const timeoutRef1 = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef2 = useRef<NodeJS.Timeout | null>(null);

  const { typingIndicators, setTypingIndicator, clearTypingIndicator } = useUIStore();

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manager.destroy();
      typingManager.destroy();
      if (timeoutRef1.current) clearTimeout(timeoutRef1.current);
      if (timeoutRef2.current) clearTimeout(timeoutRef2.current);
    };
  }, [manager, typingManager]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const setupEventHandlers = () => {
    // Signal handler - exchange signaling data
    let initiatorSignal: any = null;
    let receiverSignal: any = null;

    manager.onPeerEvent(peerId1, 'signal', (data: any) => {
      addLog(`Peer 1 signal generated`);
      initiatorSignal = data;

      // Automatically forward signal to peer 2
      if (receiverSignal) {
        try {
          manager.connect(peerId2, initiatorSignal);
          addLog('Signal forwarded to peer 2');
        } catch (error) {
          addLog(`Error connecting peer 2: ${error}`);
        }
      }
    });

    manager.onPeerEvent(peerId2, 'signal', (data: any) => {
      addLog(`Peer 2 signal generated`);
      receiverSignal = data;

      // Automatically forward signal to peer 1
      if (initiatorSignal) {
        try {
          manager.connect(peerId1, receiverSignal);
          addLog('Signal forwarded to peer 1');
        } catch (error) {
          addLog(`Error connecting peer 1: ${error}`);
        }
      }
    });

    // Connect handler
    manager.onPeerEvent(peerId1, 'connect', () => {
      addLog('Peer 1 connected!');
      setIsConnected(true);
    });

    manager.onPeerEvent(peerId2, 'connect', () => {
      addLog('Peer 2 connected!');
      setIsConnected(true);
    });

    // Data handler - check for typing events
    manager.onPeerEvent(peerId1, 'data', (data: any) => {
      const typingEvent = typingManager.handleIncomingTypingEvent(data);
      if (typingEvent) {
        if (typingEvent.type === 'typing-start') {
          setTypingIndicator(typingEvent.peerId, true);
          addLog(`Peer ${typingEvent.peerId} started typing`);
        } else if (typingEvent.type === 'typing-stop') {
          clearTypingIndicator(typingEvent.peerId);
          addLog(`Peer ${typingEvent.peerId} stopped typing`);
        }
      } else {
        addLog(`Peer 1 received: ${data}`);
      }
    });

    manager.onPeerEvent(peerId2, 'data', (data: any) => {
      const typingEvent = typingManager.handleIncomingTypingEvent(data);
      if (typingEvent) {
        if (typingEvent.type === 'typing-start') {
          setTypingIndicator(typingEvent.peerId, true);
          addLog(`Peer ${typingEvent.peerId} started typing`);
        } else if (typingEvent.type === 'typing-stop') {
          clearTypingIndicator(typingEvent.peerId);
          addLog(`Peer ${typingEvent.peerId} stopped typing`);
        }
      } else {
        addLog(`Peer 2 received: ${data}`);
      }
    });

    // Error handler
    manager.onPeerEvent(peerId1, 'error', (error: any) => {
      addLog(`Peer 1 error: ${error.message}`);
    });

    manager.onPeerEvent(peerId2, 'error', (error: any) => {
      addLog(`Peer 2 error: ${error.message}`);
    });
  };

  const handleCreatePeers = () => {
    try {
      addLog('Creating peers...');

      // Create initiator peer
      manager.createPeer(peerId1, 'initiator');
      addLog(`Created initiator peer: ${peerId1}`);

      // Create receiver peer
      manager.createPeer(peerId2, 'receiver');
      addLog(`Created receiver peer: ${peerId2}`);

      setPeers([peerId1, peerId2]);

      // Set up event handlers
      setupEventHandlers();

      // Configure typing manager
      typingManager.setSendCallback((peerId, data) => manager.send(peerId, data));
      typingManager.updatePeerIds([peerId1, peerId2]);

      addLog('Peers created successfully');
    } catch (error) {
      addLog(`Error creating peers: ${error}`);
    }
  };

  const handleSendMessage = (senderPeerId: string, message: string) => {
    if (!isConnected) {
      addLog('Cannot send: Peers not connected');
      return;
    }

    const recipientPeerId = senderPeerId === peerId1 ? peerId2 : peerId1;

    try {
      const success = manager.send(recipientPeerId, message);
      if (success) {
        addLog(`Sent to ${recipientPeerId}: ${message}`);
      } else {
        addLog('Failed to send message');
      }
    } catch (error) {
      addLog(`Error sending message: ${error}`);
    }
  };

  const handleTypingStart = (senderPeerId: string) => {
    typingManager.setLocalPeerId(senderPeerId);
    typingManager.onTypingStart();
  };

  const handleTypingStop = () => {
    typingManager.onTypingStop();
  };

  const handleInputChange1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage1(e.target.value);
    if (!timeoutRef1.current) {
      handleTypingStart(peerId1);
    }
    if (timeoutRef1.current) clearTimeout(timeoutRef1.current);
    timeoutRef1.current = setTimeout(() => {
      handleTypingStop();
      timeoutRef1.current = null;
    }, 1000);
  };

  const handleInputChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage2(e.target.value);
    if (!timeoutRef2.current) {
      handleTypingStart(peerId2);
    }
    if (timeoutRef2.current) clearTimeout(timeoutRef2.current);
    timeoutRef2.current = setTimeout(() => {
      handleTypingStop();
      timeoutRef2.current = null;
    }, 1000);
  };

  const handleDisconnect = () => {
    try {
      manager.disconnectAll();
      setIsConnected(false);
      addLog('All peers disconnected');
    } catch (error) {
      addLog(`Error disconnecting: ${error}`);
    }
  };

  const handleRemovePeers = () => {
    try {
      manager.removeAllPeers();
      setPeers([]);
      setIsConnected(false);
      clearTypingIndicator(peerId1);
      clearTypingIndicator(peerId2);
      addLog('All peers removed');
    } catch (error) {
      addLog(`Error removing peers: ${error}`);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Typing Indicator Demo
        </h1>
        <p className="text-gray-600 mb-8">
          Demonstrating real-time typing indicators with WebRTC peer-to-peer communication
        </p>

        <div className="space-y-6">
          {/* Typing Indicator Display */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Typing Indicators</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <TypingIndicatorComponent typingIndicators={typingIndicators} />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Start typing in the input fields below to see typing indicators in real-time
            </p>
          </div>

          {/* Peer Creation Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Peer Management</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-24 text-sm font-medium text-gray-700">Peer 1 ID:</label>
                <input
                  type="text"
                  value={peerId1}
                  onChange={(e) => setPeerId1(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={peers.length > 0}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="w-24 text-sm font-medium text-gray-700">Peer 2 ID:</label>
                <input
                  type="text"
                  value={peerId2}
                  onChange={(e) => setPeerId2(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={peers.length > 0}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreatePeers}
                  disabled={peers.length > 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Create Peers
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={!isConnected}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Disconnect
                </button>

                <button
                  onClick={handleRemovePeers}
                  disabled={peers.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Remove Peers
                </button>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  Status: {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {peers.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  Active Peers: {peers.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Chat Simulation Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Peer 1 Chat */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {peerId1} Chat
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={message1}
                  onChange={handleInputChange1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type a message..."
                  disabled={!isConnected}
                />
                <button
                  onClick={() => {
                    handleSendMessage(peerId1, message1);
                    setMessage1('');
                  }}
                  disabled={!isConnected || !message1}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Send to {peerId2}
                </button>
              </div>
            </div>

            {/* Peer 2 Chat */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {peerId2} Chat
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={message2}
                  onChange={handleInputChange2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Type a message..."
                  disabled={!isConnected}
                />
                <button
                  onClick={() => {
                    handleSendMessage(peerId2, message2);
                    setMessage2('');
                  }}
                  disabled={!isConnected || !message2}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Send to {peerId1}
                </button>
              </div>
            </div>
          </div>

          {/* Logs Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Event Logs</h2>
              <button
                onClick={handleClearLogs}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear Logs
              </button>
            </div>

            <div
              ref={logsRef}
              className="h-96 overflow-y-auto bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm"
            >
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Create peers to see events.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
