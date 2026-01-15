'use client';

import React, { useState, useCallback } from 'react';
import { PeerConnectionExchange } from '@/components/PeerConnectionExchange';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SignalData } from '@/types';
import toast from 'react-hot-toast';

/**
 * Manual Signaling Demo Page
 *
 * Demonstrates the usage of PeerConnectionExchange component
 * for manual WebRTC signaling without a signaling server.
 */
export default function ManualSignalingDemoPage() {
  const [isInitiator, setIsInitiator] = useState<boolean>(true);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [showExchange, setShowExchange] = useState(false);

  // Handle local signal generation (offer or answer)
  const handleLocalSignal = useCallback((signalData: SignalData) => {
    console.log('[Demo] Local signal generated:', signalData);
    // In a real app, this would be handled by PeerConnectionManager
    toast.success(`${signalData.type} generated successfully!`);
  }, []);

  // Handle remote signal reception
  const handleRemoteSignal = useCallback((signalData: SignalData) => {
    console.log('[Demo] Remote signal received:', signalData);
    // In a real app, this would be passed to PeerConnectionManager.connect()

    // Simulate connection process
    setConnectionState('connecting');
    setTimeout(() => {
      setConnectionState('connected');
      toast.success('Connection established!');
    }, 2000);
  }, []);

  // Start the connection process
  const handleStartConnection = useCallback((asInitiator: boolean) => {
    setIsInitiator(asInitiator);
    setShowExchange(true);
    setConnectionState('disconnected');

    toast.success(
      asInitiator
        ? 'Starting as initiator. Generating offer...'
        : 'Starting as receiver. Waiting for offer...'
    );

    // Simulate signal generation
    setTimeout(() => {
      const mockSignal: SignalData = {
        type: asInitiator ? 'offer' : 'answer',
        sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:abcd\r\na=ice-pwd:efgh1234\r\na=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99\r\na=setup:${asInitiator ? 'actpass' : 'active'}\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n`,
      };
      handleLocalSignal(mockSignal);
    }, 1000);
  }, [handleLocalSignal]);

  // Reset the demo
  const handleReset = useCallback(() => {
    setShowExchange(false);
    setConnectionState('disconnected');
    setIsInitiator(true);
    toast.success('Demo reset');
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Manual WebRTC Signaling Demo
        </h1>
        <p className="text-muted-foreground text-lg">
          Test the peer connection exchange UI components without a signaling server
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About This Demo</CardTitle>
          <CardDescription>
            This demo shows how to manually exchange WebRTC peer connection strings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            In scenarios where a signaling server isn't available (e.g., air-gapped networks,
            restricted environments), you can still establish WebRTC connections by manually
            exchanging offer and answer strings.
          </p>
          <p>
            <strong>How it works:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Initiator generates an offer string</li>
            <li>Initiator shares the offer (chat, email, etc.)</li>
            <li>Receiver enters the offer and generates an answer</li>
            <li>Receiver shares the answer back</li>
            <li>Initiator enters the answer to complete the connection</li>
          </ol>
        </CardContent>
      </Card>

      {/* Setup Card */}
      {!showExchange && (
        <Card>
          <CardHeader>
            <CardTitle>Start Connection</CardTitle>
            <CardDescription>
              Choose your role to begin the connection process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Initiator Option */}
              <button
                onClick={() => handleStartConnection(true)}
                className="p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
              >
                <div className="font-semibold text-lg mb-2">🎯 Be the Initiator</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Create an offer to start the connection</p>
                  <p className="text-xs">Best for: Starting a new session</p>
                </div>
              </button>

              {/* Receiver Option */}
              <button
                onClick={() => handleStartConnection(false)}
                className="p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
              >
                <div className="font-semibold text-lg mb-2">📡 Be the Receiver</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Enter an offer from another peer</p>
                  <p className="text-xs">Best for: Joining an existing session</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Exchange Component */}
      {showExchange && (
        <PeerConnectionExchange
          isInitiator={isInitiator}
          onLocalSignal={handleLocalSignal}
          onRemoteSignal={handleRemoteSignal}
          connectionState={connectionState}
          show={showExchange}
        />
      )}

      {/* Connection Status */}
      {showExchange && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">State:</span>
              <span className={`font-medium ${
                connectionState === 'connected' ? 'text-green-600' :
                connectionState === 'failed' ? 'text-destructive' :
                'text-foreground'
              }`}>
                {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              <span className="font-medium">{isInitiator ? 'Initiator' : 'Receiver'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {showExchange && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleReset}
          >
            Reset Demo
          </Button>
        </div>
      )}

      {/* Technical Notes */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Technical Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Note:</strong> This is a UI demonstration. In a production environment,
            the signal data would be generated and processed by the <code>PeerConnectionManager</code> class.
          </p>
          <p>
            The actual WebRTC connection establishment would involve:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Creating a SimplePeer instance with initiator flag</li>
            <li>Listening for the 'signal' event to capture local SDP</li>
            <li>Calling <code>peer.signal(remoteData)</code> with the peer's response</li>
            <li>Waiting for the 'connect' event to confirm connection</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
