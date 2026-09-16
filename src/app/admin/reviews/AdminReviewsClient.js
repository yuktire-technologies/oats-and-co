"use client";

import React, { useState } from "react";
import { Star, MessageSquare, Trash2, Check, X, Phone, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function AdminReviewsClient({ initialReviews }) {
  const [reviews, setReviews] = useState(initialReviews || []);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "", // "accept" | "reject" | "delete"
    review: null,
  });

  const [visiblePendingCount, setVisiblePendingCount] = useState(10);
  const [isLoadingMorePending, setIsLoadingMorePending] = useState(false);

  const [visibleHistoryCount, setVisibleHistoryCount] = useState(10);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);

  const handleLoadMorePending = () => {
    setIsLoadingMorePending(true);
    setTimeout(() => {
      setVisiblePendingCount((prev) => prev + 10);
      setIsLoadingMorePending(false);
    }, 200);
  };

  const handleLoadMoreHistory = () => {
    setIsLoadingMoreHistory(true);
    setTimeout(() => {
      setVisibleHistoryCount((prev) => prev + 10);
      setIsLoadingMoreHistory(false);
    }, 200);
  };

  // Filter reviews into pending management vs history
  const pendingReviews = reviews.filter((r) => !r.status || r.status === "Pending");
  const historyReviews = reviews.filter((r) => r.status === "Accepted" || r.status === "Rejected");

  const handleUpdateStatus = async (reviewId, status) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
        );
      }
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch (e) {
      console.error("Failed to delete review", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    const { type, review } = confirmModal;
    if (!review) return;

    if (type === "accept") {
      await handleUpdateStatus(review.id, "Accepted");
    } else if (type === "reject") {
      await handleUpdateStatus(review.id, "Rejected");
    } else if (type === "delete") {
      await handleDeleteReview(review.id);
    }

    setConfirmModal({ isOpen: false, type: "", review: null });
  };

  return (
    <div className="flex flex-col gap-10 animate-fade-in font-sans">
      {/* SECTION 1: Manage Reviews */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border-main pb-3">
          <h2 className="text-xl font-serif font-bold text-forest flex items-center gap-2">
            <MessageSquare size={22} className="text-amber-500" /> Manage Reviews ({pendingReviews.length})
          </h2>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="bg-white border border-border-main rounded-2xl p-8 text-center text-text-muted shadow-sm">
            <p className="text-sm">No pending reviews requiring approval.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingReviews.slice(0, visiblePendingCount).map((review) => (
                <div key={review.id} className="bg-white border border-border-main rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    {/* Header: Order ID, Customer Name & Mobile */}
                    <div className="flex flex-col gap-2 border-b border-border-main pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-forest uppercase tracking-wider bg-forest/10 px-2.5 py-1 rounded-lg">
                          Order #{review.orderId?.startsWith("ORD-") ? review.orderId : review.orderId ? `ORD-${review.orderId}` : `ORD-${review.id?.slice(-4)}`}
                        </span>

                        {/* Star Rating */}
                        <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < (review.rating || 5) ? "text-amber-500 fill-amber-500" : "text-gray-300"}
                            />
                          ))}
                          <span className="text-xs font-bold text-amber-700 ml-1">({review.rating || 5}/5)</span>
                        </div>
                      </div>

                      <div className="flex flex-col mt-1">
                        <h4 className="font-bold text-text-main text-base">{review.customerName || "Customer"}</h4>
                        <span className="text-xs text-text-muted flex items-center gap-1 mt-0.5 font-medium">
                          <Phone size={12} className="text-forest shrink-0" /> {review.customerPhone || "Mobile not available"}
                        </span>
                      </div>
                    </div>

                    {/* Item info */}
                    {review.itemsSummary && (
                      <div className="text-xs text-text-main font-medium flex items-center gap-1.5 bg-ivory p-2.5 rounded-xl border border-border-main">
                        <ShoppingBag size={14} className="shrink-0 text-forest" />
                        <span className="truncate font-semibold">Item: {review.itemsSummary}</span>
                      </div>
                    )}

                    {/* Written Review */}
                    <div>
                      <span className="text-xs font-bold text-text-muted block mb-1">Written Review:</span>
                      <p className="text-sm text-text-main bg-cream/50 p-3 rounded-xl border border-border-main/50 italic">
                        "{review.comment || review.reviewText || "No written review provided."}"
                      </p>
                    </div>
                  </div>

                  {/* Actions: Accept & Reject */}
                  <div className="flex items-center gap-3 border-t border-border-main pt-3">
                    <Button
                      onClick={() => setConfirmModal({ isOpen: true, type: "accept", review })}
                      disabled={actionLoading === review.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-xs"
                    >
                      <Check size={16} /> Accept
                    </Button>
                    <Button
                      onClick={() => setConfirmModal({ isOpen: true, type: "reject", review })}
                      disabled={actionLoading === review.id}
                      variant="outline"
                      className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50 h-10 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl"
                    >
                      <X size={16} /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {visiblePendingCount < pendingReviews.length && (
              <div className="mt-2 text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMorePending}
                  disabled={isLoadingMorePending}
                  className="w-full sm:w-auto px-8 h-10 text-xs font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
                >
                  {isLoadingMorePending ? "Loading reviews..." : "Load More Pending Reviews"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* SECTION 2: Reviews History */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border-main pb-3">
          <h2 className="text-xl font-serif font-bold text-forest">Reviews History ({historyReviews.length})</h2>
        </div>

        {historyReviews.length === 0 ? (
          <div className="bg-white border border-border-main rounded-2xl p-8 text-center text-text-muted shadow-sm">
            <p className="text-sm">No review history available yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-border-main rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-ivory border-b border-border-main text-xs uppercase font-bold text-forest">
                      <th className="p-4 w-16">SL No</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Review</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main text-sm text-text-main">
                    {historyReviews.slice(0, visibleHistoryCount).map((review, idx) => (
                      <tr key={review.id} className="hover:bg-cream/30 transition-colors">
                        <td className="p-4 font-bold text-text-muted">{idx + 1}</td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-text-main">{review.customerName || "Customer"}</span>
                            {review.customerPhone && (
                              <span className="text-xs text-text-muted">{review.customerPhone}</span>
                            )}
                            <span className="text-[11px] text-forest font-semibold mt-0.5">
                              Order #{review.orderId || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 max-w-xs md:max-w-md">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={13}
                                  className={i < (review.rating || 5) ? "text-amber-500 fill-amber-500" : "text-gray-300"}
                                />
                              ))}
                              <span className="text-xs text-text-muted font-bold ml-1">({review.rating || 5}/5)</span>
                            </div>
                            <p className="text-xs italic text-text-muted truncate">
                              "{review.comment || review.reviewText || "No text review"}"
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${review.status === "Accepted"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                          >
                            {review.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, type: "delete", review })}
                            disabled={actionLoading === review.id}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Delete Review"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {visibleHistoryCount < historyReviews.length && (
              <div className="mt-2 text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMoreHistory}
                  disabled={isLoadingMoreHistory}
                  className="w-full sm:w-auto px-8 h-10 text-xs font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
                >
                  {isLoadingMoreHistory ? "Loading review history..." : "Load More History Reviews"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: "", review: null })}
        title={
          confirmModal.type === "accept"
            ? "Accept Review?"
            : confirmModal.type === "reject"
              ? "Reject Review?"
              : "Delete Review?"
        }
      >
        <div className="py-4 font-sans text-center">
          <p className="text-text-main text-base font-semibold mb-6">
            {confirmModal.type === "accept" && "Are you sure you want to accept this review?"}
            {confirmModal.type === "reject" && "Are you sure you want to reject this review?"}
            {confirmModal.type === "delete" && "Are you sure you want to permanently delete this review?"}
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm font-bold"
              onClick={() => setConfirmModal({ isOpen: false, type: "", review: null })}
            >
              No
            </Button>
            <Button
              className={`flex-1 h-11 text-sm font-bold text-white ${confirmModal.type === "accept"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
                }`}
              onClick={handleConfirmAction}
              disabled={!!actionLoading}
            >
              {actionLoading
                ? "Processing..."
                : confirmModal.type === "accept"
                  ? "Yes, Accept"
                  : confirmModal.type === "reject"
                    ? "Yes, Reject"
                    : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
