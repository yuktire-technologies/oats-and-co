"use client";

import React, { useState } from "react";
import { Users, Phone, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function AdminCustomersClient({ initialCustomers }) {
  const [customers, setCustomers] = useState(() => initialCustomers || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, targetBlockedState: false });
  const [isUpdating, setIsUpdating] = useState(false);

  const [visibleCustomersCount, setVisibleCustomersCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  React.useEffect(() => {
    setVisibleCustomersCount(10);
  }, [searchTerm]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCustomersCount((prev) => prev + 10);
      setIsLoadingMore(false);
    }, 200);
  };

  React.useEffect(() => {
    setCustomers(initialCustomers || []);
  }, [initialCustomers]);

  const filteredCustomers = customers.filter(c =>
    (c.displayName && c.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phoneNumber && c.phoneNumber.includes(searchTerm))
  );

  const openConfirmModal = (customer) => {
    setConfirmModal({
      isOpen: true,
      customer,
      targetBlockedState: !customer.isBlocked
    });
  };

  const handleToggleBlock = async () => {
    const { customer, targetBlockedState } = confirmModal;
    if (!customer) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: targetBlockedState }),
      });

      if (res.ok) {
        setCustomers(prev =>
          prev.map(c => c.id === customer.id ? { ...c, isBlocked: targetBlockedState } : c)
        );
        setConfirmModal({ isOpen: false, customer: null, targetBlockedState: false });
      } else {
        alert("Failed to update customer status");
      }
    } catch (e) {
      alert("Failed to connect to server");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-border-main shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by name or phone..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm font-semibold text-text-muted">
          Total Registered: <span className="text-forest font-bold">{customers.length}</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-border-main rounded-2xl shadow-sm overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Users className="mx-auto mb-3 opacity-40" size={40} />
            <p>No customers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-ivory border-b border-border-main text-forest font-bold text-xs uppercase">
                <tr>
                  <th className="py-3.5 px-4 w-16">SL No</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-center">Date of Joined</th>
                  <th className="py-3.5 px-4 text-center">Pending/Accepted/On the way</th>
                  <th className="py-3.5 px-4 text-center">Delivered</th>

                  <th className="py-3.5 px-4 text-center">Rejected</th>
                  <th className="py-3.5 px-4 text-center">Cancelled</th>
                  <th className="py-3.5 px-4 text-center">Total Orders</th>
                  <th className="py-3.5 px-4 text-center w-32">Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main font-medium text-text-main">
                {filteredCustomers.slice(0, visibleCustomersCount).map((customer, idx) => (
                  <tr key={customer.id} className="hover:bg-cream/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-text-muted">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-main text-base">
                          {customer.displayName || "Customer"}
                        </span>
                        <span className="text-xs font-mono text-forest flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {customer.phoneNumber || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-text-muted">
                      {customer.createdAt
                        ? `${new Date(customer.createdAt).toLocaleDateString()}, ${new Date(
                          customer.createdAt
                        ).toLocaleTimeString()}`
                        : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-blue-600">
                      {customer.pending ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-emerald-600">
                      {customer.delivered ?? 0}
                    </td>

                    <td className="py-3.5 px-4 text-center font-extrabold text-rose-600">
                      {customer.rejected ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-amber-600">
                      {customer.cancelled ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-forest text-base">
                      {customer.totalOrders ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {customer.isBlocked ? (
                        <Button
                          onClick={() => openConfirmModal(customer)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <ShieldCheck size={14} /> Unblock
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openConfirmModal(customer)}
                          variant="outline"
                          className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <ShieldAlert size={14} /> Block
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {visibleCustomersCount < filteredCustomers.length && (
        <div className="mt-2 text-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full sm:w-auto px-8 h-10 text-xs font-bold border-forest text-forest hover:bg-forest hover:text-white transition-colors"
          >
            {isLoadingMore ? "Loading customers..." : "Load More Customers"}
          </Button>
        </div>
      )}

      {/* Confirmation Modal Box */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, customer: null, targetBlockedState: false })}
        title={confirmModal.targetBlockedState ? "Block Customer?" : "Unblock Customer?"}
      >
        <div className="py-4 font-sans text-center">
          <p className="text-text-main text-base font-semibold mb-6">
            Are you Sure you want to {confirmModal.targetBlockedState ? "Block" : "Unblock"} this customer?
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm font-bold"
              onClick={() => setConfirmModal({ isOpen: false, customer: null, targetBlockedState: false })}
            >
              No
            </Button>
            <Button
              className={`flex-1 h-11 text-sm font-bold text-white ${confirmModal.targetBlockedState ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              onClick={handleToggleBlock}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Yes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
