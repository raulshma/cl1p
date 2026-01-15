'use client';

/**
 * Typing Indicator Component
 *
 * Displays an animated indicator when a peer is typing.
 * Shows the peer's nickname or ID with animated dots.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TypingIndicator as TypingIndicatorType } from '@/types';

interface TypingIndicatorProps {
  typingIndicators: Map<string, TypingIndicatorType>;
  peerMetadata?: Map<string, { nickname?: string }>;
  className?: string;
}

const TypingIndicatorComponent: React.FC<TypingIndicatorProps> = ({
  typingIndicators,
  peerMetadata,
  className = '',
}) => {
  const typingPeers = React.useMemo(() => {
    return Array.from(typingIndicators.values());
  }, [typingIndicators]);

  if (typingPeers.length === 0) {
    return null;
  }

  const getPeerDisplayName = (peerId: string): string => {
    const metadata = peerMetadata?.get(peerId);
    return metadata?.nickname || peerId;
  };

  const getTypingMessage = (): string => {
    if (typingPeers.length === 1) {
      const peer = typingPeers[0];
      if (!peer) return 'Someone is typing';
      const displayName = getPeerDisplayName(peer.peerId);
      return `${displayName} is typing`;
    } else if (typingPeers.length === 2) {
      const peer1 = typingPeers[0];
      const peer2 = typingPeers[1];
      if (!peer1 || !peer2) return '2 people are typing';
      const name1 = getPeerDisplayName(peer1.peerId);
      const name2 = getPeerDisplayName(peer2.peerId);
      return `${name1} and ${name2} are typing`;
    } else {
      return `${typingPeers.length} people are typing`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full text-sm text-blue-700 dark:text-blue-300 ${className}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Animated dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Typing message */}
        <span className="font-medium">{getTypingMessage()}</span>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Compact Typing Indicator Component
 *
 * A smaller version that only shows the dots without text
 */
interface CompactTypingIndicatorProps {
  isTyping: boolean;
  className?: string;
}

export const CompactTypingIndicator: React.FC<CompactTypingIndicatorProps> = ({
  isTyping,
  className = '',
}) => {
  if (!isTyping) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className={`flex items-center gap-1 ${className}`}
        role="status"
        aria-live="polite"
        aria-label="Peer is typing"
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-1 h-1 bg-current rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Typing Indicator Badge Component
 *
 * A badge-style indicator that can be placed next to peer names
 */
interface TypingBadgeProps {
  peerId: string;
  typingIndicators: Map<string, TypingIndicatorType>;
  className?: string;
}

export const TypingBadge: React.FC<TypingBadgeProps> = ({
  peerId,
  typingIndicators,
  className = '',
}) => {
  const isTyping = typingIndicators.has(peerId);

  if (!isTyping) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.span
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded ${className}`}
        role="status"
        aria-label="Typing"
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          typing
        </motion.span>
        <span className="flex items-center gap-0.5">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="w-0.5 h-0.5 bg-current rounded-full"
              animate={{
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </span>
      </motion.span>
    </AnimatePresence>
  );
};

export default TypingIndicatorComponent;
