import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["Georgia", "serif"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["system-ui", "sans-serif"],
});

export const metadata = {
  title: {
    template: "%s | Oats & Co",
    default: "Oats & Co - Made for better mornings",
  },
  description: "Healthy, Nutritious, Natural, Made Fresh. Zero Added Sugar, Chef Crafted, Chef Fresh Daily, Built for Healthy Living.",
  openGraph: {
    title: "Oats & Co",
    description: "Healthy, tasty & made just for you. Fuel your best mornings with our Chef Crafted meals.",
    url: "https://oatsandco.example.com",
    siteName: "Oats & Co",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oats & Co",
    description: "Healthy, tasty & made just for you.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakarta.variable} h-full antialiased bg-cream text-text-main`}>
      <body className="min-h-full flex flex-col font-sans selection:bg-gold/30 selection:text-forest">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
