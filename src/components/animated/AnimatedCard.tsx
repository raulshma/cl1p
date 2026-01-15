'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { scaleIn } from '@/lib/animations/variants';

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  enableHover?: boolean;
}

/**
 * Animated card component with scale-in effect and optional hover
 * Great for content cards, info boxes, and feature highlights
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  delay = 0,
  enableHover = true,
  ...props
}) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
      whileHover={enableHover ? 'hover' : undefined}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
