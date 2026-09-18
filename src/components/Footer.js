"use client";

import React from "react";
import { Phone, MessageCircle, MapPin, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-emerald-50/80 text-text-main pt-12 pb-16 sm:pb-10 border-t border-gray-200 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 pb-8 border-b border-gray-200">
          {/* Brand Col */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/oats_co_logo.png"
                alt="Oats & Co."
                className="w-16 h-16 rounded-full object-cover border border-emerald-200/60 shadow-2xs shrink-0"
              />
              <span className="text-2xl font-serif font-extrabold text-forest tracking-wide">Oats & Co.</span>
            </div>
            <p className="text-sm font-sans font-bold text-amber-700 italic">
              Made for better mornings
            </p>
            <p className="text-xs text-text-muted leading-relaxed font-sans mt-1 max-w-sm">
              Healthy • Nutritious • Natural • Made Fresh. <br />
              Zero Added Sugar, Chef Crafted, Chef Fresh Daily, Built for Healthy Living.
            </p>
          </div>

          {/* Contact Us Col */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-serif font-extrabold text-forest uppercase tracking-widest">Connect With Us</h4>
            <div className="flex flex-col gap-2.5 text-sm font-sans text-text-main">
              <a
                href="tel:+9618147503"
                className="flex items-center gap-2.5 hover:text-forest transition-colors w-fit font-medium"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-forest">
                  <Phone size={15} />
                </div>
                <span>+91 9618147503</span>
              </a>

              <a
                href="https://wa.me/9618147503"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-emerald-700 transition-colors w-fit font-medium"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <MessageCircle size={15} />
                </div>
                <span>Whatsapp Us: +91 9618147503</span>
              </a>

              <a
                href="https://www.instagram.com/the_oats_co"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-rose-600 transition-colors w-fit font-medium"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </div>
                <span>Follow on Instagram (@the_oats_co)</span>
              </a>
            </div>
          </div>

          {/* Location Col */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-serif font-extrabold text-forest uppercase tracking-widest">We are serving</h4>
            <div className="flex items-start gap-2.5 text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
              <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-forest shrink-0 mt-0.5">
                <MapPin size={15} />
              </div>
              <p className="font-medium">
                Opposite Canara Bank, near vasavi medical hall, KN road, Tadepalligudem, 534101
              </p>
            </div>
          </div>
        </div>

        {/* Copyright & Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted font-sans gap-3">
          <p>© {new Date().getFullYear()} Oats & Co. All rights reserved.</p>
          <p className="font-bold text-forest">Designed & Developed by <a className="text-amber-700 hover:text-amber-500 transition-colors duration-200 cursor-pointer" href="https://yuktiretechnologies.com" target="_blank" rel="noopener noreferrer">Yuktire Technologies</a></p>
        </div>
      </div>
    </footer>
  );
}
