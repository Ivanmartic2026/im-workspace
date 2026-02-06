import React, { useState, useRef, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const scrollableRef = useRef(null);
  const y = useMotionValue(0);
  
  const threshold = 80;
  const maxPull = 120;

  const opacity = useTransform(y, [0, threshold], [0, 1]);
  const rotation = useTransform(y, [0, maxPull], [0, 360]);

  useEffect(() => {
    const handleTouchStart = (e) => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop === 0 && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (isRefreshing) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 0) return;

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;

      if (diff > 0) {
        e.preventDefault();
        setIsPulling(true);
        const pull = Math.min(diff * 0.5, maxPull);
        y.set(pull);
      }
    };

    const handleTouchEnd = async () => {
      if (y.get() >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        y.set(threshold);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        }
        
        setIsRefreshing(false);
      }
      
      setIsPulling(false);
      y.set(0);
      touchStartY.current = 0;
    };

    const container = scrollableRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isRefreshing, onRefresh, y, threshold, maxPull]);

  return (
    <div ref={scrollableRef} className="relative">
      {/* Pull indicator */}
      <motion.div
        style={{ y, opacity }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-20 -mt-20"
      >
        <motion.div
          style={{ rotate: rotation }}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 dark:bg-white shadow-lg"
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 text-white dark:text-slate-900 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5 text-white dark:text-slate-900" />
          )}
        </motion.div>
      </motion.div>

      {children}
    </div>
  );
}