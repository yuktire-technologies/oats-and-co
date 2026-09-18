"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  PackagePlus, 
  Ticket, 
  Clock, 
  Users, 
  Star, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import FCMProvider from "@/components/FCMProvider";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // If it's the login page, don't show the sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Manage Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Add Items", href: "/admin/items", icon: PackagePlus },
    { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    { label: "Delivery Timings", href: "/admin/settings", icon: Clock },
    { label: "Manage Customers", href: "/admin/customers", icon: Users },
    { label: "Manage Reviews", href: "/admin/reviews", icon: Star },
  ];

  const handleLogout = () => {
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/admin/login");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-cream overflow-hidden font-sans">
      <FCMProvider />
      
      {/* Mobile Top Header Bar (Hidden on desktop) */}
      <header className="lg:hidden bg-ivory border-b border-border-main/80 px-4 py-3 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white border border-border-main text-forest hover:bg-forest/10 transition-colors shadow-2xs focus:outline-none"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-xl font-serif font-bold text-forest truncate">Oats & Co. Admin</span>
        </div>
      </header>

      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-ivory border-r border-border-main flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Sidebar Header with Title & Mobile Close Button */}
        <div className="p-5 border-b border-border-main/50 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-forest">Oats & Co. Admin</h1>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-forest/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans font-semibold transition-colors ${
                  isActive ? "bg-forest text-white shadow-xs" : "text-text-muted hover:bg-forest/5 hover:text-text-main"
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-border-main/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-sans font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col justify-between">
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Logout Confirmation"
      >
        <div className="py-4 font-sans text-center">
          <p className="text-text-main text-base font-semibold mb-6">
            Are you sure you want to logout?
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm font-bold"
              onClick={() => setLogoutModalOpen(false)}
            >
              No
            </Button>
            <Button
              className="flex-1 h-11 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Yes, Logout"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
