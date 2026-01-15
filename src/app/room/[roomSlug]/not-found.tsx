import Link from 'next/link';

export default function RoomNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="space-y-6 max-w-md">
        <h1 className="text-9xl font-bold text-muted-foreground/50">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Room not found</h2>
          <p className="text-muted-foreground">
            The room you&apos;re looking for doesn&apos;t exist or the room ID is invalid.
          </p>
          <p className="text-sm text-muted-foreground">
            Room IDs should be alphanumeric and can contain hyphens.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            Go back home
          </Link>
          <Link
            href="/?create=true"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            Create a new room
          </Link>
        </div>
      </div>
    </div>
  );
}
