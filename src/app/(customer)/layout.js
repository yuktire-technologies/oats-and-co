"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, User } from "lucide-react";
import Footer from "@/components/Footer";
import FCMProvider from "@/components/FCMProvider";

export default function CustomerLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "My Orders", href: "/orders", icon: ClipboardList },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-cream relative pb-16 sm:pb-0 sm:flex-row">
      <FCMProvider />

      {/* Mobile Top Header */}
      <header className="sm:hidden flex items-center justify-between px-4 py-3 bg-ivory border-b border-border-main sticky top-0 z-50 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/oats_co_logo.png"
            alt="Oats & Co."
            className="w-16 h-16 rounded-full object-cover border border-emerald-200/60 shadow-2xs"
          />
          <span className="text-lg font-serif font-bold text-forest tracking-tight">Oats & Co.</span>
        </Link>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-64 bg-ivory border-r border-border-main p-6 sticky top-0 h-[100dvh]">
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/oats_co_logo.png"
            alt="Oats & Co."
            className="w-16 h-16 rounded-full object-cover border border-emerald-200/60 shadow-2xs shrink-0"
          />
          <div>
            <h1 className="text-2xl font-serif font-bold text-forest leading-tight">Oats & Co.</h1>
            <p className="text-xs font-sans italic text-text-muted">Made for better mornings</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 p-3 rounded-lg font-sans font-semibold transition-colors ${isActive ? "bg-forest/10 text-forest" : "text-text-muted hover:bg-forest/5 hover:text-text-main"
                  }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto">
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-ivory border-t border-border-main flex items-center justify-around h-16 px-4 z-40 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? "text-forest" : "text-text-muted hover:text-text-main"
                }`}
            >
              <item.icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-sans font-bold ${isActive ? "opacity-100" : "opacity-80"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

