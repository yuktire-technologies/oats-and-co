"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Trash2 } from "lucide-react";

export default function AdminCouponsClient({ initialCoupons }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [limit, setLimit] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue),
          expiryDate: new Date(expiryDate).toISOString(),
          limit: parseInt(limit),
        }),
      });
      if (res.ok) window.location.reload();
      else alert("Failed to add coupon");
    } catch (error) {
      alert("Error saving coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/coupons/${deleteId}`, { method: "DELETE" });
      if (res.ok) window.location.reload();
    } catch (error) {
      alert("Error deleting coupon");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
      
      {/* Add Form */}
      <div className="w-full md:w-1/3 bg-white rounded-2xl p-6 shadow-sm border border-border-main h-fit">
        <h2 className="text-xl font-serif font-bold text-text-main mb-4">Add Coupon</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-bold text-text-main mb-1 block">Coupon Code</label>
            <Input placeholder="e.g. HEALTHY2026" required value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-bold text-text-main mb-1 block">Type</label>
              <select className="w-full bg-cream border border-border-main rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-forest" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                <option value="percentage">% Off</option>
                <option value="fixed">₹ Off</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold text-text-main mb-1 block">Value</label>
              <Input type="number" placeholder="20" required value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-text-main mb-1 block">Expiry Date</label>
            <Input type="date" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-bold text-text-main mb-1 block">Usage Limit</label>
            <Input type="number" placeholder="100" required value={limit} onChange={e => setLimit(e.target.value)} />
          </div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Coupon"}</Button>
        </form>
      </div>

      {/* List */}
      <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-border-main overflow-x-auto">
        <table className="w-full text-left font-sans text-sm">
          <thead>
            <tr className="border-b border-border-main text-text-muted">
              <th className="pb-3 font-semibold">SL No</th>
              <th className="pb-3 font-semibold">Code</th>
              <th className="pb-3 font-semibold">Discount</th>
              <th className="pb-3 font-semibold">Expiry</th>
              <th className="pb-3 font-semibold">Limit/Used</th>
              <th className="pb-3 font-semibold text-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon, idx) => {
              const totalLimit = coupon.initialLimit !== undefined ? coupon.initialLimit : (coupon.limit + (coupon.usedCount || 0));
              const used = coupon.usedCount || 0;
              return (
                <tr key={coupon.id} className="border-b border-border-main last:border-0 hover:bg-forest/5 transition-colors">
                  <td className="py-3">{idx + 1}</td>
                  <td className="py-3 font-bold text-forest">{coupon.code}</td>
                  <td className="py-3">{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}</td>
                  <td className="py-3">{coupon.expiryDate}</td>
                  <td className="py-3 font-bold">
                    <span className="text-forest">{totalLimit}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-amber-600">{used}</span>
                  </td>
                  <td className="py-3 text-center">
                    <button onClick={() => setDeleteId(coupon.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {coupons.length === 0 && <p className="text-text-muted text-center py-6">No coupons found.</p>}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Coupon">
        <div className="py-2">
          <p className="text-text-main font-sans mb-6">Are you sure you want to delete this Coupon?</p>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>No</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Yes, Delete</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
