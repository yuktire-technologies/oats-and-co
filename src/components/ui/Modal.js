"use client";

import React, { useEffect } from "react";
import { cn } from "./Button";
import { X } from "lucide-react";

export function Modal({ isOpen, onClose, title, children, isBottomSheet = false, zIndex = 50 }) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center sm:items-center sm:justify-center" style={{ zIndex }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={cn(
          "relative bg-ivory shadow-2xl flex flex-col w-full sm:max-w-md",
          isBottomSheet 
            ? "mt-auto h-[auto] max-h-[90vh] rounded-t-2xl sm:rounded-2xl sm:mt-0 sm:h-auto animate-slide-up"
            : "rounded-2xl m-4 max-h-[90vh] animate-fade-in"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-main">
          <h2 className="text-xl font-serif text-text-main font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors text-text-muted hover:text-text-main"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
