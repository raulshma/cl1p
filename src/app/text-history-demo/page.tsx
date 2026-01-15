'use client';

import React, { useState } from 'react';
import TextareaInput from '@/components/TextareaInput';
import TextHistory from '@/components/TextHistory';
import toast from 'react-hot-toast';

export default function TextHistoryDemo() {
  const [submittedMessages, setSubmittedMessages] = useState<Array<{ id: number; text: string; timestamp: Date }>>([]);

  const handleSubmit = (text: string) => {
    const newMessage = {
      id: Date.now(),
      text,
      timestamp: new Date(),
    };
    setSubmittedMessages((prev) => [newMessage, ...prev]);
    toast.success('Message submitted and saved to history!');
  };

  const handleCopy = (text: string) => {
    toast.success('Copied to clipboard!');
  };

  const handleShare = (text: string) => {
    toast.success('Shared successfully!');
  };

  const handleClear = () => {
    toast.success('Message cleared!');
  };

  const handleHistoryEntrySelect = (content: string) => {
    toast.success('Loaded from history!');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <header className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Text History Feature Demo
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Maintain a local history of shared text messages with timestamps. Navigate through history and copy previous entries.
          </p>
        </header>

        {/* Demo Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Text Input */}
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h2 className="text-2xl font-bold mb-2">Text Input with History</h2>
                <p className="text-muted-foreground mb-4">
                  Type a message and submit. It will be automatically saved to history.
                </p>
                <TextareaInput
                  placeholder="Type your message here... Use Alt + ↑/↓ to navigate history"
                  onSubmit={handleSubmit}
                  onCopy={handleCopy}
                  onShare={handleShare}
                  onClear={handleClear}
                  submitLabel="Send & Save to History"
                />
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold">Keyboard Shortcuts:</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-background rounded">Enter</kbd> - Submit message</li>
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded">Alt</kbd> + <kbd className="px-1 py-0.5 bg-background rounded">↑</kbd> - Previous entry in history</li>
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded">Alt</kbd> + <kbd className="px-1 py-0.5 bg-background rounded">↓</kbd> - Next entry in history</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Submitted Messages */}
            {submittedMessages.length > 0 && (
              <section className="space-y-4">
                <div className="bg-card rounded-lg p-6 border border-border">
                  <h2 className="text-2xl font-bold mb-4">
                    Submitted Messages ({submittedMessages.length})
                  </h2>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {submittedMessages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 bg-muted rounded-lg border border-border"
                      >
                        <p className="text-sm text-foreground mb-2 whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()} • {message.text.length} characters
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: History Display */}
          <div className="space-y-8">
            <section className="space-y-4">
              <TextHistory
                onEntrySelect={handleHistoryEntrySelect}
                maxDisplayEntries={20}
              />
            </section>

            {/* Features List */}
            <section className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-4">Features</h2>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>✓ Automatic history tracking when submitting messages</li>
                <li>✓ Timestamps for each entry</li>
                <li>✓ Navigate history with arrow buttons or keyboard shortcuts</li>
                <li>✓ Copy any entry to clipboard</li>
                <li>✓ Click on any entry to load it into the text input</li>
                <li>✓ History persists across page refreshes (localStorage)</li>
                <li>✓ Limited to 100 entries to prevent memory issues</li>
                <li>✓ Clear all history option</li>
                <li>✓ Visual indicator for current entry</li>
                <li>✓ Relative timestamps (e.g., &quot;2m ago&quot;, &quot;1h ago&quot;)</li>
              </ul>
            </section>

            {/* Technical Details */}
            <section className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-4">Technical Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">State Management</h3>
                  <p className="text-muted-foreground">
                    Uses Zustand with persistence middleware to store history in localStorage
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Memory Management</h3>
                  <p className="text-muted-foreground">
                    Maximum 100 entries stored. Oldest entries are automatically removed when limit is reached.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Duplicate Prevention</h3>
                  <p className="text-muted-foreground">
                    Prevents adding duplicate consecutive entries to avoid clutter.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Branching</h3>
                  <p className="text-muted-foreground">
                    When navigating back and submitting new content, creates a new branch (removes entries after current position).
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
