'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { GlobalKeyboardShortcuts } from '@/components/GlobalKeyboardShortcuts';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative selection:bg-primary/20 selection:text-primary">
      <GlobalKeyboardShortcuts />
      <Header />

      {/* Main Content Area - Padding top accommodates the floating header */}
      <main id="main-content" className="flex-1 pt-32 pb-16 animate-in-up" tabIndex={-1}>
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
