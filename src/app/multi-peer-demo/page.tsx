'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { generateRoomId } from '@/lib/utils/room-id-generator';
import { ArrowRightIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface RoomStats {
  totalRooms: number;
  rooms: Array<{
    roomId: string;
    activePeers: number;
    hostPeerId: string;
  }>;
}

export default function MultiPeerDemoPage() {
  const router = useRouter();
  const [roomStats, setRoomStats] = React.useState<RoomStats | null>(null);
  const [loading, setLoading] = React.useState(false);

  const createTestRoom = () => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}`);
  };

  const fetchRoomStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/signaling/stats');
      const data = await response.json();
      setRoomStats(data.stats);
    } catch (error) {
      console.error('Error fetching room stats:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRoomStats();
    const interval = setInterval(fetchRoomStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Multi-Peer Connection Demo</h1>
          <p className="text-muted-foreground text-lg">
            Test multiple users connecting to the same room
          </p>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-6 w-6" />
              Multi-Peer Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Multiple Simultaneous Connections</p>
                  <p className="text-sm text-muted-foreground">
                    Host can accept connections from multiple joiners
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Room Persistence</p>
                  <p className="text-sm text-muted-foreground">
                    Room stays active as long as one user remains
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Automatic Cleanup</p>
                  <p className="text-sm text-muted-foreground">
                    Rooms are cleaned up when all users leave
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Heartbeat Mechanism</p>
                  <p className="text-sm text-muted-foreground">
                    Keeps rooms alive while users are active
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Create Test Room" to create a new room</li>
              <li>Copy the room URL from your browser</li>
              <li>Open the same URL in multiple browser windows or tabs</li>
              <li>Verify that all windows connect successfully</li>
              <li>Send messages from different windows</li>
              <li>Close some windows and verify others stay connected</li>
              <li>Close all windows and verify the room is cleaned up</li>
            </ol>
            
            <div className="flex gap-3">
              <Button onClick={createTestRoom} className="flex items-center gap-2">
                Create Test Room
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Rooms Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Rooms</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchRoomStats}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Total Active Rooms</span>
                  <span className="text-2xl font-bold">{roomStats.totalRooms}</span>
                </div>
                
                {roomStats.rooms && roomStats.rooms.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Room Details:</p>
                    {roomStats.rooms.map((room) => (
                      <div 
                        key={room.roomId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-mono text-sm">{room.roomId}</p>
                          <p className="text-xs text-muted-foreground">
                            Host: {room.hostPeerId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <UsersIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold">{room.activePeers}</span>
                          <span className="text-sm text-muted-foreground">peers</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active rooms. Create one to get started!
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading stats...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">Room Expiry</p>
                <p className="text-muted-foreground">30 minutes of inactivity</p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">Heartbeat Interval</p>
                <p className="text-muted-foreground">Every 60 seconds</p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">Polling Interval</p>
                <p className="text-muted-foreground">Every 1.5 seconds</p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">Grace Period</p>
                <p className="text-muted-foreground">1 minute after last peer leaves</p>
              </div>
            </div>
            
            <div className="pt-3 border-t">
              <p className="text-muted-foreground">
                For more details, see{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                  docs/MULTI_PEER_SUPPORT.md
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
