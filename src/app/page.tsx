'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store';
import { RoomCreationForm } from '@/components/RoomCreationForm';
import { LocalNetworkDevices } from '@/components/LocalNetworkDevices';
import { BackgroundSystem } from '@/components/layout/BackgroundSystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';

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


  React.useEffect(() => {
    if (currentRoom?.id) {
      router.push(`/room/${encodeURIComponent(currentRoom.id)}`);
    }
  }, [currentRoom, router]);

  if (currentRoom) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        side="left"
        variant="sidebar"
        collapsible="icon"
        className="border-r border-sidebar-border bg-sidebar"
      >
        <SidebarHeader className="px-3 py-4">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium">Local Network</p>
            </div>
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 pb-4">
          <LocalNetworkDevices />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-transparent transition-all duration-200 ease-linear md:peer-data-[state=expanded]:pl-[var(--sidebar-width)] md:peer-data-[state=collapsed]:pl-[var(--sidebar-width-icon)]">
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center p-6 md:p-12">
          
          <div className="fixed top-4 left-4 z-50 md:hidden">
             <SidebarTrigger className="h-10 w-10 shadow-lg rounded-full bg-background border border-border" />
          </div>
          
          {/* --- High Fidelity Background System --- */}
          <BackgroundSystem />

          <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center gap-12 lg:gap-24">
            
            {/* --- Left Column: Value Proposition --- */}
            <MotionDiv 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 text-center md:text-left space-y-8 pt-10 md:pt-20"
            >
              <div className="space-y-4">
                <MotionH1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.8 }}
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter"
                >
                  <span className="bg-linear-to-b from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">
                    Sync.
                  </span>
                  <br />
                  <span className="text-muted-foreground/40 font-medium">Unbound.</span>
                </MotionH1>
                
                <MotionP 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-lg mx-auto md:mx-0"
                >
                  Peer-to-peer clipboard sharing. <br />
                  <span className="text-foreground font-normal">Zero latency. Zero servers.</span>
                </MotionP>
              </div>

              <MotionDiv 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-4 max-w-sm mx-auto md:mx-0"
              >
                 <div className="p-6 rounded-3xl bg-secondary/30 border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Join</span>
                    </div>
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if(joinRoomId) router.push(`/room/${encodeURIComponent(joinRoomId)}`);
                        }}
                        className="flex gap-2"
                    >
                        <Input 
                            placeholder="Enter Room ID..." 
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            className="bg-background/50 border-transparent focus-visible:bg-background transition-all"
                        />
                        <Button type="submit" size="icon" variant="secondary" disabled={!joinRoomId} className="shrink-0">
                            <ArrowRightIcon className="h-5 w-5" />
                        </Button>
                    </form>
                 </div>
              </MotionDiv>
            </MotionDiv>

            {/* --- Right Column: Action Card --- */}
            <MotionDiv 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-700" />
                <RoomCreationForm />
              </div>
            </MotionDiv>

          </div>
          
          {/* Footer / Status */}
          <MotionDiv 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-6 md:bottom-12 left-0 right-0 text-center pointer-events-none"
          >
            <p className="text-xs font-medium text-muted-foreground/30 uppercase tracking-[0.2em]">
              End-to-End Encrypted Session
            </p>
          </MotionDiv>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
