"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Phone, Star } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

export default function OrdersClient({ initialOrders }) {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState(initialOrders);
  const [ordersLoading, setOrdersLoading] = useState(true);

  React.useEffect(() => {
    async function fetchUserOrders() {
      if (user && user.uid) {
        setOrdersLoading(true);
        try {
          const query = new URLSearchParams();
          if (user.uid) query.set("userId", user.uid);
          if (user.phoneNumber) query.set("phone", user.phoneNumber);

          const res = await fetch(`/api/orders?${query.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders || []);
            setOrdersLoading(false);
            return;
          }
        } catch (e) { }
      }
      setOrders(initialOrders || []);
      setOrdersLoading(false);
    }
    fetchUserOrders();
  }, [user, initialOrders]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    const finalReason = cancelReason === "Custom" ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      alert("Please select or enter a reason for cancelling your order.");
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: finalReason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const cancelledByName = user?.name || selectedOrder.customerName || "customer";
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: "Cancelled", rejectReason: finalReason, cancelReason: finalReason, cancelledBy: cancelledByName } : o));
        setSelectedOrder(prev => ({ ...prev, status: "Cancelled", rejectReason: finalReason, cancelReason: finalReason, cancelledBy: cancelledByName }));
        setCancelModalOpen(false);
        setCancelReason("");
        setCustomCancelReason("");
      } else {
        alert(data.error || "Failed to cancel order");
      }
    } catch (e) {
      alert("Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const [visibleOrdersCount, setVisibleOrdersCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleOrdersCount((prev) => prev + 10);
      setIsLoadingMore(false);
    }, 250);
  };

  if (loading || (user && ordersLoading)) {
    return <div className="flex h-64 items-center justify-center text-text-muted font-sans">Loading orders...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in font-sans">
        <h2 className="text-2xl font-serif font-bold text-forest mb-2">My Orders</h2>
        <p className="text-text-muted mb-6">Please login to view your orders.</p>
        <a href="/profile" className="inline-flex items-center justify-center rounded-lg font-sans font-bold bg-forest text-white h-11 px-6">
          Login / Signup
        </a>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-text-muted mb-4 font-sans">You haven't placed any orders yet.</p>
        <Button onClick={() => window.location.href = "/"}>Browse Menu</Button>
      </div>
    );
  }

  const handleRatingSubmit = async (orderId, rating, reviewText) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Thanks for your feedback!");
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isRated: true, rating, reviewText } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, isRated: true, rating, reviewText }));
        }
      } else {
        alert(data.error || "Failed to submit rating");
      }
    } catch (e) {
      alert("Failed to submit rating");
    }
  };

  const displayedOrders = orders.slice(0, visibleOrdersCount);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {displayedOrders.map(order => (
        <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
      ))}

      {visibleOrdersCount < orders.length && (
        <div className="mt-2 text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full sm:w-auto px-8 h-11 text-sm font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
          >
            {isLoadingMore ? "Loading orders..." : "Load More Orders"}
          </Button>
        </div>
      )}

      {/* Order Details Bottom Sheet */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Details" isBottomSheet>
        {selectedOrder && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col text-sm text-text-muted">
              <span className="font-bold text-text-main font-sans">Order number: {selectedOrder.orderId}</span>
              <span>Ordered on: {new Date(selectedOrder.createdAt).toLocaleDateString()}, {new Date(selectedOrder.createdAt).toLocaleTimeString()}</span>
            </div>

            {/* Ordered Items */}
            <div className="bg-ivory border border-border-main rounded-xl p-4">
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border-main last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    {item.image ? (
                      <div className="w-12 h-12 bg-border-main/20 rounded-md overflow-hidden shrink-0">
                        <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-border-main/20 rounded-md shrink-0" />
                    )}
                    <span className="font-bold font-sans text-text-main">{item.name} x {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Flowchart */}
            <div className="bg-ivory border border-border-main rounded-xl p-4">
              <h3 className="font-bold font-sans text-text-main mb-4">Tracking</h3>
              <TrackingFlowchart
                status={selectedOrder.status}
                rejectReason={selectedOrder.rejectReason}
                cancelReason={selectedOrder.cancelReason}
                cancelledBy={selectedOrder.cancelledBy}
                customerName={selectedOrder.customerName}
              />

              <div className="mt-6 flex justify-center">
                <a href="tel:+919618147503" className="inline-flex items-center gap-2 text-forest bg-forest/10 px-4 py-2 rounded-full font-bold text-sm hover:bg-forest/20 transition-colors">
                  <Phone size={16} /> Call Support (+91 9618147503)
                </a>
              </div>
            </div>

            {/* Rating section if delivered */}
            {selectedOrder.status === "Delivered" && (
              <RatingSection
                isRated={selectedOrder.isRated}
                existingRating={selectedOrder.rating}
                existingReview={selectedOrder.reviewText}
                onSubmit={(rating, text) => handleRatingSubmit(selectedOrder.id, rating, text)}
              />
            )}

            {/* Price Details */}
            <div className="bg-ivory border border-border-main rounded-xl p-4">
              <h3 className="font-bold font-sans text-text-main mb-4">Price Details</h3>
              <div className="flex flex-col gap-2 text-sm text-text-muted font-sans border-b border-border-main pb-4 mb-4">
                <div className="flex justify-between">
                  <span>Price</span>
                  <span className="font-bold text-text-main">₹{selectedOrder.itemTotal}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-green">
                    <span>Coupon Code Applied</span>
                    <span className="font-bold">-₹{selectedOrder.discountAmount}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-bold text-lg text-forest mb-2">
                <span>Total</span>
                <span>₹{selectedOrder.grandTotal}</span>
              </div>
              <div className="text-xs text-text-muted">Payment mode: {selectedOrder.paymentMode}</div>
            </div>

            {/* Preparation instructions */}
            {selectedOrder.preparationInstructions && (
              <div className="text-sm font-sans">
                <span className="font-bold text-text-main block mb-1">Preparation Instructions:</span>
                <span className="text-text-muted">{selectedOrder.preparationInstructions}</span>
              </div>
            )}

            {/* Customer Cancel Order Button (Shown for Pending, Accepted, On the Way) */}
            {["Pending", "Accepted", "On the Way"].includes(selectedOrder.status) && (
              <div className="pt-2 border-t border-border-main">
                <Button
                  variant="outline"
                  className="w-full h-11 border-red-500 text-red-600 hover:bg-red-50 font-bold"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel Order
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelReason("");
          setCustomCancelReason("");
        }}
        title="Cancel Order"
      >
        <div className="py-2 flex flex-col gap-4 font-sans text-text-main text-left">
          <div>
            <h3 className="text-lg font-serif font-bold text-forest mb-1">Why are you cancelling this order?</h3>
            <p className="text-xs text-text-muted font-sans">Please select a reason for cancelling your order.</p>
          </div>

          <div className="flex flex-col gap-2.5 my-1">
            {[
              "Ordered the wrong item",
              "Selected the wrong quantity",
              "Want to change my order",
              "Custom"
            ].map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${cancelReason === reason
                  ? "bg-forest/5 border-forest text-forest font-bold"
                  : "bg-white border-border-main hover:bg-cream/50 text-text-main"
                  }`}
              >
                <input
                  type="radio"
                  name="cancelReason"
                  value={reason}
                  checked={cancelReason === reason}
                  onChange={() => setCancelReason(reason)}
                  className="w-4 h-4 accent-forest"
                />
                <span className="text-sm font-sans">{reason === "Custom" ? "Other (write custom message)" : reason}</span>
              </label>
            ))}

            {cancelReason === "Custom" && (
              <textarea
                placeholder="Type custom message..."
                className="w-full bg-white border border-border-main rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent min-h-[80px] mt-1"
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
              />
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1 font-bold"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason("");
                setCustomCancelReason("");
              }}
            >
              Keep Order
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleCancelOrder}
              disabled={isCancelling || !cancelReason || (cancelReason === "Custom" && !customCancelReason.trim())}
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function OrderCard({ order, onClick }) {
  const isToday = new Date(order.createdAt).toDateString() === new Date().toDateString();
  const dateStr = isToday ? "Today" : new Date(order.createdAt).toLocaleDateString();

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border border-border-main flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="w-16 h-16 bg-border-main/20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
          {order.items?.[0]?.image ? (
            <img src={order.items[0].image} alt="Item" className="object-cover w-full h-full" />
          ) : (
            <span className="text-[10px] text-text-muted">No Img</span>
          )}
        </div>
        <div className="flex flex-col space-y-2 ">
          <span className="font-serif font-bold text-text-main text-lg">
            {order.items?.map(i => i.name).join(", ")}
          </span>
          <span className={`w-[165px] flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${order.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
            order.status === "Rejected" ? "bg-amber-100 text-amber-800" :
              order.status === "Cancelled" ? "bg-rose-100 text-rose-800" :
                "bg-blue-100 text-blue-800"
            }`}>
            {order.status} on {dateStr}
          </span>
        </div>
      </div>
      <div className="text-forest font-bold font-sans">₹{order.grandTotal}</div>
    </div>
  );
}

function TrackingFlowchart({ status, rejectReason, cancelReason, cancelledBy, customerName }) {
  if (status === "Rejected" || status === "Cancelled") {
    const reasonText = cancelReason || rejectReason || "No reason specified";
    const canceller = cancelledBy || customerName || "customer";
    return (
      <div className="flex flex-col gap-1 text-center">
        <span className="text-red-500 font-bold uppercase tracking-wider">{status}</span>
        {status === "Cancelled" ? (
          <span className="text-text-muted text-sm">Reason: {reasonText} (cancelled by {canceller})</span>
        ) : (
          reasonText && <span className="text-text-muted text-sm">Reason: {reasonText}</span>
        )}
      </div>
    );
  }

  const steps = ["Pending", "Accepted", "On the Way", "Delivered"];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-border-main" />
      {steps.map((step, idx) => {
        const isCompleted = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <div key={step} className="flex items-center gap-4 relative z-10">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-forest' : 'bg-ivory border-2 border-border-main'
              }`}>
              {isCompleted && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <span className={`font-sans font-bold ${isCurrent ? 'text-forest text-lg' : isCompleted ? 'text-text-main' : 'text-text-muted'}`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RatingSection({ isRated, existingRating, existingReview, onSubmit }) {
  const [rating, setRating] = useState(existingRating || 0);
  const [text, setText] = useState(existingReview || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isRated) {
    return (
      <div className="bg-ivory border border-border-main rounded-xl p-4">
        <h3 className="font-bold font-sans text-forest mb-1">Your Review & Rating</h3>
        <div className="flex items-center gap-1 text-gold mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              size={20}
              fill={star <= (existingRating || rating) ? "currentColor" : "none"}
              className={star <= (existingRating || rating) ? "text-gold" : "text-gray-300"}
            />
          ))}
        </div>
        {existingReview || text ? (
          <p className="text-sm text-text-main italic font-sans">"{existingReview || text}"</p>
        ) : (
          <p className="text-xs text-text-muted font-sans">Thanks for rating your order!</p>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(rating, text);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-ivory border border-border-main rounded-xl p-4">
      <h3 className="font-bold font-sans text-text-main mb-2">Rate your experience</h3>
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={28}
            className={`cursor-pointer transition-colors ${rating >= star ? 'text-gold fill-gold' : 'text-border-main'}`}
            onClick={() => setRating(star)}
          />
        ))}
      </div>
      <textarea
        placeholder="Write a review..."
        className="w-full bg-white border border-border-main rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent min-h-[80px] mb-3"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Button className="w-full h-10 text-sm" onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Feedback"}
      </Button>
    </div>
  );
}
