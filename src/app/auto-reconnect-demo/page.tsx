'use client';

import { useState, useEffect, useRef } from 'react';
import { PeerConnectionManager } from '@/lib/webrtc/PeerConnectionManager';
import { usePeerReconnection } from '@/hooks/usePeerReconnection';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';

export default function AutoReconnectDemo() {
  const [peerManager] = useState(() => new PeerConnectionManager({
    maxRetries: 3,
    retryDelay: 2000,
    connectionTimeout: 10000,
    enableExponentialBackoff: true,
    heartbeatInterval: 30000,
    debug: true,
  }));

  const [peers, setPeers] = useState<Map<string, any>>(new Map());
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  usePeerReconnection(peerManager);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [connectionLog]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Set up peer event listeners
  useEffect(() => {
    const handleConnect = (data: any, peerId: string) => {
      addLog(`✅ Peer ${peerId} connected`);
      setPeers(prev => new Map(prev).set(peerId, {
        id: peerId,
        state: 'connected',
      }));
    };

    const handleClose = (data: any, peerId: string) => {
      addLog(`❌ Peer ${peerId} disconnected`);
      setPeers(prev => {
        const newMap = new Map(prev);
        const peer = newMap.get(peerId);
        if (peer) {
          newMap.set(peerId, { ...peer, state: 'disconnected' });
        }
        return newMap;
      });
    };

    const handleError = (error: any, peerId: string) => {
      addLog(`⚠️ Peer ${peerId} error: ${error.message}`);
    };

    const handleReconnecting = (data: any, peerId: string) => {
      addLog(`🔄 Reconnecting to peer ${peerId}...`);
      setPeers(prev => {
        const newMap = new Map(prev);
        const peer = newMap.get(peerId);
        if (peer) {
          newMap.set(peerId, { ...peer, state: 'reconnecting' });
        }
        return newMap;
      });
    };

    const handleReconnectSuccess = (data: any, peerId: string) => {
      addLog(`✅ Successfully reconnected to peer ${peerId} after ${data.attempts} attempts`);
      setPeers(prev => {
        const newMap = new Map(prev);
        const peer = newMap.get(peerId);
        if (peer) {
          newMap.set(peerId, { ...peer, state: 'connected' });
        }
        return newMap;
      });
    };

    const handleReconnectFailed = (data: any, peerId: string) => {
      addLog(`❌ Failed to reconnect to peer ${peerId} after ${data.attempts} attempts: ${data.reason}`);
      setPeers(prev => {
        const newMap = new Map(prev);
        const peer = newMap.get(peerId);
        if (peer) {
          newMap.set(peerId, { ...peer, state: 'failed' });
        }
        return newMap;
      });
    };

    peerManager.on('connect', handleConnect);
    peerManager.on('close', handleClose);
    peerManager.on('error', handleError);
    peerManager.on('reconnecting', handleReconnecting);
    peerManager.on('reconnectSuccess', handleReconnectSuccess);
    peerManager.on('reconnectFailed', handleReconnectFailed);

    return () => {
      peerManager.off('connect', handleConnect);
      peerManager.off('close', handleClose);
      peerManager.off('error', handleError);
      peerManager.off('reconnecting', handleReconnecting);
      peerManager.off('reconnectSuccess', handleReconnectSuccess);
      peerManager.off('reconnectFailed', handleReconnectFailed);
    };
  }, [peerManager]);

  const handleCreatePeer = () => {
    const peerId = `peer-${Date.now()}`;
    try {
      peerManager.createPeer(peerId, 'initiator');
      addLog(`🔗 Created peer ${peerId} as initiator`);
      setSelectedPeer(peerId);
    } catch (error) {
      addLog(`❌ Failed to create peer: ${error}`);
    }
  };

  const handleSimulateDisconnect = () => {
    if (!selectedPeer) {
      addLog('⚠️ No peer selected');
      return;
    }

    const peer = peerManager.getPeer(selectedPeer);
    if (peer) {
      // Simulate disconnection by destroying the peer
      peer.destroy();
      addLog(`💥 Simulated disconnection for peer ${selectedPeer}`);

      // The auto-reconnect mechanism will attempt to reconnect
      setTimeout(() => {
        addLog(`🔄 Auto-reconnect mechanism triggered for ${selectedPeer}`);
      }, 500);
    }
  };

  const handleRemovePeer = () => {
    if (!selectedPeer) {
      addLog('⚠️ No peer selected');
      return;
    }

    peerManager.removePeer(selectedPeer);
    addLog(`🗑️ Removed peer ${selectedPeer}`);
    setPeers(prev => {
      const newMap = new Map(prev);
      newMap.delete(selectedPeer);
      return newMap;
    });
    setSelectedPeer(null);
  };

  const handleClearLog = () => {
    setConnectionLog([]);
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Auto-Reconnect Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Demonstrates automatic peer reconnection with user notifications
          </p>
        </div>

        {/* Controls */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Peer Controls
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCreatePeer}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
            >
              Create New Peer
            </button>
            <button
              onClick={handleSimulateDisconnect}
              disabled={!selectedPeer}
              className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simulate Disconnect
            </button>
            <button
              onClick={handleRemovePeer}
              disabled={!selectedPeer}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Peer
            </button>
            <button
              onClick={handleClearLog}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-semibold"
            >
              Clear Log
            </button>
          </div>
        </section>

        {/* Peer List */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Active Peers ({peers.size})
          </h2>
          <div className="space-y-3">
            {peers.size === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No peers created yet. Click "Create New Peer" to start.
              </p>
            ) : (
              Array.from(peers.values()).map((peer) => (
                <div
                  key={peer.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedPeer === peer.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onClick={() => setSelectedPeer(peer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {peer.id}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Status:
                        </span>
                        <ConnectionStatusIndicator
                          state={peer.state as any}
                          size="sm"
                          showLabel={true}
                          onReconnect={() => {
                            const peerId = peer.id;
                            const success = peerManager.reconnect(peerId);
                            if (success) {
                              addLog(`🔄 Manual reconnection triggered for ${peerId}`);
                            } else {
                              addLog(`❌ Cannot reconnect ${peerId}: peer not found or not in reconnectable state`);
                            }
                          }}
                          peerId={peer.id}
                        />
                      </div>
                    </div>
                    {selectedPeer === peer.id && (
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        Selected
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Connection Log */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Connection Log
          </h2>
          <div
            ref={logRef}
            className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 h-96 overflow-y-auto font-mono text-sm space-y-1"
          >
            {connectionLog.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No connection events yet. Create a peer and simulate a disconnect to see the auto-reconnect feature in action.
              </p>
            ) : (
              connectionLog.map((log, index) => (
                <div
                  key={index}
                  className="text-gray-900 dark:text-gray-100"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-lg p-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-2xl font-bold mb-4 text-blue-900 dark:text-blue-100">
            How to Test Auto-Reconnect
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-900 dark:text-blue-100">
            <li>Click <strong>"Create New Peer"</strong> to create a simulated peer connection</li>
            <li>Click <strong>"Simulate Disconnect"</strong> to simulate an unexpected disconnection</li>
            <li>Watch the <strong>Connection Log</strong> to see the auto-reconnect mechanism in action</li>
            <li>Observe <strong>toast notifications</strong> appearing for reconnection attempts</li>
            <li>The system will attempt to reconnect up to 3 times with exponential backoff</li>
            <li>If all retries fail, you'll see a failure notification with a retry option</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
