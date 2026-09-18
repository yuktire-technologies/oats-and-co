"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Plus, Minus, Star, MessageSquare, Leaf, Sparkles, Sun, ShieldCheck, Loader2, Navigation, ChevronDown, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import { CENTER_LOCATION, getDistanceInKm } from "@/lib/location";

export default function HomeClient({ initialItems, initialAddons = [], initialCoupons = [], initialSettings, initialReviews = [] }) {
  const [items, setItems] = useState(() => (initialItems || []).filter(i => i.isAvailable === true));
  const [addons, setAddons] = useState(() => (initialAddons || []).filter(a => a.isAvailable === true));
  const [reviews, setReviews] = useState(initialReviews || []);
  const [locationObj, setLocationObj] = useState({
    locality: "",
    address: "",
    statusText: "Select delivery location"
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sortOption, setSortOption] = useState("default");
  const [selectedItem, setSelectedItem] = useState(null);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(5);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const [navigateToCartOnLocation, setNavigateToCartOnLocation] = useState(false);

  const handleViewCartClick = () => {
    setNavigateToCartOnLocation(true);
    setLocationModalOpen(true);
  };

  useEffect(() => {
    setVisibleReviewsCount(5);
  }, [selectedItem]);

  const [nowTime, setNowTime] = useState(null);

  useEffect(() => {
    setNowTime(new Date());
    const intervalId = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const searchContainerRef = useRef(null);
  const { cart, addToCart, updateQuantity, getQuantity, totalItems, subTotal } = useCart();
  const router = useRouter();

  // Handle current location detection
  const detectCurrentLocation = useCallback(async () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationObj(prev => ({
        ...prev,
        statusText: "Select delivery location"
      }));
      return;
    }

    if (!navigator.onLine) {
      setLocationError("No internet connection available.");
      setLocationObj(prev => ({
        ...prev,
        statusText: "Select delivery location"
      }));
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Perform instant client-side radius distance calculation
        const distKm = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, latitude, longitude);
        console.log("Calculated Distance (KM):", distKm, "Max Allowed (KM):", CENTER_LOCATION.maxRadiusKm);

        if (distKm > CENTER_LOCATION.maxRadiusKm) {
          setIsLocating(false);
          setLocationModalOpen(false);
          const outOfRangeText = CENTER_LOCATION.outOfRangeMessage;
          setLocationError(outOfRangeText);
          setLocationObj({
            locality: "",
            address: "",
            statusText: "Select delivery location"
          });
          localStorage.removeItem("deliveryLocationData");
          localStorage.removeItem("deliveryLocation");
          setAlertModal({ isOpen: true, message: outOfRangeText });
          return;
        }

        try {
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (!data.isWithinDeliveryRadius) {
              const outOfRangeText = CENTER_LOCATION.outOfRangeMessage;
              setLocationModalOpen(false);
              setAlertModal({ isOpen: true, message: outOfRangeText });
              setLocationError(outOfRangeText);
              setLocationObj({
                locality: "",
                address: "",
                statusText: "Select delivery location"
              });
              localStorage.removeItem("deliveryLocationData");
              localStorage.removeItem("deliveryLocation");
              return;
            }

            const newLoc = {
              locality: data.locality || "Current Location",
              address: data.address || "Select delivery location",
              statusText: data.locality || "Current Location",
              lat: latitude,
              lng: longitude
            };
            setLocationObj(newLoc);
            localStorage.setItem("deliveryLocationData", JSON.stringify(newLoc));
            localStorage.setItem("deliveryLocation", data.locality || data.address);
            setLocationModalOpen(false);
            if (navigateToCartOnLocation) {
              setNavigateToCartOnLocation(false);
              router.push('/cart');
            }
          } else {
            // Client-side fallback if reverse geocoding API has network issue
            const { getDistanceInKm } = await import("@/lib/location");
            const dist = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, latitude, longitude);
            if (dist > CENTER_LOCATION.maxRadiusKm) {
              setLocationModalOpen(false);
              const outOfRangeText = CENTER_LOCATION.outOfRangeMessage;
              setAlertModal({ isOpen: true, message: outOfRangeText });
              setLocationError(outOfRangeText);
              setLocationObj(prev => ({
                ...prev,
                statusText: "Select delivery location"
              }));
              return;
            }

            const newLoc = {
              locality: "Current Location",
              address: `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              statusText: "Current Location",
              lat: latitude,
              lng: longitude
            };
            setLocationObj(newLoc);
            localStorage.setItem("deliveryLocationData", JSON.stringify(newLoc));
            localStorage.setItem("deliveryLocation", newLoc.address);
            setLocationModalOpen(false);
            if (navigateToCartOnLocation) {
              setNavigateToCartOnLocation(false);
              router.push('/cart');
            }
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setLocationError("Failed to fetch address details for your location.");
          setLocationObj(prev => ({
            ...prev,
            statusText: "Select delivery location"
          }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow location access in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location unavailable. Please check if your GPS is enabled.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Please try again.";
        }
        setLocationError(errorMsg);
        setLocationObj(prev => ({
          ...prev,
          statusText: "Select delivery location"
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }, []);

  // Perform debounced Firestore search via /api/search API endpoint
  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          // Ensure max 10 suggestions limit
          setSuggestions((data.suggestions || []).slice(0, 10));
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      fetchSuggestions.cancel();
    } else {
      setShowDropdown(true);
      setIsSearching(true);
      fetchSuggestions(value);
    }
  };

  // Close dropdown on outside tap / click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Load saved location object from local storage and validate distance
    const savedData = localStorage.getItem("deliveryLocationData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.lat && parsed.lng) {
          const dist = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, Number(parsed.lat), Number(parsed.lng));
          if (dist > CENTER_LOCATION.maxRadiusKm) {
            localStorage.removeItem("deliveryLocationData");
            localStorage.removeItem("deliveryLocation");
            setLocationObj({
              locality: "",
              address: "",
              statusText: "Select delivery location"
            });
          } else if (parsed.locality || parsed.address) {
            setLocationObj(parsed);
          }
        } else {
          // Stored data lacks lat/lng coordinates, reset to force re-detection
          localStorage.removeItem("deliveryLocationData");
          localStorage.removeItem("deliveryLocation");
          setLocationObj({
            locality: "",
            address: "",
            statusText: "Select delivery location"
          });
        }
      } catch (e) {
        localStorage.removeItem("deliveryLocationData");
        localStorage.removeItem("deliveryLocation");
      }
    } else {
      // Legacy plain string location without coordinates; clear it to enforce 1 KM detection
      localStorage.removeItem("deliveryLocation");
      setLocationObj({
        locality: "",
        address: "",
        statusText: "Select delivery location"
      });
    }

    setItems((initialItems || []).filter(i => i.isAvailable === true));
    setAddons((initialAddons || []).filter(a => a.isAvailable === true));
  }, [initialItems, initialAddons]);

  // Delivery status banner text
  const openTime = initialSettings?.openTime || "06:00";
  const closeTime = initialSettings?.closeTime || "10:00";
  const statusMode = initialSettings?.status || "Open";
  const customMessage = initialSettings?.customMessage || "";

  const formatTime12 = (time24Str) => {
    if (!time24Str) return "";
    if (time24Str.includes("AM") || time24Str.includes("PM")) return time24Str;
    const parts = String(time24Str).trim().split(":");
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1] || "0", 10);
    if (isNaN(h)) return time24Str;
    if (isNaN(m)) m = 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const h12Str = String(h12).padStart(2, "0");
    const mStr = String(m).padStart(2, "0");
    return `${h12Str}:${mStr} ${ampm}`;
  };

  const formattedOpenTime = formatTime12(openTime);
  const formattedCloseTime = formatTime12(closeTime);

  let deliveryBannerText = `Delivery is available from ${formattedOpenTime} to ${formattedCloseTime}`;
  if (statusMode === "Delivery Closed Today") {
    deliveryBannerText = "Delivery Closed Today";
  } else if (statusMode === "Delivery Unavailable") {
    deliveryBannerText = "Delivery Unavailable";
  } else if (statusMode === "Custom Message" && customMessage) {
    deliveryBannerText = customMessage;
  }

  // Active coupon for banner display
  const activeCoupon = initialCoupons && initialCoupons.length > 0 ? initialCoupons[0] : null;

  // Validate ordering availability
  const checkDeliveryAvailability = () => {
    if (statusMode === "Delivery Closed Today") {
      setAlertModal({ isOpen: true, message: "Sorry. Delivery Closed Today" });
      return false;
    }
    if (statusMode === "Delivery Unavailable") {
      setAlertModal({ isOpen: true, message: "Sorry. Delivery Unavailable" });
      return false;
    }
    if (statusMode === "Custom Message" && customMessage) {
      setAlertModal({ isOpen: true, message: `Sorry. ${customMessage}` });
      return false;
    }

    if (openTime && closeTime) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = openTime.split(":").map(Number);
      const [closeH, closeM] = closeTime.split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
        setAlertModal({
          isOpen: true,
          message: `Delivery is available from ${formattedOpenTime} to ${formattedCloseTime}. So, please order between that time`
        });
        return false;
      }
    }

    return true;
  };

  const handleAddToCart = (item) => {
    if (!checkDeliveryAvailability()) return;
    addToCart(item);
  };

  const handleUpdateQuantity = (item, change) => {
    if (change > 0 && !checkDeliveryAvailability()) return;
    updateQuantity(item.id, change);
  };

  // Sort items (only show items where isAvailable is true)
  const filteredItems = items
    .filter(item => item.isAvailable === true)
    .sort((a, b) => {
      if (sortOption === "low-to-high") return a.price - b.price;
      if (sortOption === "high-to-low") return b.price - a.price;
      return 0;
    });

  // Swiggy style 30 mins closing warning alert calculation & dynamic countdown
  let showClosingWarning = false;
  let remainingMinsText = "30 mins";
  if (statusMode === "Open" && openTime && closeTime && nowTime) {
    const currentMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();
    const currentSeconds = nowTime.getSeconds();
    const [closeH, closeM] = closeTime.split(":").map(Number);
    const closeMinutes = closeH * 60 + closeM;
    const warningStartMinutes = closeMinutes - 30;

    if (currentMinutes >= warningStartMinutes && currentMinutes < closeMinutes) {
      showClosingWarning = true;
      const totalSecsRemaining = (closeMinutes * 60) - (currentMinutes * 60 + currentSeconds);
      const mins = Math.max(1, Math.ceil(totalSecsRemaining / 60));
      remainingMinsText = `${mins} min${mins !== 1 ? 's' : ''}`;
    }
  }

  const handleSuggestionClick = (item) => {
    setShowDropdown(false);
    // Find item from items list if complete data exists or use fetched suggestion
    const fullItem = items.find((i) => i.id === item.id) || item;
    setSelectedItem(fullItem);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Sub-Header / Location & Search */}
      <header className="sticky top-[10px] sm:top-0 z-30 bg-white/95 backdrop-blur-md shadow-xs border-b border-gray-200 px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div
            onClick={() => setLocationModalOpen(true)}
            className="flex items-center gap-2 text-forest cursor-pointer hover:opacity-80 transition-opacity max-w-full overflow-hidden group"
          >
            <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-forest shrink-0 group-hover:bg-forest group-hover:text-white transition-colors">
              <MapPin size={18} />
            </div>
            <div className="flex flex-col overflow-hidden text-left">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                  {locationObj.locality ? locationObj.locality : "Delivery Location"}
                </span>
                <ChevronDown size={12} className="text-text-muted group-hover:text-forest transition-transform" />
              </div>
              <span className="text-sm font-sans font-bold truncate text-text-main">
                {locationObj.address || locationObj.locality || "Select delivery location"}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Timings / Status Banner */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-center text-xs font-extrabold font-sans text-forest flex items-center justify-center gap-2 shadow-2xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{deliveryBannerText}</span>
        </div>

        {/* Search Bar with Autocomplete Suggestions Dropdown */}
        <div className="relative" ref={searchContainerRef}>
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/70 z-10" />
          <input
            type="text"
            placeholder="Search for an item…"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 focus:bg-white transition-all shadow-2xs"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setShowDropdown(true);
              }
            }}
          />
          {isSearching && (
            <Loader2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-forest animate-spin z-10" />
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 flex flex-col">
              {isSearching ? (
                <div className="p-4 text-center text-xs font-bold text-text-muted flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-forest" />
                  Searching items...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="divide-y divide-gray-100 overflow-y-auto max-h-80">
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSuggestionClick(item)}
                      className="p-3 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 text-[10px] font-bold shrink-0">
                            Oats
                          </div>
                        )}
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-bold text-text-main group-hover:text-forest truncate">
                            {item.name}
                          </span>
                          {item.quantityLabel && (
                            <span className="text-[10px] text-text-muted">{item.quantityLabel}</span>
                          )}
                        </div>
                      </div>
                      <div className="font-extrabold text-xs text-forest shrink-0 ml-2">
                        ₹{item.price}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs font-semibold text-text-muted">
                  No items found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 sm:p-6 flex-1 max-w-6xl mx-auto w-full">
        {/* Luxury Hero Showcase Banner (White Theme) */}
        <div className="relative bg-emerald-50/80 rounded-3xl p-6 sm:p-8 mb-6 text-text-main shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none"></div>
          <div className="z-10 flex flex-col items-start gap-2.5 max-w-xl">
            <span className="bg-emerald-50 text-emerald-800 text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border border-emerald-200">
              Healthy • Nutritious • Natural • Made Fresh
            </span>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold text-forest leading-tight">
              Better Morning, <br />
              <span className="text-amber-700">Better Strength</span>
            </h1>
          </div>

          <div className="w-full md:w-60 h-40 rounded-2xl overflow-hidden border border-gray-200 shadow-xs shrink-0 relative bg-gray-50">
            <img
              src="https://img.freepik.com/premium-photo/oats-food-hd-8k-wallpaper-stock-photographic-image_949228-47746.jpg"
              alt="Oats & Co Banner"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Feature Highlights Grid - Eye-Catching Premium Light Green Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 mb-6 sm:mb-8">
          {[
            {
              title: "Zero Added Sugar",
              sub: "100% Natural Sweetness",
              badge: "Natural",
              icon: Leaf,
              iconBg: "bg-emerald-100/80 text-emerald-700 border-emerald-300/80",
              accentGlow: "from-emerald-400/25 to-teal-300/10",
              badgeStyle: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80"
            },
            {
              title: "Chef Crafted",
              sub: "Artisanal Recipes",
              badge: "Artisanal",
              icon: Sparkles,
              iconBg: "bg-amber-100/80 text-amber-700 border-amber-300/80",
              accentGlow: "from-amber-400/25 to-emerald-300/10",
              badgeStyle: "bg-amber-100/90 text-amber-800 border-amber-300/80"
            },
            {
              title: "Chef Fresh Daily",
              sub: "Made Fresh Daily",
              badge: "Fresh Daily",
              icon: Sun,
              iconBg: "bg-orange-100/80 text-orange-700 border-orange-300/80",
              accentGlow: "from-orange-400/25 to-emerald-300/10",
              badgeStyle: "bg-orange-100/90 text-orange-800 border-orange-300/80"
            },
            {
              title: "Healthy Living",
              sub: "High Fiber & Protein",
              badge: "Nutrient Rich",
              icon: ShieldCheck,
              iconBg: "bg-teal-100/80 text-teal-700 border-teal-300/80",
              accentGlow: "from-teal-400/25 to-emerald-300/10",
              badgeStyle: "bg-teal-100/90 text-teal-800 border-teal-300/80"
            }
          ].map((feature, idx) => (
            <div
              key={idx}
              className="group relative bg-gradient-to-b from-emerald-50/90 via-emerald-50/50 to-white border border-emerald-200/90 hover:border-emerald-400/90 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 shadow-2xs hover:shadow-xl hover:shadow-emerald-950/5 hover:-translate-y-1.5 transition-all duration-300 cursor-default overflow-hidden"
            >
              {/* Radial Ambient Light Blur */}
              <div className={`absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br ${feature.accentGlow} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`}></div>

              {/* Top Row: Icon Badge & Mini Tag */}
              <div className="flex items-center justify-between z-10">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-2xs ${feature.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <feature.icon size={22} strokeWidth={2.2} />
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs ${feature.badgeStyle}`}>
                  {feature.badge}
                </span>
              </div>

              {/* Bottom Content: Title & Subtitle */}
              <div className="flex flex-col gap-0.5 z-10 mt-1">
                <h3 className="text-sm sm:text-base font-serif font-bold text-forest group-hover:text-emerald-950 transition-colors leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[11px] sm:text-xs font-sans text-emerald-800/80 font-medium leading-tight">
                  {feature.sub}
                </p>
              </div>

              {/* Bottom Animated Accent Line */}
              <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500 rounded-full"></div>
            </div>
          ))}
        </div>

        {/* Active Coupon Banner 
        {activeCoupon && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white rounded-2xl p-4 mb-6 shadow-md border border-amber-600 flex items-center justify-between animate-fade-in">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100">Special Offer</span>
              <span className="text-sm sm:text-base font-bold font-sans">
                Use code <span className="bg-white/20 px-2 py-0.5 rounded font-extrabold">{activeCoupon.code}</span> for {activeCoupon.discountType === "percentage" ? `${activeCoupon.discountValue}%` : `₹${activeCoupon.discountValue}`} OFF
              </span>
            </div>
            <span className="bg-white text-amber-700 text-xs font-extrabold px-3 py-1.5 rounded-xl uppercase shadow-xs shrink-0">
              Apply Code
            </span>
          </div>
        )} */}

        {/* Section Heading & Filter Radio Group */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-ivory/80 p-4 rounded-2xl border border-border-main shadow-2xs">
          <div>
            <h2 className="text-2xl font-serif font-bold text-forest">Order Now. Fuel Your Fitness.
            </h2>
            <p className="text-xs text-text-muted font-sans mt-0.5">Freshly prepared every morning</p>
          </div>

          {/* Sort Filter Radio Buttons */}
          <div className="flex items-center gap-2 text-xs font-bold text-text-main flex-wrap">
            <span className="text-text-muted uppercase tracking-wider text-[11px]">Filter:</span>
            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl border transition-all ${sortOption === 'default' ? 'bg-forest text-white border-forest shadow-xs' : 'bg-white text-text-main border-border-main hover:bg-cream'}`}>
              <input
                type="radio"
                name="sortFilter"
                value="default"
                checked={sortOption === "default"}
                onChange={(e) => setSortOption(e.target.value)}
                className="hidden"
              />
              <span>Default</span>
            </label>
            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl border transition-all ${sortOption === 'low-to-high' ? 'bg-forest text-white border-forest shadow-xs' : 'bg-white text-text-main border-border-main hover:bg-cream'}`}>
              <input
                type="radio"
                name="sortFilter"
                value="low-to-high"
                checked={sortOption === "low-to-high"}
                onChange={(e) => setSortOption(e.target.value)}
                className="hidden"
              />
              <span>Cost: Low to High</span>
            </label>
            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl border transition-all ${sortOption === 'high-to-low' ? 'bg-forest text-white border-forest shadow-xs' : 'bg-white text-text-main border-border-main hover:bg-cream'}`}>
              <input
                type="radio"
                name="sortFilter"
                value="high-to-low"
                checked={sortOption === "high-to-low"}
                onChange={(e) => setSortOption(e.target.value)}
                className="hidden"
              />
              <span>Cost: High to Low</span>
            </label>
          </div>
        </div>

        {/* Menu Items Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              quantity={getQuantity(item.id)}
              onAdd={() => handleAddToCart(item)}
              onUpdate={(change) => handleUpdateQuantity(item, change)}
              onClick={() => setSelectedItem(item)}
            />
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-text-muted flex flex-col items-center">
              <div className="w-24 h-24 bg-border-main/20 rounded-full flex items-center justify-center mb-4">
                <Search size={32} className="opacity-50" />
              </div>
              <p>No items found.</p>
            </div>
          )}
        </div>

        {/* Fresh Add-ons (fruits) Section */}
        {addons && addons.length > 0 && (
          <div className="mb-10 animate-fade-in">
            <div className="flex flex-col mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200">
                Fresh & Healthy
              </span>
              <h2 className="text-2xl font-serif font-bold text-forest mt-1.5">Add-ons (fruits)</h2>
              <p className="text-xs text-text-muted font-sans mt-0.5">Customize your bowl with fresh fruit toppings</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map(addon => {
                const qty = getQuantity(addon.id);
                return (
                  <div
                    key={addon.id}
                    className="group bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/30 rounded-2xl p-4 border border-emerald-200/90 shadow-2xs flex items-center justify-between gap-4 hover:shadow-lg hover:shadow-emerald-950/8 hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 bg-white rounded-xl overflow-hidden shrink-0 border border-emerald-200/80 shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        {addon.image ? (
                          <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">🍌</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-serif font-extrabold text-forest text-base truncate group-hover:text-emerald-950 transition-colors">{addon.name}</h4>
                        {addon.description && (
                          <p className="text-xs text-text-muted line-clamp-1 font-sans">{addon.description}</p>
                        )}
                        <span className="font-extrabold text-emerald-800 text-sm mt-0.5">₹{addon.price}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {qty === 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-extrabold h-8 px-3 bg-white border-2 border-forest text-forest hover:bg-forest hover:text-white rounded-xl transition-all active:scale-95 text-xs"
                          onClick={() => handleAddToCart(addon)}
                        >
                          + ADD
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between bg-forest text-white rounded-xl p-1 shadow-md h-8 gap-1.5">
                          <button onClick={() => handleUpdateQuantity(addon, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <Minus size={13} />
                          </button>
                          <span className="font-extrabold font-sans text-xs">{qty}</span>
                          <button onClick={() => handleUpdateQuantity(addon, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Start Fresh Stay Fit Showcase Card (Bottom Card above Footer) */}
        <div className="relative bg-emerald-50/80 rounded-3xl p-6 sm:p-8 text-text-main shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none"></div>

          {/* Left Image */}
          <div className="w-full md:w-60 h-40 rounded-2xl overflow-hidden border border-gray-200 shadow-xs shrink-0 relative bg-gray-50 z-10">
            <img
              src="https://tse2.mm.bing.net/th/id/OIP.UvIn-Cqrox2rz3s1mKrtugHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"
              alt="Start fresh Stay fit"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Right Content */}
          <div className="z-10 flex flex-col items-start md:items-end text-left md:text-right gap-2.5 max-w-xl flex-1">
            <span className="bg-emerald-50 text-emerald-800 text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border border-emerald-200">
              Nutritious & Delicious
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-forest leading-tight">
              Start fresh.
              <span className="text-amber-700">Stay fit.</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed mt-1">
              Made with real ingredients to fuel your best mornings. Healthy, tasty & made just for you.
            </p>
          </div>
        </div>
      </div>

      {/* Item Details Bottom Sheet (Modal Bottom Sheet) */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name} isBottomSheet>
        {selectedItem && (
          <div className="flex flex-col gap-5 py-1 font-sans">
            <div className="w-full h-48 bg-border-main/20 rounded-2xl relative overflow-hidden flex items-center justify-center border border-border-main">
              {selectedItem.image ? (
                <img src={selectedItem.image} alt={selectedItem.name} className="object-cover w-full h-full" />
              ) : (
                <span className="text-text-muted font-bold text-sm">No Image</span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-text-main">{selectedItem.name}</h3>
                  {selectedItem.ingredients && (
                    <p className="text-xs text-text-muted mt-1 leading-relaxed"><span className="font-bold text-forest">Ingredients:</span> {selectedItem.ingredients}</p>
                  )}
                  {selectedItem.nutrition && (
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed"><span className="font-bold text-forest">Nutrition:</span> {selectedItem.nutrition}</p>
                  )}
                </div>
                <div className="flex flex-col items-end shrink-0 ml-3">
                  <span className="text-2xl font-bold text-forest">₹{selectedItem.price}</span>
                  {selectedItem.quantityLabel && (
                    <span className="text-xs font-bold text-text-muted">{selectedItem.quantityLabel}</span>
                  )}
                </div>
              </div>

              {/* Rating */}
              {selectedItem.rating && (
                <div className="flex items-center gap-1.5 text-amber-600 font-extrabold text-sm bg-amber-50 px-3 py-1 rounded-xl w-fit border border-amber-200">
                  <Star size={16} className="fill-amber-500 text-amber-500" />
                  <span>{selectedItem.rating.score}</span>
                  <span className="text-text-muted font-bold">({selectedItem.rating.count})</span>
                </div>
              )}
            </div>

            {/* Written Text Reviews */}
            {(() => {
              const selectedItemReviews = reviews.filter((r) => {
                if (r.itemIds && Array.isArray(r.itemIds) && r.itemIds.includes(selectedItem.id)) {
                  return true;
                }
                if (r.items && Array.isArray(r.items) && r.items.some(i => String(i.id) === String(selectedItem.id) || i.name?.toLowerCase() === selectedItem.name?.toLowerCase())) {
                  return true;
                }
                if (r.itemsSummary && selectedItem.name && r.itemsSummary.toLowerCase().includes(selectedItem.name.toLowerCase())) {
                  return true;
                }
                return false;
              });

              const displayedReviews = selectedItemReviews.slice(0, visibleReviewsCount);
              const hasMoreReviews = visibleReviewsCount < selectedItemReviews.length;

              return (
                <div className="border-t border-border-main pt-4 flex flex-col gap-3">
                  <h4 className="font-serif font-bold text-forest text-base flex items-center gap-2">
                    <MessageSquare size={18} className="text-amber-500" /> Customer Reviews ({selectedItemReviews.length})
                  </h4>

                  {selectedItemReviews.length === 0 ? (
                    <p className="text-xs text-text-muted italic bg-ivory p-3 rounded-xl border border-border-main">
                      No written reviews yet for this item.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                        {displayedReviews.map((rev) => (
                          <div key={rev.id} className="bg-ivory border border-border-main rounded-xl p-3 flex flex-col gap-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-text-main">{rev.customerName || "Customer"}</span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i < (rev.rating || 5) ? "fill-amber-500 text-amber-500" : "text-gray-300"}
                                  />
                                ))}
                              </div>
                            </div>
                            {rev.comment || rev.reviewText ? (
                              <p className="text-text-muted italic">"{rev.comment || rev.reviewText}"</p>
                            ) : (
                              <p className="text-[11px] text-text-muted">Rated {rev.rating || 5} stars</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {hasMoreReviews && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVisibleReviewsCount((prev) => prev + 5)}
                          className="w-full h-9 text-xs font-bold border-forest/40 text-forest hover:bg-forest/5 rounded-xl transition-colors"
                        >
                          Load More
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bottom Add to Cart Button */}
            <div className="pt-2 border-t border-border-main">
              {getQuantity(selectedItem.id) === 0 ? (
                <Button className="w-full h-12 text-base font-bold bg-forest hover:bg-green" onClick={() => { if (checkDeliveryAvailability()) { addToCart(selectedItem); setSelectedItem(null); } }}>
                  Add to Cart ₹{selectedItem.price}
                </Button>
              ) : (
                <div className="flex items-center justify-between bg-forest text-white rounded-xl p-1 w-full h-12">
                  <button onClick={() => handleUpdateQuantity(selectedItem, -1)} className="w-12 h-10 flex items-center justify-center hover:bg-white/20 rounded-lg">
                    <Minus size={20} />
                  </button>
                  <span className="font-bold font-sans text-lg">{getQuantity(selectedItem.id)}</span>
                  <button onClick={() => handleUpdateQuantity(selectedItem, 1)} className="w-12 h-10 flex items-center justify-center hover:bg-white/20 rounded-lg">
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delivery Restriction Alert Modal */}
      <Modal isOpen={alertModal.isOpen} onClose={() => setAlertModal({ isOpen: false, message: "" })} title="Notice" zIndex={100}>
        <div className="py-4 font-sans text-center">
          <p className="text-text-main text-base font-semibold mb-6">{alertModal.message}</p>
          <Button className="w-full bg-forest text-white font-bold h-11" onClick={() => setAlertModal({ isOpen: false, message: "" })}>
            Ok
          </Button>
        </div>
      </Modal>

      {/* Swiggy/Zomato Style Delivery Location Selector Modal */}
      <Modal
        isOpen={locationModalOpen}
        onClose={() => {
          setLocationModalOpen(false);
          setLocationError("");
        }}
        title="Select Delivery Location"
        isBottomSheet
      >
        <div className="py-2 flex flex-col gap-4 font-sans text-text-main text-left">
          {/* Detect Current Location Main CTA Button */}
          <button
            onClick={detectCurrentLocation}
            disabled={isLocating}
            className="w-full bg-forest hover:bg-green text-white rounded-2xl p-4 flex items-center justify-between shadow-md transition-all active:scale-[0.98] disabled:opacity-75 cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                {isLocating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Navigation size={20} className="fill-white/20" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-sm text-white">
                  {isLocating ? "Detecting location..." : "Use Current Location"}
                </span>
                <span className="text-xs text-white/80">Using GPS / Device location</span>
              </div>
            </div>
            {isLocating && (
              <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full text-white">
                Detecting...
              </span>
            )}
          </button>

          {/* Location Detection Error Fallback Banner */}
          {locationError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-amber-900 animate-fade-in">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex flex-col text-xs font-sans">
                <span className="font-bold text-amber-900 mb-0.5">Location Detection Issue</span>
                <span className="leading-relaxed">{locationError}</span>
              </div>
            </div>
          )}

          {/* Current Saved Location Preview */}
          {locationObj.address && (
            <div
              onClick={() => {
                setLocationModalOpen(false);
                if (navigateToCartOnLocation) {
                  setNavigateToCartOnLocation(false);
                  router.push('/cart');
                }
              }}
              className="bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-100/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-forest mt-1 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-3 overflow-hidden">
                <MapPin size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    {locationObj.locality || "Current Location"}
                  </span>
                  <span className="text-xs font-bold text-forest mt-0.5 line-clamp-2">
                    {locationObj.address}
                  </span>
                </div>
              </div>
              <Button size="sm" className="bg-forest text-white text-xs font-extrabold shrink-0">
                Deliver Here
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Swiggy Style Closing Warning Alert Bar */}
      {showClosingWarning && (
        <div className={`fixed left-0 right-0 z-40 px-4 transition-all duration-300 ${totalItems > 0 ? 'bottom-32 sm:bottom-20' : 'bottom-16 sm:bottom-4'}`}>
          <div className="max-w-md mx-auto bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-2xl p-3.5 shadow-xl border border-red-500 flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-extrabold tracking-wide">
              <span className="bg-white text-red-600 p-1 rounded-full text-xs shrink-0">⏰</span>
              <span>Hurry! Delivery Closes in {remainingMinsText}</span>
            </div>
            <span className="text-[11px] font-mono bg-black/20 px-2 py-1 rounded-lg">
              Until {formattedCloseTime}
            </span>
          </div>
        </div>
      )}

      {/* Sticky Cart Preview Footer */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 p-4 z-40 pointer-events-none">
          <div className="max-w-2xl mx-auto w-full pointer-events-auto shadow-2xl animate-slide-up">
            <button
              onClick={handleViewCartClick}
              className="w-full bg-forest text-white rounded-2xl p-4 flex items-center justify-between hover:bg-green transition-colors active:scale-[0.98]"
            >
              <div className="flex flex-col text-left">
                <span className="font-bold font-sans">{totalItems} item{totalItems > 1 ? 's' : ''} added</span>
                <span className="text-sm opacity-80">₹{subTotal}</span>
              </div>
              <div className="font-bold font-sans flex items-center gap-2">
                View Cart <span className="bg-white/20 p-1 rounded-full"><Plus size={16} /></span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, quantity, onAdd, onUpdate, onClick }) {
  return (
    <div
      className="group relative bg-gradient-to-br from-white via-emerald-50/60 to-teal-50/40 hover:from-white hover:via-emerald-50/90 hover:to-emerald-100/70 rounded-[28px] p-4 sm:p-5 border border-emerald-200/90 hover:border-emerald-400 shadow-xs hover:shadow-2xl hover:shadow-emerald-950/12 hover:-translate-y-1.5 transition-all duration-300 flex flex-row gap-4 cursor-pointer overflow-hidden justify-between"
      onClick={onClick}
    >
      {/* Glow highlight background effect */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br from-emerald-300/30 to-teal-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

      {/* Left Content Column */}
      <div className="flex-1 flex flex-col justify-between min-w-0 z-10 gap-2.5">
        <div className="flex flex-col gap-2">
          {/* Top Badges (Category & Rating) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100/90 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300/80 shadow-2xs">
              <Leaf size={10} className="text-emerald-700" />
              100% Organic
            </span>
            {item.rating && item.rating.score ? (
              <div className="inline-flex items-center gap-1 text-amber-800 text-xs font-extrabold bg-amber-50/90 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                <span>{item.rating.score}</span>
                <span className="text-text-muted font-medium text-[10px]">({item.rating.count})</span>
              </div>
            ) : null}
          </div>

          {/* Item Title */}
          <h3 className="text-base sm:text-lg font-serif font-extrabold text-forest group-hover:text-emerald-950 transition-colors line-clamp-2 leading-snug">
            {item.name}
          </h3>

          {/* Ingredients */}
          {item.ingredients && (
            <p className="text-xs text-text-muted/90 line-clamp-2 font-sans leading-relaxed">
              <span className="font-extrabold text-forest">Ingredients:</span> {item.ingredients}
            </p>
          )}

          {/* Nutrition info chip */}
          {item.nutrition && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-white/80 border border-emerald-200/80 px-2.5 py-1 rounded-xl w-fit font-sans font-bold shadow-2xs">
              <Sparkles size={11} className="text-amber-500 shrink-0" />
              <span className="truncate max-w-[200px]">{item.nutrition}</span>
            </div>
          )}
        </div>

        {/* Price & Quantity Tag */}
        <div className="flex items-center gap-2.5 mt-1 font-sans">
          <div className="flex items-baseline gap-0.5">
            <span className="font-sans font-bold text-emerald-700 text-2xl">₹</span>
            <span className="font-extrabold text-forest text-2xl tracking-tight leading-none">{item.price}</span>
          </div>
          {item.quantityLabel && (
            <span className="text-[11px] font-extrabold text-emerald-900 bg-white/90 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
              {item.quantityLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right Image & Add Button Column */}
      <div className="w-28 sm:w-32 flex flex-col items-center justify-between gap-3 shrink-0 z-10">
        <div className="w-full h-24 sm:h-28 bg-white rounded-2xl overflow-hidden relative border border-emerald-200 shadow-xs group-hover:shadow-md group-hover:border-emerald-400 transition-all">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-700/60 font-bold text-xs">
              No Image
            </div>
          )}
        </div>

        {/* Bottom Add Button */}
        <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
          {quantity === 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full font-extrabold shadow-sm hover:shadow-md h-9 bg-white border-2 border-forest text-forest hover:bg-forest hover:text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs tracking-wider"
              onClick={onAdd}
            >
              <Plus size={14} strokeWidth={3} /> ADD
            </Button>
          ) : (
            <div className="flex items-center justify-between bg-forest text-white rounded-xl p-1 w-full shadow-md h-9">
              <button onClick={() => onUpdate(-1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                <Minus size={15} />
              </button>
              <span className="font-extrabold font-sans text-xs">{quantity}</span>
              <button onClick={() => onUpdate(1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors">
                <Plus size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
