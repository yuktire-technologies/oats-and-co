"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Phone, MapPin, X, IndianRupee, Copy, Check } from "lucide-react";

export default function AdminOrdersClient({ initialPending, initialHistory }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingOrders, setPendingOrders] = useState(initialPending);
  const [historyOrders, setHistoryOrders] = useState(initialHistory);
  const [selectedOrder, setSelectedOrder] = useState(null);
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



  // Modals state
  const [actionModal, setActionModal] = useState({ isOpen: false, type: "", orderId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extraData }),
      });

      window.location.reload();
    } catch (error) {
      window.location.reload();
    }
  };

  const handleAction = (type, orderId, orderObj = null) => {
    const targetOrder = orderObj || selectedOrder || pendingOrders.find(o => o.id === orderId) || historyOrders.find(o => o.id === orderId);
    setActionModal({ isOpen: true, type, orderId, order: targetOrder });
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

    setActionModal({ isOpen: false, type: "", orderId: null, order: null });
  };

  const renderOrderCard = (order) => (
    <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border-main flex flex-col gap-4 relative animate-fade-in">
      <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center flex-wrap gap-2">
          <span className="bg-forest/10 text-forest px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0">{order.orderId}</span>
          <span className="font-bold text-sm text-text-muted shrink-0">{order.status}</span>
        </div>
        <div className="font-bold font-sans text-forest text-xl shrink-0">₹{order.grandTotal}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-sans text-text-main">
        <div><span className="text-text-muted">Customer:</span> {order.customerName}</div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Mobile:</span> {order.customerPhone}
          <a href={`tel:${order.customerPhone}`} className="text-forest hover:bg-forest/10 p-1 rounded-full" title="Call">
            <Phone size={16} />
          </a>
        </div>
        <div className="sm:col-span-2"><span className="text-text-muted">Address:</span> {order.address}</div>
        <div className="sm:col-span-2"><span className="text-text-muted">Payment Mode:</span> <span className="font-bold">{order.paymentMode}</span></div>
      </div>

      <div className="text-sm font-sans">
        <span className="text-text-muted">Items:</span> {order.items?.map(i => `${i.name} x${i.quantity}`).join(", ")}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2 border-t border-border-main pt-4">
        <Button variant="outline" className="w-full sm:flex-1" onClick={() => setSelectedOrder(order)}>View Details</Button>
        {order.status === "Pending" && (
          <div className="flex gap-2 sm:gap-3 w-full sm:flex-[2]">
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleAction("reject", order.id)}>Reject</Button>
            <Button className="flex-1 bg-green hover:bg-forest text-white" onClick={() => handleAction("accept", order.id)}>Accept</Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-border-main/20 rounded-xl w-fit">
        <button
          className={`px-6 py-2 rounded-lg font-bold font-sans transition-colors ${activeTab === 'pending' ? 'bg-white shadow-sm text-forest' : 'text-text-muted hover:text-text-main'}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Orders ({pendingOrders.length})
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-bold font-sans transition-colors ${activeTab === 'history' ? 'bg-white shadow-sm text-forest' : 'text-text-muted hover:text-text-main'}`}
          onClick={() => setActiveTab("history")}
        >
          Orders History
        </button>
      </div>

      {/* Lists */}
      {activeTab === "pending" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingOrders.slice(0, visiblePendingCount).map(renderOrderCard)}
            {pendingOrders.length === 0 && <p className="text-text-muted col-span-full">No pending orders.</p>}
          </div>

          {visiblePendingCount < pendingOrders.length && (
            <div className="mt-2 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMorePending}
                disabled={isLoadingMorePending}
                className="w-full sm:w-auto px-8 h-10 text-xs font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
              >
                {isLoadingMorePending ? "Loading pending orders..." : "Load More Pending Orders"}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-border-main p-4">
            <table className="w-full text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-border-main text-text-muted">
                  <th className="p-3 font-semibold">SL No</th>
                  <th className="p-3 font-semibold">Order No</th>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyOrders.slice(0, visibleHistoryCount).map((order, idx) => (
                  <tr key={order.id} className="border-b border-border-main hover:bg-forest/5 cursor-pointer transition-colors" onClick={() => setSelectedOrder(order)}>
                    <td className="p-3">{idx + 1}</td>
                    <td className="p-3 font-bold text-forest">{order.orderId}</td>
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3">
                      <span className={`w-[100px] flex items-center justify-center px-2.5 py-2 rounded-full text-xs font-bold ${order.status === "Delivered" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "Rejected" ? "bg-amber-100 text-amber-800" :
                          order.status === "Cancelled" ? "bg-rose-100 text-rose-800" :
                            "bg-blue-100 text-blue-800"
                        }`}>
                        {order.status}
                      </span>
                      {order.status === 'Rejected' && (
                        <div className="text-xs text-text-muted">Reason: {order.rejectReason || "No reason"}</div>
                      )}
                      {order.status === 'Cancelled' && (
                        <div className="text-xs text-text-muted">
                          Reason: {order.cancelReason || order.rejectReason || "No reason"} (cancelled by {order.cancelledBy || order.customerName || "customer"})
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historyOrders.length === 0 && <p className="text-text-muted text-center py-6">No order history.</p>}
          </div>

          {visibleHistoryCount < historyOrders.length && (
            <div className="mt-2 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMoreHistory}
                disabled={isLoadingMoreHistory}
                className="w-full sm:w-auto px-8 h-10 text-xs font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
              >
                {isLoadingMoreHistory ? "Loading completed orders..." : "Load More Completed Orders"}
              </Button>
            </div>
          )}
        </div>
      )}

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
            <p className="text-base font-semibold text-text-main flex items-center gap-1 flex-wrap">
              {(!actionModal.order?.paymentMode ||
                actionModal.order?.paymentMode.toLowerCase().includes("cash") ||
                actionModal.order?.paymentMode.toLowerCase().includes("cod")) ? (
                <span className="flex items-center gap-1">
                  Collect <IndianRupee size={18} className="inline text-forest font-bold" />{actionModal.order?.grandTotal} from customer.
                </span>
              ) : (
                <span>Is delivery completed?</span>
              )}
            </p>
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
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order ${selectedOrder?.orderId}`} isBottomSheet={false}>
        {selectedOrder && (
          <div className="flex flex-col gap-6 py-2">
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
                  <div className="text-xs text-text-muted">Reason: {selectedOrder.rejectReason || "No reason"}</div>
                )}
                {selectedOrder.status === 'Cancelled' && (
                  <div className="text-xs text-text-muted">
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
              <div>Item Total: ₹{selectedOrder.itemTotal}</div>
              {selectedOrder.discountAmount > 0 && <div className="text-green">Coupon: -₹{selectedOrder.discountAmount}</div>}
              <div className="text-lg text-forest mt-1">Grand Total: ₹{selectedOrder.grandTotal}</div>
            </div>

            {/* Admin Action Buttons in Modal */}
            <div className="flex flex-col gap-3 mt-4">
              {selectedOrder.status === "Pending" && (
                <>
                  <Button className="w-full bg-green text-white" onClick={() => handleAction("accept", selectedOrder.id)}>Accept</Button>
                  <Button className="w-full bg-red-600 text-white" onClick={() => handleAction("reject", selectedOrder.id)}>Reject</Button>
                </>
              )}
              {selectedOrder.status === "Accepted" && (
                <>
                  <Button className="w-full bg-forest text-white" onClick={() => handleAction("start", selectedOrder.id)}>Start</Button>
                  <Button variant="outline" className="w-full text-red-600 border-red-600" onClick={() => handleAction("reject", selectedOrder.id)}>Reject</Button>
                </>
              )}
              {selectedOrder.status === "On the Way" && (
                <>
                  <Button className="w-full bg-forest text-white" onClick={() => handleAction("deliver", selectedOrder.id)}>Delivery Completed</Button>
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
                  <Button variant="outline" className="w-full text-red-600 border-red-600" onClick={() => handleAction("reject", selectedOrder.id)}>Reject</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
