'use client';

import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { staggerContainer, listItem } from '@/lib/animations/variants';

interface AnimatedListProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

interface AnimatedListItemProps extends HTMLMotionProps<'li'> {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

/**
 * Animated list container with stagger effect
 * Animates list items sequentially for a smooth appearance
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  ...props
}) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={staggerContainer}
      transition={{
        staggerChildren: staggerDelay,
      }}
      {...props}
    >
      <AnimatePresence>
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return (
              <motion.div
                key={child.key || `item-${index}`}
                variants={listItem}
              >
                {child}
              </motion.div>
            );
          }
          return child;
        })}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Animated list item component
 * Use this for individual list items with automatic stagger
 */
export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.li
      className={className}
      variants={listItem}
      {...props}
    >
      {children}
    </motion.li>
  );
};

export default AnimatedList;
