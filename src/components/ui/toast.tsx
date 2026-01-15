'use client';

import { toast as toastFn } from 'react-hot-toast';
import type { Toast } from '@/types';

/**
 * Toast notification helper functions using react-hot-toast
 * Provides consistent API with the existing Toast type
 */

/**
 * Show a success toast notification
 */
export const toast = {
  success: (message: string, title?: string) => {
    return toastFn.success(
      <div className="flex flex-col">
        {title && <span className="font-bold">{title}</span>}
        <span>{message}</span>
      </div>,
      {
        duration: 4000,
        className: 'toast-success',
      }
    );
  },

  /**
   * Show an error toast notification
   */
  error: (message: string, title?: string) => {
    return toastFn.error(
      <div className="flex flex-col">
        {title && <span className="font-bold">{title}</span>}
        <span>{message}</span>
      </div>,
      {
        duration: 5000,
        className: 'toast-error',
      }
    );
  },

  /**
   * Show an info toast notification
   */
  info: (message: string, title?: string) => {
    return toastFn(
      <div className="flex flex-col">
        {title && <span className="font-bold">{title}</span>}
        <span>{message}</span>
      </div>,
      {
        duration: 4000,
        icon: '🔵',
        className: 'toast-info',
      }
    );
  },

  /**
   * Show a warning toast notification
   */
  warning: (message: string, title?: string) => {
    return toastFn(
      <div className="flex flex-col">
        {title && <span className="font-bold">{title}</span>}
        <span>{message}</span>
      </div>,
      {
        duration: 4000,
        icon: '⚠',
        className: 'toast-warning',
      }
    );
  },

  /**
   * Show a loading toast notification
   * Returns a function that can be called to dismiss the loading toast
   */
  loading: (message: string, title?: string) => {
    return toastFn.loading(
      <div className="flex flex-col">
        {title && <span className="font-bold">{title}</span>}
        <span>{message}</span>
      </div>,
      {
        className: 'toast-loading',
      }
    );
  },

  /**
   * Show a custom toast notification
   */
  custom: (toast: Omit<Toast, 'id'>) => {
    const content = (
      <div className="flex flex-col">
        <span className="font-bold">{toast.title}</span>
        {toast.message && <span>{toast.message}</span>}
        {toast.actions && (
          <div className="flex gap-2 mt-2">
            {toast.actions.map((action, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  toastFn.dismiss();
                }}
                className={`px-3 py-1 rounded text-sm ${
                  action.primary
                    ? 'bg-white text-current font-semibold'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );

    switch (toast.type) {
      case 'success':
        return toastFn.success(content, {
          duration: toast.duration || 4000,
          className: 'toast-success',
        });
      case 'error':
        return toastFn.error(content, {
          duration: toast.duration || 5000,
          className: 'toast-error',
        });
      case 'warning':
        return toastFn(content, {
          duration: toast.duration || 4000,
          icon: '⚠',
          className: 'toast-warning',
        });
      case 'info':
      default:
        return toastFn(content, {
          duration: toast.duration || 4000,
          icon: '🔵',
          className: 'toast-info',
        });
    }
  },

  /**
   * Dismiss all toast notifications
   */
  dismiss: () => {
    toastFn.dismiss();
  },

  /**
   * Dismiss a specific toast notification
   */
  dismissById: (toastId: string) => {
    toastFn.dismiss(toastId);
  },

  /**
   * Remove all toast notifications
   */
  clear: () => {
    toastFn.remove();
  },
};
