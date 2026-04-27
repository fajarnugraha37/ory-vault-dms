"use client";

import React from "react";
import { motion } from "framer-motion";

interface SceneWrapperProps {
  children: React.ReactNode;
  variant?: "default" | "auth" | "vault";
}

export function SceneWrapper({ children, variant = "default" }: SceneWrapperProps) {
  return (
    <div className="relative min-h-screen w-full bg-background-base overflow-hidden bg-noise">
      {/* Layer 1: Base Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a0a0f_0%,#050506_50%,#020203_100%)]" />

      {/* Layer 2: Animated Blobs (Scene Specific) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary Blob (Accent) */}
        <motion.div
          animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/20 blur-[120px] rounded-full"
        />

        {/* Secondary Blob (Purple) */}
        <motion.div
          animate={{
            y: [0, 60, 0],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full"
        />

        {/* Tertiary Blob (Blue) */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            x: [0, 40, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-0 -right-[5%] w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full"
        />
      </div>

      {/* Layer 3: Technical Grid Overlay */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
