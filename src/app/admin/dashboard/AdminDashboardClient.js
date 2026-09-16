"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  Ban,
  ShoppingBag,
  Banknote,
  Calendar,
  Filter,
  DollarSign,
  IndianRupee,
  Phone,
  MapPin,
  Clock,
  Copy,
  Check
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function AdminDashboardClient({ initialOrders = [], initialCustomersCount = 0 }) {
  const [quickFilter, setQuickFilter] = useState("today"); // Default filter is 'today'
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [copiedMapUrl, setCopiedMapUrl] = useState(false);

  const handleCopyMapUrl = (url, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedMapUrl(true);
      setTimeout(() => setCopiedMapUrl(false), 2000);
    }
  };

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: "", orderId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");

  const [visibleOrdersCount, setVisibleOrdersCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  React.useEffect(() => {
    setVisibleOrdersCount(10);
  }, [quickFilter, fromDate, toDate]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleOrdersCount((prev) => prev + 10);
      setIsLoadingMore(false);
    }, 200);
  };

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extraData }),
      });
      window.location.reload();
    } catch (error) {
      window.location.reload();
    }
  };

  const handleAction = (type, orderId) => {
    setActionModal({ isOpen: true, type, orderId });
  };

  const confirmAction = () => {
    const { type, orderId } = actionModal;

    if (type === "accept") updateOrderStatus(orderId, "Accepted");
    else if (type === "start") updateOrderStatus(orderId, "On the Way");
    else if (type === "deliver") updateOrderStatus(orderId, "Delivered");
    else if (type === "reject") {
      const reason = (rejectReason === "Other (write custom message)" || rejectReason === "Custom") ? customRejectReason : rejectReason;
      if (!reason) return alert("Please select a reason");
      updateOrderStatus(orderId, "Rejected", { rejectReason: reason });
    }

    setActionModal({ isOpen: false, type: "", orderId: null });
  };

  // Handle Quick Filter click
  const handleQuickFilterClick = (filterType) => {
    setQuickFilter(filterType);
    setFromDate("");
    setToDate("");
  };

  // Filter orders based on date range
  const filteredOrders = useMemo(() => {
    if (!isMounted) {
      return initialOrders;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return initialOrders.filter((order) => {
      if (!order.createdAt) return true;
      const orderDate = new Date(order.createdAt);

      if (quickFilter === "today") {
        return orderDate >= todayStart && orderDate <= todayEnd;
      }

      if (quickFilter === "yesterday") {
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayEnd);
        yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
        return orderDate >= yesterdayStart && orderDate <= yesterdayEnd;
      }

      if (quickFilter === "7days") {
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDate >= sevenDaysAgo && orderDate <= todayEnd;
      }

      if (quickFilter === "30days") {
        const thirtyDaysAgo = new Date(todayStart);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderDate >= thirtyDaysAgo && orderDate <= todayEnd;
      }

      if (fromDate || toDate) {
        const from = fromDate ? new Date(fromDate + "T00:00:00") : new Date("1970-01-01");
        const to = toDate ? new Date(toDate + "T23:59:59") : new Date("2099-12-31");
        return orderDate >= from && orderDate <= to;
      }

      return true;
    });
  }, [initialOrders, quickFilter, fromDate, toDate, isMounted]);

  // Compute Metrics
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let deliveredCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;
    let codRevenue = 0;

    filteredOrders.forEach((order) => {
      const status = (order.status || "").trim().toLowerCase();
      const amount = Number(order.grandTotal ?? order.total ?? order.itemTotal ?? 0);

      if (status === "delivered" || status.includes("deliver")) {
        deliveredCount += 1;
        codRevenue += amount;
      } else if (status === "rejected" || status.includes("reject")) {
        rejectedCount += 1;
      } else if (status === "cancelled" || status === "canceled" || status.includes("cancel")) {
        cancelledCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    const totalOrdersCount = pendingCount + deliveredCount + rejectedCount + cancelledCount;
    const totalPayments = codRevenue; // Same as Cash on Delivery

    return {
      pendingCount,
      deliveredCount,
      rejectedCount,
      cancelledCount,
      totalOrdersCount,
      codRevenue,
      totalPayments,
    };
  }, [filteredOrders]);

  return (
    <div className="flex flex-col gap-8 animate-fade-in font-sans">
      {/* Date Filters & Quick Filter Buttons */}
      <div className="bg-white border border-border-main rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/*  <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter size={14} /> Filters:
          </span> */}
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "7days", label: "Last 7 days" },
            { id: "30days", label: "Last 30 days" },
            // { id: "all", label: "All Time" }, 
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleQuickFilterClick(btn.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${quickFilter === btn.id && !fromDate && !toDate
                ? "bg-forest text-white shadow-xs"
                : "bg-cream text-forest hover:bg-forest/10 border border-border-main"
                }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* From Date & To Date Inputs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <label className="text-xs font-bold text-text-muted whitespace-nowrap">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
              }}
              className="bg-cream border border-border-main rounded-xl px-3 py-1.5 text-xs font-sans text-text-main focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <label className="text-xs font-bold text-text-muted whitespace-nowrap">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
              }}
              className="bg-cream border border-border-main rounded-xl px-3 py-1.5 text-xs font-sans text-text-main focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </div>
          <Button
            className="h-8 text-xs py-0 px-3 bg-forest hover:bg-forest/90 text-white font-bold gap-1 shadow-xs"
            onClick={() => setQuickFilter("custom")}
          >
            <CheckCircle size={14} /> Check
          </Button>
          {(fromDate || toDate) && (
            <Button
              variant="outline"
              className="h-8 text-xs py-0 px-3 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setQuickFilter("all");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders Section */}
      <div>
        <h2 className="text-xl font-serif font-bold text-forest mb-4 flex items-center gap-2">
          <ShoppingBag size={22} /> Orders Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl border bg-sky-50/80 border-sky-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">Pending/Accepted/On the way</p>
              <h3 className="text-3xl font-sans font-extrabold text-sky-950 tracking-tight">{metrics.pendingCount}</h3>
              <p className="text-[11px] text-sky-700 mt-1 font-medium">Pending + Accepted + On the way</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white shadow-xs text-sky-600 border border-sky-100">
              <Clock size={26} />
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-emerald-50/80 border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Delivered</p>
              <h3 className="text-3xl font-sans font-extrabold text-emerald-950 tracking-tight">{metrics.deliveredCount}</h3>
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">Successfully delivered</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white shadow-xs text-emerald-600 border border-emerald-100">
              <CheckCircle size={26} />
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-amber-50/80 border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Rejected</p>
              <h3 className="text-3xl font-sans font-extrabold text-amber-950 tracking-tight">{metrics.rejectedCount}</h3>
              <p className="text-[11px] text-amber-700 mt-1 font-medium">Rejected by admin</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white shadow-xs text-amber-600 border border-amber-100">
              <XCircle size={26} />
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-rose-50/80 border-rose-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">Cancelled</p>
              <h3 className="text-3xl font-sans font-extrabold text-rose-950 tracking-tight">{metrics.cancelledCount}</h3>
              <p className="text-[11px] text-rose-700 mt-1 font-medium">Cancelled by customer</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white shadow-xs text-rose-600 border border-rose-100">
              <Ban size={26} />
            </div>
          </div>

          <div className="p-5 rounded-2xl border bg-indigo-50/80 border-indigo-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Total Orders</p>
              <h3 className="text-3xl font-sans font-extrabold text-indigo-950 tracking-tight">{metrics.totalOrdersCount}</h3>
              <p className="text-[11px] text-indigo-700 mt-1 font-medium">Total orders placed</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white shadow-xs text-indigo-600 border border-indigo-100">
              <ShoppingBag size={26} />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Section */}
      <div>
        <h2 className="text-xl font-serif font-bold text-forest mb-4 flex items-center gap-2">
          <Banknote size={22} /> Revenue Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* <div className="p-5 rounded-2xl border bg-white border-border-main shadow-sm flex items-center justify-between">
            } <div>
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Cash on Delivery</p>
              <h3 className="text-3xl font-sans font-extrabold text-forest tracking-tight flex items-baseline gap-0.5">
                <span className="text-2xl font-bold opacity-90">₹</span>
                <span>{metrics.codRevenue.toLocaleString()}</span>
              </h3>
              <p className="text-xs text-text-muted mt-1 font-medium">Revenue from delivered COD orders</p>
            </div> 
            <div className="p-3.5 rounded-xl bg-ivory shadow-xs text-forest border border-border-main">
              <Banknote size={28} />
            </div>
          </div> */}

          <div className="p-5 rounded-2xl border bg-emerald-50/80 border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Total Payments</p>
              <h3 className="text-3xl font-sans font-extrabold text-emerald-950 tracking-tight flex items-baseline gap-0.5">
                <span className="text-2xl font-bold opacity-90">₹</span>
                <span>{metrics.totalPayments.toLocaleString()}</span>
              </h3>
              <p className="text-xs text-emerald-700 mt-1 font-medium">Total received revenue</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white shadow-xs text-emerald-700 border border-emerald-200">
              <IndianRupee size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Orders List */}
      <div className="bg-white border border-border-main rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-bold text-forest">
            Orders ({filteredOrders.length})
          </h3>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-text-muted font-medium">
            No orders found for the selected date range filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-cream border-b border-border-main text-text-muted font-bold text-xs uppercase">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main font-medium">
                {filteredOrders.slice(0, visibleOrdersCount).map((order) => (
                  <tr key={order.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-forest">
                      #{order.orderId || order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">{order.customerName} {order.customerPhone}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-text-muted">
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-text-main">
                      ₹{order.grandTotal}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${order.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "Rejected" ? "bg-amber-100 text-amber-800" :
                          order.status === "Cancelled" ? "bg-rose-100 text-rose-800" :
                            "bg-blue-100 text-blue-800"
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-3 font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visibleOrdersCount < filteredOrders.length && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full sm:w-auto px-8 h-10 text-xs font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
            >
              {isLoadingMore ? "Loading orders..." : "Load More Orders"}
            </Button>
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: "", orderId: null })}
        zIndex={100}
        title={
          actionModal.type === "accept" ? "Accept Order" :
            actionModal.type === "start" ? "Start Order?" :
              actionModal.type === "deliver" ? "Complete Delivery" : "Reject Order"
        }
      >
        <div className="py-2 flex flex-col gap-4 font-sans text-text-main">
          {actionModal.type === "accept" && (
            <p className="text-base font-semibold text-text-main">Are you sure you want to accept this order?</p>
          )}

          {actionModal.type === "start" && (
            <p className="text-base font-semibold text-text-main">Do you want to start processing and delivering this order?</p>
          )}

          {actionModal.type === "deliver" && (
            <p className="text-base font-semibold text-text-main">Is delivery completed? (Don't forget to collect Cash on Delivery if applicable)</p>
          )}

          {actionModal.type === "reject" && (
            <div className="flex flex-col gap-3">
              <label className="font-bold text-text-main">Select Reason to Reject:</label>
              {[
                "Item unavailable",
                "Delivery unavailable",
                "Delivery Closed",
                "Not lifting phone",
                "Wrong address",
                "Other (write custom message)"
              ].map(reason => (
                <label key={reason} className="flex items-center gap-2.5 cursor-pointer text-sm font-sans">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={() => setRejectReason(reason)}
                    className="w-4 h-4 accent-forest"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {(rejectReason === "Other (write custom message)" || rejectReason === "Custom") && (
                <textarea
                  placeholder="Type custom message..."
                  className="w-full border border-border-main rounded-xl p-3 focus:outline-none focus:border-forest text-sm font-sans mt-1"
                  value={customRejectReason}
                  onChange={e => setCustomRejectReason(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="flex gap-4 mt-4">
            <Button
              variant="outline"
              className="flex-1 font-bold"
              onClick={() => setActionModal({ isOpen: false, type: "", orderId: null })}
            >
              No
            </Button>

            {actionModal.type === "accept" && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={confirmAction}
              >
                Accept
              </Button>
            )}

            {actionModal.type === "reject" && (
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={confirmAction}
                disabled={!rejectReason || ((rejectReason === "Other (write custom message)" || rejectReason === "Custom") && !customRejectReason.trim())}
              >
                Reject
              </Button>
            )}

            {actionModal.type !== "accept" && actionModal.type !== "reject" && (
              <Button
                className="flex-1 bg-forest hover:bg-green text-white font-bold"
                onClick={confirmAction}
              >
                Yes
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Detailed Order View Modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order ${selectedOrder?.orderId || selectedOrder?.id?.slice(-6)?.toUpperCase()}`} isBottomSheet={false}>
        {selectedOrder && (
          <div className="flex flex-col gap-6 py-2 font-sans">
            <div className="grid grid-cols-2 gap-4 text-sm font-sans">
              <div>
                <span className="text-text-muted block">Date & Time</span>
                <span className="font-bold">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className={`w-[100px] flex items-center justify-center px-2.5 py-2 rounded-full text-xs font-bold ${selectedOrder.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
                  selectedOrder.status === "Rejected" ? "bg-amber-100 text-amber-800" :
                    selectedOrder.status === "Cancelled" ? "bg-rose-100 text-rose-800" :
                      "bg-blue-100 text-blue-800"
                  }`}>
                  {selectedOrder.status}
                </span>
                {selectedOrder.status === 'Rejected' && (
                  <div className="text-xs text-text-muted mt-1">Reason: {selectedOrder.rejectReason || "No reason"}</div>
                )}
                {selectedOrder.status === 'Cancelled' && (
                  <div className="text-xs text-text-muted mt-1">
                    Reason: {selectedOrder.cancelReason || selectedOrder.rejectReason || "No reason"} (cancelled by {selectedOrder.cancelledBy || selectedOrder.customerName || "customer"})
                  </div>
                )}
              </div>
              <div className="col-span-2 bg-ivory p-3 rounded-lg border border-border-main">
                <h4 className="font-bold mb-1">Customer Details</h4>
                <p>{selectedOrder.customerName}</p>
                <p className="flex items-center gap-2">{selectedOrder.customerPhone} <a href={`tel:${selectedOrder.customerPhone}`}><Phone size={14} className="text-forest" /></a></p>
                <p>{selectedOrder.address}</p>
              </div>
            </div>

            <div className="border border-border-main rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-ivory text-text-muted">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={idx} className="border-t border-border-main">
                      <td className="p-2 font-bold">{item.name}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">₹{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-1 text-sm font-sans font-bold text-right border-t border-border-main pt-4">
              <div>Item Total: ₹{selectedOrder.itemTotal ?? selectedOrder.grandTotal}</div>
              {selectedOrder.discountAmount > 0 && <div className="text-green">Coupon: -₹{selectedOrder.discountAmount}</div>}
              <div className="text-lg text-forest mt-1">Grand Total: ₹{selectedOrder.grandTotal}</div>
            </div>

            {/* Admin Action Buttons in Modal for Pending, Accepted, On the Way */}
            <div className="flex flex-col gap-3 mt-4">
              {selectedOrder.status === "Pending" && (
                <>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleAction("accept", selectedOrder.id)}>Accept</Button>
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => handleAction("reject", selectedOrder.id)}>Reject</Button>
                </>
              )}
              {selectedOrder.status === "Accepted" && (
                <>
                  <Button className="w-full bg-forest text-white font-bold" onClick={() => handleAction("start", selectedOrder.id)}>Start</Button>
                  <Button variant="outline" className="w-full text-red-600 border-red-600 font-bold" onClick={() => handleAction("reject", selectedOrder.id)}>Reject</Button>
                </>
              )}
              {selectedOrder.status === "On the Way" && (
                <>
                  <Button className="w-full bg-forest text-white font-bold" onClick={() => handleAction("deliver", selectedOrder.id)}>Order Delivered</Button>
                  {(() => {
                    const mapUrl = (selectedOrder.lat && selectedOrder.lng)
                      ? `https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.lat},${selectedOrder.lng}`
                      : selectedOrder.address
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.address)}`
                        : null;

                    if (!mapUrl) return null;

                    return (
                      <div className="flex items-center gap-2 w-full">
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full gap-2 text-forest border-forest font-bold">
                            <MapPin size={18} /> Live Map
                          </Button>
                        </a>
                        <Button
                          variant="outline"
                          className="px-3 h-10 border-forest text-forest hover:bg-forest/10 shrink-0 font-bold"
                          title="Copy Maps URL"
                          onClick={(e) => handleCopyMapUrl(mapUrl, e)}
                        >
                          {copiedMapUrl ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                        </Button>
                      </div>
                    );
                  })()}
                  <Button variant="outline" className="w-full text-red-600 border-red-600 font-bold" onClick={() => handleAction("reject", selectedOrder.id)}>Reject</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
