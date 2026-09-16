"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({ error, reset }) {
  React.useEffect(() => {
    console.error("Customer route runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-2xs">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-serif font-bold text-forest mb-2">Something went wrong!</h2>
      <p className="text-sm text-text-muted max-w-md mb-6 leading-relaxed">
        {error?.message || "An unexpected error occurred while loading this page. Please try again."}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-forest hover:bg-green text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-xs"
        >
          <RefreshCw size={16} /> Try Again
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 bg-ivory border border-border-main text-forest font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-forest/5 transition-all shadow-2xs"
        >
          <Home size={16} /> Go Home
        </Link>
      </div>
    </div>
  );
}
