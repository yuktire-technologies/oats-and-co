import React, { forwardRef } from "react";
import { cn } from "./Button";

export const Input = forwardRef(({ className, type = "text", error, ...props }, ref) => {
  return (
    <div className="w-full relative">
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border border-border-main bg-white px-4 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
    </div>
  );
});

Input.displayName = "Input";
