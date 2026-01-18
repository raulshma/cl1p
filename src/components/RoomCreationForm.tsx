'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomCreationFormSkeleton } from './skeletons';
import { useRoomStore } from '@/store';
import { generateRoomId, validateRoomId } from '@/lib/utils/room-id-generator';
import toast from 'react-hot-toast';
import { SparklesIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
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
    <Card className="w-full max-w-xl mx-auto overflow-visible ring-1 ring-border/20 shadow-2xl bg-card/50 backdrop-blur-xl">
      <CardHeader className="text-center pb-8 pt-10">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <SparklesIcon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">Create Room</CardTitle>
        <CardDescription className="text-lg mt-2 text-muted-foreground/80">
          Start a new secure session
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-10 px-8">
        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground pl-1">Name</label>
            <div className="flex gap-2 relative">
                <Input
                    placeholder="ex. my-secret-room"
                    value={roomSlug}
                    onChange={handleRoomSlugChange}
                    className={cn("pr-24 font-mono", slugError && "ring-2 ring-destructive/50")}
                />
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={handleGenerateSlug}
                    className="absolute right-1 top-1 bottom-1 px-3 text-xs uppercase font-bold tracking-wider text-primary hover:bg-primary/10"
                >
                    Auto
                </Button>
            </div>
            {slugError && <p className="text-xs text-destructive pl-1 font-medium">{slugError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground pl-1">Pin (Optional)</label>
            <div className="relative">
                <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full mt-4 group" disabled={!roomSlug || !!slugError} variant="premium">
            Launch Room
            <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
