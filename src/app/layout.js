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
  icons: {
    icon: "/oats_co_logo.png",
    shortcut: "/oats_co_logo.png",
    apple: "/oats_co_logo.png",
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://oatsandco.in/#organization",
        "name": "Oats & Co",
        "url": "https://oatsandco.in",
        "logo": "https://oatsandco.in/oats_co_logo.png",
        "description": "Healthy, Nutritious, Natural, Made Fresh. Zero Added Sugar, Chef Crafted, Chef Fresh Daily, Built for Healthy Living.",
        "sameAs": [
          "https://www.instagram.com/the_oats_co"
        ],
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Opposite Canara Bank, near vasavi medical hall, KN road",
          "addressLocality": "Tadepalligudem",
          "postalCode": "534101",
          "addressCountry": "IN"
        }
      },
      {
        "@type": "Restaurant",
        "@id": "https://oatsandco.in/#restaurant",
        "name": "Oats & Co",
        "url": "https://oatsandco.in",
        "logo": "https://oatsandco.in/oats_co_logo.png",
        "image": "https://oatsandco.in/oats_co_logo.png",
        "servesCuisine": ["Healthy", "Breakfast", "Oatmeal", "Organic"],
        "priceRange": "₹₹",
        "currenciesAccepted": "INR",
        "paymentAccepted": "Cash",
        "sameAs": [
          "https://www.instagram.com/the_oats_co"
        ],
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Opposite Canara Bank, near vasavi medical hall, KN road",
          "addressLocality": "Tadepalligudem",
          "postalCode": "534101",
          "addressCountry": "IN"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://oatsandco.in/#website",
        "url": "https://oatsandco.in",
        "name": "Oats & Co",
        "publisher": {
          "@id": "https://oatsandco.in/#organization"
        }
      }
    ]
  };

  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakarta.variable} h-full antialiased bg-cream text-text-main`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
