'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ConnectionStatusSkeleton } from './skeletons';
import type { ConnectionState } from '@/types';

interface ConnectionStatusIndicatorProps {
  state?: ConnectionState;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onReconnect?: () => void;
  peerId?: string;
  isLoading?: boolean;
}

const statusConfig = {
  disconnected: {
    label: 'Disconnected',
    color: 'bg-gray-500',
    textColor: 'text-gray-700 dark:text-gray-400',
    ringColor: 'ring-gray-500',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
  },
  connecting: {
    label: 'Connecting',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    ringColor: 'ring-yellow-500',
    icon: (
      <svg
        className="w-4 h-4 animate-pulse"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  connected: {
    label: 'Connected',
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-400',
    ringColor: 'ring-green-500',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
  reconnecting: {
    label: 'Reconnecting',
    color: 'bg-orange-500',
    textColor: 'text-orange-700 dark:text-orange-400',
    ringColor: 'ring-orange-500',
    icon: (
      <svg
        className="w-4 h-4 animate-spin"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-400',
    ringColor: 'ring-red-500',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
  },
};

const sizeConfig = {
  sm: {
    container: 'h-6 px-2 gap-1.5',
    icon: 'w-4 h-4',
    text: 'text-xs',
    dot: 'w-2 h-2',
  },
  md: {
    container: 'h-8 px-3 gap-2',
    icon: 'w-5 h-5',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5',
  },
  lg: {
    container: 'h-10 px-4 gap-2.5',
    icon: 'w-6 h-6',
    text: 'text-base',
    dot: 'w-3 h-3',
  },
};

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  state,
  showLabel = true,
  size = 'md',
  className,
  onReconnect,
  peerId,
  isLoading = false,
}) => {
  // Show skeleton while loading
  if (isLoading || !state) {
    return <ConnectionStatusSkeleton size={size} className={className} />;
  }

  const config = statusConfig[state];
  const sizeStyles = sizeConfig[size];

  // Determine if reconnect button should be shown
  const canReconnect = (state === 'disconnected' || state === 'failed') && onReconnect;

  return (
    <motion.div
      className={cn(
        'inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm',
        sizeStyles.container,
        canReconnect && 'pr-2',
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {/* Animated dot indicator */}
      <div className="relative flex items-center justify-center" aria-hidden="true">
        <motion.div
          className={cn(
            'rounded-full',
            config.color,
            sizeStyles.dot
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Ripple animation for active states */}
        {(state === 'connected' || state === 'connecting' || state === 'reconnecting') && (
          <motion.div
            className={cn(
              'absolute rounded-full',
              config.color,
              sizeStyles.dot
            )}
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </div>

      {/* Icon */}
      <motion.div
        className={cn(
          'flex items-center justify-center',
          config.textColor,
          sizeStyles.icon
        )}
        aria-hidden="true"
        key={state}
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        {config.icon}
      </motion.div>

      {/* Label */}
      {showLabel && (
        <motion.span
          className={cn(
            'font-medium',
            sizeStyles.text,
            config.textColor
          )}
          key={`label-${state}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {config.label}
        </motion.span>
      )}

      {/* Screen reader-only status announcement */}
      <span className="sr-only" aria-live="polite">
        Connection status: {config.label}
      </span>

      {/* Manual Reconnect Button */}
      {canReconnect && (
        <motion.button
          onClick={onReconnect}
          className={cn(
            'ml-2 px-2 py-0.5 rounded-md',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'text-xs font-medium',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title={`Reconnect to ${peerId || 'peer'}`}
          aria-label={`Manually reconnect to ${peerId || 'peer'}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Reconnect
        </motion.button>
      )}
    </motion.div>
  );
};

export default ConnectionStatusIndicator;
