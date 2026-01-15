/**
 * Time formatting utilities
 * Provides functions for formatting timestamps in user-friendly ways
 */

/**
 * Format a timestamp as relative time (e.g., "2 minutes ago", "just now")
 *
 * @param timestamp - The timestamp to format (Date or number)
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date | number): string {
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  const diff = now - time;

  // Less than a minute
  if (diff < 60000) {
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return 'just now';
    return `${seconds} seconds ago`;
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Less than a month
  if (diff < 2592000000) {
    const weeks = Math.floor(diff / 604800000);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  // Less than a year
  if (diff < 31536000000) {
    const months = Math.floor(diff / 2592000000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }

  // More than a year
  const years = Math.floor(diff / 31536000000);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/**
 * Format a timestamp as absolute time (e.g., "2:30 PM", "Jan 15, 2025")
 *
 * @param timestamp - The timestamp to format (Date or number)
 * @param includeDate - Whether to include the date (default: false)
 * @returns Formatted time string
 */
export function formatAbsoluteTime(timestamp: Date | number, includeDate = false): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;

  if (includeDate) {
    return date.toLocaleString();
  }

  return date.toLocaleTimeString();
}

/**
 * Format a timestamp with both relative and absolute time
 * (e.g., "2 minutes ago (2:30 PM)")
 *
 * @param timestamp - The timestamp to format (Date or number)
 * @returns Combined relative and absolute time string
 */
export function formatTimeWithAbsolute(timestamp: Date | number): string {
  const relative = formatRelativeTime(timestamp);
  const absolute = formatAbsoluteTime(timestamp);
  return `${relative} (${absolute})`;
}

/**
 * Check if a timestamp is recent (within the last minute)
 *
 * @param timestamp - The timestamp to check (Date or number)
 * @returns True if the timestamp is recent
 */
export function isRecent(timestamp: Date | number): boolean {
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  return now - time < 60000;
}

/**
 * Check if a timestamp is from today
 *
 * @param timestamp - The timestamp to check (Date or number)
 * @returns True if the timestamp is from today
 */
export function isToday(timestamp: Date | number): boolean {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
