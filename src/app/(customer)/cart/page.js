"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, Tag, Trash2, CheckCircle2, Navigation, Loader2, MapPin, AlertCircle } from "lucide-react";

import { getDistanceInKm, calculateDeliveryFee, CENTER_LOCATION } from "@/lib/location";

export default function CartPage() {
  const { cart, updateQuantity, clearCart, subTotal } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [instructions, setInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // would be verified by backend eventually
  const [discountAmount, setDiscountAmount] = useState(0);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash on Delivery");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [outOfRangeModal, setOutOfRangeModal] = useState({ isOpen: false, message: "" });

  // Location selection modal state for cart page
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationObj, setLocationObj] = useState(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("deliveryLocationData");
      if (saved) setLocationObj(JSON.parse(saved));
    } catch (e) { }
  }, []);

  let distanceInKm = null;
  if (locationObj && locationObj.lat && locationObj.lng) {
    distanceInKm = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, Number(locationObj.lat), Number(locationObj.lng));
  }

  const deliveryFee = distanceInKm !== null ? calculateDeliveryFee(distanceInKm) : 0;
  const grandTotal = Math.max(0, subTotal - discountAmount + (deliveryFee || 0));

  const detectCurrentLocation = async () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    if (!navigator.onLine) {
      setLocationError("No internet connection available.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Perform radius calculation
        const distKm = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, latitude, longitude);
        if (distKm > CENTER_LOCATION.maxRadiusKm) {
          setIsLocating(false);
          setLocationModalOpen(false);
          const outOfRangeText = CENTER_LOCATION.outOfRangeMessage;
          setOutOfRangeModal({ isOpen: true, message: outOfRangeText });
          localStorage.removeItem("deliveryLocationData");
          localStorage.removeItem("deliveryLocation");
          setLocationObj(null);
          return;
        }

        try {
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (!data.isWithinDeliveryRadius) {
              setLocationModalOpen(false);
              setOutOfRangeModal({ isOpen: true, message: CENTER_LOCATION.outOfRangeMessage });
              localStorage.removeItem("deliveryLocationData");
              localStorage.removeItem("deliveryLocation");
              setLocationObj(null);
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
            setIsConfirmModalOpen(true);
          } else {
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
            setIsConfirmModalOpen(true);
          }
        } catch (err) {
          setLocationError("Failed to fetch address details for your location.");
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
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subTotal }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setAppliedCoupon(data.code);
        setDiscountAmount(data.discountAmount);
        setCouponError("");
      } else {
        setCouponError(data.error || "Invalid coupon code");
        alert(data.error || "Invalid coupon code");
      }
    } catch (error) {
      setCouponError("Failed to validate coupon");
      alert("Failed to validate coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const [isAddonRestrictionModalOpen, setIsAddonRestrictionModalOpen] = useState(false);

  const handleConfirmOrderClick = () => {
    // Check if cart contains ONLY add-ons (fruits) and no main Overnight Oats items
    const hasMainItem = cart.some(item =>
      item.ingredients || item.quantityLabel || item.nutrition || (!item.description && !item.id.startsWith("addon"))
    );

    if (!hasMainItem) {
      setIsAddonRestrictionModalOpen(true);
      return;
    }

    if (!user) {
      router.push("/profile"); // redirect to login
      return;
    }

    if (!locationObj || !locationObj.address) {
      alert('Please select a delivery location from the Home page.');
      router.push('/');
      return;
    }

    if (distanceInKm !== null && distanceInKm > CENTER_LOCATION.maxRadiusKm) {
      setOutOfRangeModal({ isOpen: true, message: CENTER_LOCATION.outOfRangeMessage });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    let lat = null;
    let lng = null;

    try {
      const savedLocData = localStorage.getItem("deliveryLocationData");
      if (savedLocData) {
        const parsed = JSON.parse(savedLocData);
        if (parsed.lat) lat = parsed.lat;
        if (parsed.lng) lng = parsed.lng;
        if (parsed.lat && parsed.lng) {
          const dist = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, Number(parsed.lat), Number(parsed.lng));
          if (dist > CENTER_LOCATION.maxRadiusKm) {
            setIsPlacingOrder(false);
            setIsConfirmModalOpen(false);
            setOutOfRangeModal({ isOpen: true, message: CENTER_LOCATION.outOfRangeMessage });
            return;
          }
        }
      }
    } catch (e) { }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity })),
          couponCode: appliedCoupon,
          deliveryLocation: localStorage.getItem("deliveryLocation") || "Unknown Location",
          lat,
          lng,
          preparationInstructions: instructions,
          paymentMode,
          customerName: user?.displayName || user?.name || "",
          customerPhone: user?.phoneNumber || user?.phone_number || "",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderSuccess(true);
        clearCart();
      } else {
        if (data.error && data.error.includes("radius")) {
          setIsConfirmModalOpen(false);
          setOutOfRangeModal({ isOpen: true, message: data.error });
        } else {
          alert(data.error || "Failed to place order");
        }
      }
    } catch (error) {
      alert("Failed to connect to server");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center animate-fade-in">
        <CheckCircle2 size={64} className="text-green mb-6" />
        <h1 className="text-3xl font-serif font-bold text-forest mb-2">Order Placed Successfully!</h1>
        <p className="text-text-muted font-sans mb-8">Thank you for choosing Oats & Co. Your better morning is on the way.</p>
        <Button onClick={() => router.push("/orders")} className="w-full sm:w-auto">View My Orders</Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center">
        <div className="w-24 h-24 bg-border-main/20 rounded-full flex items-center justify-center mb-6">
          <Trash2 size={32} className="text-text-muted" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-text-main mb-2">Your cart is empty</h2>
        <p className="text-text-muted mb-8">Looks like you haven't added any healthy treats yet.</p>
        <Button onClick={() => router.push("/")} className="w-full sm:w-auto">Start Exploring</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-6 sm:pb-8 bg-cream animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-ivory shadow-sm border-b border-border-main px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-forest hover:bg-forest/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-serif font-bold text-forest">Review Order</h1>
      </header>

      <div className="p-4 sm:p-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        {/* Items List */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border-main flex flex-col gap-4">
          <h2 className="font-sans font-bold text-text-main">Added Items ({cart.length})</h2>

          <div className="flex flex-col gap-4">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b border-border-main last:border-0 last:pb-0">
                <div className="flex-1 flex flex-col">
                  <span className="font-serif font-bold text-text-main">{item.name}</span>
                  <span className="text-forest font-bold font-sans">₹{item.price * item.quantity}</span>
                </div>

                <div className="flex items-center justify-between bg-ivory border border-border-main rounded-lg p-1 w-28">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-text-muted hover:bg-forest/10 rounded-md">
                    <Minus size={16} />
                  </button>
                  <span className="font-bold font-sans text-forest">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-text-muted hover:bg-forest/10 rounded-md">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => router.push("/")} className="text-forest font-bold text-sm flex items-center gap-1 justify-center py-2 mt-2 hover:bg-forest/5 rounded-lg transition-colors">
            <Plus size={16} /> Add more items
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border-main">
          <label className="font-sans font-bold text-text-main mb-2 block">Preparation Instructions</label>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="any specific preparation instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </div>

        {/* Coupons */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border-main">
          <label className="font-sans font-bold text-text-main mb-2 flex items-center gap-2 block">
            <Tag size={16} className="text-forest" /> Apply Coupon
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              disabled={!!appliedCoupon}
            />
            {!appliedCoupon ? (
              <Button onClick={handleApplyCoupon} variant="outline" className="shrink-0" disabled={isValidatingCoupon}>
                {isValidatingCoupon ? "Validating..." : "Apply"}
              </Button>
            ) : (
              <Button onClick={() => { setAppliedCoupon(null); setDiscountAmount(0); setCouponCode(""); setCouponError(""); }} variant="ghost" className="shrink-0 text-red-500">Remove</Button>
            )}
          </div>
          {couponError && (
            <p className="text-red-500 text-xs mt-1 font-sans">{couponError}</p>
          )}
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border-main">
          <h2 className="font-sans font-bold text-text-main mb-4">Bill Details</h2>
          <div className="flex flex-col gap-2.5 text-sm text-text-muted font-sans border-b border-border-main pb-4 mb-4">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-bold text-text-main">₹{subTotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green">
                <span>Coupon Code Applied</span>
                <span className="font-bold">-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  Delivery Fee
                  {distanceInKm !== null && (
                    <span className="text-[11px] text-forest font-semibold bg-forest/10 px-2 py-0.5 rounded-full">
                      ({distanceInKm.toFixed(1)} km)
                    </span>
                  )}
                </span>
                {deliveryFee === 0 ? (
                  <span className="font-bold text-forest bg-forest/10 px-2 py-0.5 rounded text-xs uppercase">Free Delivery</span>
                ) : (
                  <span className="font-bold text-text-main">₹{deliveryFee}</span>
                )}
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-forest flex flex-col gap-1 mt-1">
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-800">Note:</span>
                <span className="font-semibold">Upto 2 kms Free Delivery</span>
                <span className="font-semibold">if exceed 2 kms then 10 rupees for each km</span>
                <span className="font-semibold mt-1">e.g,</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 ml-2 font-medium">
                  <span>2 kms - Free Delivery</span>
                  <span>3 km - 30 rupees</span>
                  <span>4 km - 30 rupees</span>
                  <span>5 km - 50 rupees</span>
                  <span>6 km - 30 rupees</span>
                  <span>7 km - 30 rupees</span>
                  <span>8 km - 50 rupees</span>
                  <span>9 km - 30 rupees</span>
                  <span>10 km - 50 rupees</span>
                </div>
                <span className="font-semibold mt-1">Note: Only 10 kms is upper limit for delivery</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between font-bold text-lg text-forest">
            <span>Grand Total</span>
            <span>₹{grandTotal}</span>
          </div>
        </div>

      </div>

      {/* Sticky Confirm Footer */}
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 pb-1 bg-ivory border-t border-border-main z-30 shadow-md">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-14 text-lg bg-orange hover:bg-orange/90 shadow-lg"
            onClick={handleConfirmOrderClick}
          >
            {user ? `Confirm Order ₹${grandTotal}` : "Login/Create Account to Place Order"}
          </Button>
        </div>
      </div>

      {/* Payment Mode Bottom Sheet */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Choose Payment Mode" isBottomSheet>
        <div className="flex flex-col gap-4 py-2">
          <label className="flex items-center gap-3 p-4 border border-border-main rounded-xl cursor-pointer hover:bg-forest/5 transition-colors">
            <input
              type="radio"
              name="paymentMode"
              value="Cash on Delivery"
              checked={paymentMode === "Cash on Delivery"}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-5 h-5 text-forest accent-forest"
            />
            <span className="font-bold text-text-main font-sans">Cash on Delivery</span>
          </label>
          {/*  <label className="flex items-center gap-3 p-4 border border-border-main rounded-xl cursor-pointer hover:bg-forest/5 transition-colors">
            <input
              type="radio"
              name="paymentMode"
              value="Online Transaction"
              checked={paymentMode === "Online Transaction"}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-5 h-5 text-forest accent-forest"
            />
              <span className="font-bold text-text-main font-sans">Online Transaction (UPI/Card)</span> 
          </label>
*/}
          <div className="flex gap-4 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-forest" onClick={handlePlaceOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? "Placing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add-on Only Order Restriction Modal */}
      <Modal
        isOpen={isAddonRestrictionModalOpen}
        onClose={() => setIsAddonRestrictionModalOpen(false)}
        title="Add-ons Restriction"
      >
        <div className="py-4 font-sans text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 text-3xl">
            🥣
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-serif font-bold text-forest">Cannot Order Add-ons Alone</h3>
            <p className="text-sm text-text-muted leading-relaxed max-w-xs">
              Fruit add-ons are crafted to accompany our healthy meals. Please add at least one <span className="font-extrabold text-forest">Overnight Oats bowl</span> to complete your order.
            </p>
          </div>
          <Button
            className="w-full bg-forest text-white font-bold h-11 rounded-xl mt-2 hover:bg-green"
            onClick={() => {
              setIsAddonRestrictionModalOpen(false);
              router.push("/");
            }}
          >
            Ok, Add Overnight Oats
          </Button>
        </div>
      </Modal>

      {/* Out of Delivery Radius Alert Modal */}
      <Modal
        isOpen={outOfRangeModal.isOpen}
        onClose={() => setOutOfRangeModal({ isOpen: false, message: "" })}
        title="Delivery Out of Area"
      >
        <div className="py-4 font-sans text-center flex flex-col items-center gap-4">
          <p className="text-text-main text-sm font-semibold leading-relaxed px-2">{outOfRangeModal.message}</p>
          <Button
            className="w-full bg-forest text-white font-bold h-11 rounded-xl mt-2 hover:bg-green"
            onClick={() => setOutOfRangeModal({ isOpen: false, message: "" })}
          >
            Ok
          </Button>
        </div>
      </Modal>

      {/* Select Delivery Location Modal on Cart Page */}
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
          {locationObj && locationObj.address && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-forest mt-1">
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
          )}
        </div>
      </Modal>

    </div>
  );
}
