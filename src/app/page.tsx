'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store';
import { RoomCreationForm } from '@/components/RoomCreationForm';
import { LocalNetworkDevices } from '@/components/LocalNetworkDevices';
import { BackgroundSystem } from '@/components/layout/BackgroundSystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

// Optimized Animation Components
const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionP = motion.p;

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = React.useState('');
  const { currentRoom } = useRoomStore();
  const [activeTab, setActiveTab] = React.useState<'create' | 'join' | 'scan'>('create');

  React.useEffect(() => {
    if (currentRoom?.id) {
      router.push(`/room/${encodeURIComponent(currentRoom.id)}`);
    }
  }, [currentRoom, router]);

  if (currentRoom) return null;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden">
      
      <BackgroundSystem />

      <MotionDiv 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-12"
      >
        {/* Branding / Header */}
        <div className="text-center space-y-6">
          <MotionH1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-6xl md:text-8xl font-black tracking-tighter select-none"
          >
            <span className="bg-linear-to-b from-foreground via-foreground/90 to-foreground/40 bg-clip-text text-transparent">
              SYNC.
            </span>
          </MotionH1>
          <MotionP 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg md:text-xl text-muted-foreground/60 font-medium tracking-[0.2em] uppercase"
          >
            Zero Latency. Zero Servers.
          </MotionP>
        </div>

        {/* Command Center Hub */}
        <div className="w-full relative">
           {/* Glass Container */}
           <div className="absolute inset-0 bg-background/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl transition-all duration-500" 
                style={{ 
                    height: activeTab === 'scan' ? '600px' : 'auto',
                    minHeight: '400px'
                }} 
           />
           
           <div className="relative p-6 md:p-12 flex flex-col gap-8">
              {/* Tab Switcher */}
              <div className="flex justify-center mb-4">
                <div className="bg-secondary/30 p-1 rounded-full flex relative w-full max-w-md">
                    <div 
                        className="absolute inset-y-1 bg-background shadow-sm rounded-full transition-all duration-300 ease-out"
                        style={{
                            left: activeTab === 'create' ? '0.25rem' : activeTab === 'join' ? 'calc(33.33% + 0.125rem)' : 'calc(66.66%)',
                            width: 'calc(33.33% - 0.25rem)',
                        }}
                    />
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`relative w-1/3 py-2 text-sm font-medium transition-colors z-10 ${activeTab === 'create' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                    >
                        Create
                    </button>
                    <button 
                        onClick={() => setActiveTab('join')}
                        className={`relative w-1/3 py-2 text-sm font-medium transition-colors z-10 ${activeTab === 'join' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                    >
                        Join
                    </button>
                    <button 
                        onClick={() => setActiveTab('scan')}
                        className={`relative w-1/3 py-2 text-sm font-medium transition-colors z-10 ${activeTab === 'scan' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}
                    >
                        Scan
                    </button>
                </div>
              </div>

              <div className="relative min-h-[250px]">
                  {activeTab === 'create' && (
                      <MotionDiv
                        key="create"
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4 }}
                      >
                         <RoomCreationForm />
                      </MotionDiv>
                  )}

                  {activeTab === 'join' && (
                      <MotionDiv
                        key="join"
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col gap-6"
                      >
                           <div className="text-center space-y-2 mb-4">
                               <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                                    <ArrowRightIcon className="h-6 w-6 text-green-500" />
                               </div>
                               <h3 className="text-xl font-bold">Join Existing</h3>
                               <p className="text-muted-foreground text-sm">Enter a room ID from another device</p>
                           </div>

                           <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if(joinRoomId) router.push(`/room/${encodeURIComponent(joinRoomId)}`);
                                }}
                                className="flex flex-col gap-4 max-w-sm mx-auto w-full"
                            >
                                <Input 
                                    placeholder="Room ID (e.g. fast-fox)" 
                                    value={joinRoomId}
                                    onChange={(e) => setJoinRoomId(e.target.value)}
                                    className="bg-secondary/20 border-border/50 text-center text-lg h-12 tracking-wide focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/30"
                                />
                                <Button type="submit" size="lg" className="w-full font-bold tracking-wide" disabled={!joinRoomId}>
                                    Connect
                                </Button>
                            </form>
                      </MotionDiv>
                  )}

                  {activeTab === 'scan' && (
                       <MotionDiv
                        key="scan"
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4 }}
                        className="h-full overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-secondary"
                      >
                         <LocalNetworkDevices />
                      </MotionDiv>
                  )}
              </div>

           </div>
        </div>

      </MotionDiv>
    </div>
  );
}
