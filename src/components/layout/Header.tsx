'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';
import Image from 'next/image';

export function Header() {
  const { openKeyboardShortcuts } = useUIStore();

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <div className="glass-panel rounded-full px-2 pr-4 sm:px-3 sm:pr-6 py-2 flex items-center justify-between gap-4 pointer-events-auto transition-transform hover:scale-[1.02] duration-300 w-full max-w-2xl shadow-2xl shadow-black/5 ring-1 ring-white/20 dark:ring-white/10">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20 relative">
            <Image src="/icon-192.png" alt="Live Clipboard" fill className="object-cover" />
          </div>
          <div className="hidden sm:flex flex-col">
          <span className="font-semibold tracking-tight text-sm">Live Clipboard</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">P2P Sync</span>
          </div>
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={openKeyboardShortcuts}
            className="rounded-full hover:bg-black/5 dark:hover:bg-white/10 h-9 w-9"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
