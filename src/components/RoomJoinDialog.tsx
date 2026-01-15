'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoomStore } from '@/store';
import {
  validateJoinRoom,
  getValidationErrorMessage,
  type ValidationResult,
} from '@/lib/utils/room-join-validation';
import toast from 'react-hot-toast';
import { CopyButton } from '@/components/CopyButton';

interface RoomJoinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRoomId?: string;
  initialConnectionString?: string;
}

export function RoomJoinDialog({
  open,
  onOpenChange,
  initialRoomId = '',
  initialConnectionString = '',
}: RoomJoinDialogProps) {
  const { joinRoom } = useRoomStore();
  const [roomId, setRoomId] = useState(initialRoomId);
  const [connectionString, setConnectionString] = useState(initialConnectionString);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setRoomId(initialRoomId);
      setConnectionString(initialConnectionString);
      setPassword('');
      setShowPassword(false);
      setValidationError('');
    }
  }, [open, initialRoomId, initialConnectionString]);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setValidationError('');
    setIsJoining(true);

    try {
      // Validate inputs
      const validation: ValidationResult = validateJoinRoom({
        roomId: roomId.trim() || undefined,
        connectionString: connectionString.trim() || undefined,
        password: password.trim() || undefined,
      });

      if (!validation.isValid) {
        const errorMessage = getValidationErrorMessage(validation.error);
        setValidationError(errorMessage);
        toast.error(errorMessage);
        setIsJoining(false);
        return;
      }

      // Join the room with password if provided
      const finalRoomId = validation.roomId!;
      const finalPassword = password.trim() || undefined;

      joinRoom(finalRoomId, finalPassword);

      toast.success(`Joining room "${finalRoomId}"...`);

      // Close dialog and reset form
      onOpenChange(false);
      setRoomId('');
      setConnectionString('');
      setPassword('');
      setValidationError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
      setValidationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleInputChange = (field: 'roomId' | 'connectionString' | 'password', value: string) => {
    // Clear error when user types
    if (validationError) {
      setValidationError('');
    }

    if (field === 'roomId') {
      setRoomId(value);
      // Clear connection string if user types in room ID
      if (value) {
        setConnectionString('');
      }
    } else if (field === 'connectionString') {
      setConnectionString(value);
      // Clear room ID if user types in connection string
      if (value) {
        setRoomId('');
      }
    } else if (field === 'password') {
      setPassword(value);
    }
  };

  const isFormValid = () => {
    return (roomId.trim().length > 0 || connectionString.trim().length > 0) && !isJoining;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Room</DialogTitle>
          <DialogDescription>
            Enter a room ID or connection string to join. If the room is password-protected, enter the password below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleJoinRoom} className="space-y-4">
          {/* Room ID Input */}
          <div className="space-y-2">
            <label htmlFor="roomId" className="text-sm font-medium">
              Room ID
            </label>
            <Input
              id="roomId"
              type="text"
              placeholder="e.g., clever-panda-42"
              value={roomId}
              onChange={(e) => handleInputChange('roomId', e.target.value)}
              disabled={!!connectionString || isJoining}
              className={validationError ? 'border-destructive' : ''}
              aria-invalid={!!validationError}
            />
            <p className="text-xs text-muted-foreground">
              Or use a connection string below
            </p>
          </div>

          {/* Connection String Input */}
          <div className="space-y-2">
            <label htmlFor="connectionString" className="text-sm font-medium">
              Connection String
            </label>
            <Input
              id="connectionString"
              type="text"
              placeholder="live-clipboard://room-123?pw=..."
              value={connectionString}
              onChange={(e) => handleInputChange('connectionString', e.target.value)}
              disabled={!!roomId || isJoining}
              className={validationError ? 'border-destructive' : ''}
              aria-invalid={!!validationError}
            />
            <p className="text-xs text-muted-foreground">
              Paste a connection string from a friend
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-muted-foreground font-normal">(if required)</span>
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter room password"
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isJoining}
                className={validationError?.includes('password') ? 'border-destructive pr-10' : 'pr-10'}
                aria-invalid={!!validationError?.includes('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md" role="alert">
              <p className="text-sm font-medium">{validationError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
