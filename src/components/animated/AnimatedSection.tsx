'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { fadeInUp } from '@/lib/animations/variants';

interface AnimatedSectionProps extends HTMLMotionProps<'section'> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Animated section component with fade-in and upward slide
 * Perfect for page sections and content blocks
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  delay = 0,
  ...props
}) => {
  return (
    <motion.section
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInUp}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.section>
  );
};

export default AnimatedSection;
