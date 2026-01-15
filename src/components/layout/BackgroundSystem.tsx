import React from 'react';

export function BackgroundSystem() {
  return (
    <div className="fixed inset-0 z-[-1] select-none pointer-events-none overflow-hidden h-screen w-screen">
      {/* Base Gradient */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      {/* Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[120px] animate-pulse-subtle" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px] animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-secondary/20 rounded-full blur-[100px] animate-float opacity-30" />
    </div>
  );
}
