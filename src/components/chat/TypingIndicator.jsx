import React from 'react';
import { motion } from "framer-motion";

export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15
            }}
          />
        ))}
      </div>
      <span className="text-sm text-slate-500">
        {typingUsers.length === 1 
          ? `${typingUsers[0]} skriver...` 
          : `${typingUsers.length} personer skriver...`}
      </span>
    </motion.div>
  );
}