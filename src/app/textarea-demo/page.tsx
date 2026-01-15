'use client';

import React, { useState } from 'react';
import TextareaInput from '@/components/TextareaInput';
import toast from 'react-hot-toast';

export default function TextareaDemo() {
  const [submittedMessages, setSubmittedMessages] = useState<Array<{ id: number; text: string; timestamp: Date }>>([]);

  const handleSubmit = (text: string) => {
    const newMessage = {
      id: Date.now(),
      text,
      timestamp: new Date(),
    };
    setSubmittedMessages((prev) => [newMessage, ...prev]);
    toast.success('Message submitted successfully!');
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <header className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Textarea Component Demo
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            A feature-rich textarea component with character counter, auto-resize, and multi-line support
          </p>
        </header>

        {/* Demo Sections */}
        <div className="space-y-8">
          {/* Basic Example */}
          <section className="space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-2">Basic Example</h2>
              <p className="text-muted-foreground mb-4">
                Simple textarea with auto-resize and character counter
              </p>
              <TextareaInput
                placeholder="Type your message here..."
                onSubmit={handleSubmit}
                onCopy={handleCopy}
                onShare={handleShare}
                onClear={handleClear}
              />
            </div>
          </section>

          {/* With Character Limit */}
          <section className="space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-2">With Character Limit (200)</h2>
              <p className="text-muted-foreground mb-4">
                Textarea with a maximum character limit and visual progress indicator
              </p>
              <TextareaInput
                placeholder="Type a short message (max 200 characters)..."
                maxLength={200}
                showCounter={true}
                onSubmit={handleSubmit}
                onCopy={handleCopy}
                onShare={handleShare}
                onClear={handleClear}
              />
            </div>
          </section>

          {/* Minimal Example */}
          <section className="space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-2">Minimal Example</h2>
              <p className="text-muted-foreground mb-4">
                Clean textarea without action buttons or counter
              </p>
              <TextareaInput
                placeholder="Just typing..."
                showCounter={false}
                showActions={false}
                minRows={5}
                maxRows={15}
              />
            </div>
          </section>

          {/* Custom Submit Label */}
          <section className="space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-2">Custom Submit Label</h2>
              <p className="text-muted-foreground mb-4">
                Textarea with a custom submit button label
              </p>
              <TextareaInput
                placeholder="Write your announcement..."
                submitLabel="Broadcast"
                onSubmit={handleSubmit}
                onCopy={handleCopy}
                onShare={handleShare}
                onClear={handleClear}
              />
            </div>
          </section>

          {/* Disabled State */}
          <section className="space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold mb-2">Disabled State</h2>
              <p className="text-muted-foreground mb-4">
                Textarea in disabled state (simulating disconnected state)
              </p>
              <TextareaInput
                placeholder="This textarea is disabled..."
                disabled={true}
                defaultValue="Cannot edit this text..."
              />
            </div>
          </section>

          {/* Submitted Messages Display */}
          {submittedMessages.length > 0 && (
            <section className="space-y-4">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h2 className="text-2xl font-bold mb-4">
                  Submitted Messages ({submittedMessages.length})
                </h2>
                <div className="space-y-3">
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

        {/* Features List */}
        <section className="mt-12 bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>✓ Auto-resize based on content (min/max rows)</li>
            <li>✓ Character counter with visual progress indicator</li>
            <li>✓ Copy to clipboard functionality</li>
            <li>✓ Share functionality (uses Web Share API when available)</li>
            <li>✓ Clear button to reset text</li>
            <li>✓ Keyboard shortcut (Ctrl/Cmd + Enter) to submit</li>
            <li>✓ Configurable character limits</li>
            <li>✓ Disabled state support</li>
            <li>✓ Responsive design with Tailwind CSS</li>
            <li>✓ Accessible with ARIA labels</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
