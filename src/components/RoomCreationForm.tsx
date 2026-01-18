'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoomCreationFormSkeleton } from './skeletons';
import { useRoomStore } from '@/store';
import { generateRoomId, validateRoomId } from '@/lib/utils/room-id-generator';
import toast from 'react-hot-toast';
import { SparklesIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface RoomCreationFormProps {
  isLoading?: boolean;
}

export function RoomCreationForm({ isLoading: externalLoading }: RoomCreationFormProps) {
  const router = useRouter();
  const { createRoom } = useRoomStore();
  const [roomSlug, setRoomSlug] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [slugError, setSlugError] = useState('');

  const validateSlug = (slug: string): boolean => {
    if (!slug) {
        setSlugError('Required'); 
        return false; 
    }
    const validation = validateRoomId(slug);
    if (!validation.isValid) {
      setSlugError(validation.error || 'Invalid');
      return false;
    }
    setSlugError('');
    return true;
  };

  const handleRoomSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRoomSlug(value);
    if (value) validateSlug(value);
    else setSlugError('');
  };

  const handleGenerateSlug = () => {
    const newSlug = generateRoomId({ type: 'slug' });
    setRoomSlug(newSlug);
    setSlugError('');
    toast.success('Generated!');
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSlug(roomSlug)) return;
    createRoom(roomSlug, password || undefined);
    toast.success('Room created!');
    router.push(`/room/${encodeURIComponent(roomSlug)}`);
  };

  if (externalLoading) return <RoomCreationFormSkeleton />;

  return (
    <div className="w-full mx-auto">
      <div className="text-center mb-8 space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <SparklesIcon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold">New Session</h3>
        <p className="text-muted-foreground text-sm">Secure, ephemeral sharing space</p>
      </div>
      
      <form onSubmit={handleCreateRoom} className="space-y-5 max-w-sm mx-auto">
          <div className="space-y-1">
            <div className="flex gap-2 relative">
                <Input
                    placeholder="room-name"
                    value={roomSlug}
                    onChange={handleRoomSlugChange}
                    className={cn(
                        "pr-24 font-mono text-center text-lg h-12 bg-secondary/20 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50", 
                        slugError && "ring-2 ring-destructive/50"
                    )}
                />
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={handleGenerateSlug}
                    className="absolute right-1 top-1 bottom-1 px-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-primary hover:bg-transparent"
                >
                    Auto
                </Button>
            </div>
            {slugError && <p className="text-xs text-destructive text-center font-medium">{slugError}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative">
                <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Optional PIN"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-center h-12 bg-secondary/20 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full mt-2 font-bold tracking-wide" disabled={!roomSlug || !!slugError}>
            Launch Room
          </Button>
      </form>
    </div>
  );
}
