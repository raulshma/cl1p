import { HeartIcon } from '@heroicons/react/24/outline';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border/20 mt-auto">
      <div className="container mx-auto px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <span>© {currentYear} Live Clipboard</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              Made with <HeartIcon className="h-4 w-4 text-red-500 fill-red-500/20" /> using WebRTC
            </span>
          </div>
          
          <div className="flex gap-4 opacity-50 text-xs text-muted-foreground">
             <span>Encrypted</span>
             <span>Serverless</span>
             <span>Open Source</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
