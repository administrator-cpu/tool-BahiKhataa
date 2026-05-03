"use client";

import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FloatingBackButton() {
  const router = useRouter();
  const constraintsRef = useRef(null);

  return (
    /* This invisible div covers the whole screen to act as the "boundary" for throwing */
    <div 
      ref={constraintsRef} 
      className="fixed inset-0 pointer-events-none z-[9999]"
    >
      <motion.button
        drag
        /* "dragMomentum" makes it feel like it was thrown */
        dragMomentum={true}
        /* Keep the button within the screen edges */
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        /* Initial Position: Bottom Right */
        // initial={{ x: '8vw', y: '8vh' }}
        className="pointer-events-auto flex bottom-5 right-5 items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl cursor-grab active:cursor-grabbing border-2 border-white/20 backdrop-blur-sm"
      >
        <ArrowLeft size={24} />
      </motion.button>
    </div>
  );
}