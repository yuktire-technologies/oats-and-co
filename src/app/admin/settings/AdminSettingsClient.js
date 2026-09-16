"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

function parse24To12(time24Str) {
  if (!time24Str) return { hour: "07", minute: "00", ampm: "AM" };
  const parts = String(time24Str).split(":");
  let h = parseInt(parts[0] || "7", 10);
  let m = parseInt(parts[1] || "0", 10);
  if (isNaN(h)) h = 7;
  if (isNaN(m)) m = 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return {
    hour: String(h12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    ampm: ampm
  };
}

function format12To24(hour12, minute, ampm) {
  let h = parseInt(hour12 || "12", 10);
  let m = parseInt(minute || "00", 10);
  if (isNaN(h)) h = 12;
  if (isNaN(m)) m = 0;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function TimePicker12({ value, onChange, label }) {
  const { hour, minute, ampm } = parse24To12(value);

  const handleHourChange = (newHour) => {
    const val24 = format12To24(newHour, minute, ampm);
    onChange(val24);
  };

  const handleMinuteChange = (newMinute) => {
    const val24 = format12To24(hour, newMinute, ampm);
    onChange(val24);
  };

  const handleAmpmChange = (newAmpm) => {
    const val24 = format12To24(hour, minute, newAmpm);
    onChange(val24);
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <label className="text-sm font-bold text-text-main flex items-center gap-1.5">
        <Clock size={16} className="text-forest" /> {label}
      </label>
      <div className="flex items-center gap-2 bg-cream p-2.5 rounded-xl border border-border-main">
        {/* Hour Select */}
        <select
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
          className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-sm font-sans font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-forest cursor-pointer"
        >
          {hoursList.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <span className="font-bold text-text-main text-base">:</span>

        {/* Minute Select */}
        <select
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-sm font-sans font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-forest cursor-pointer"
        >
          {minutesList.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* AM / PM Selector Toggle */}
        <div className="flex items-center bg-white p-0.5 rounded-lg border border-border-main ml-auto">
          <button
            type="button"
            onClick={() => handleAmpmChange("AM")}
            className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all ${ampm === "AM" ? "bg-forest text-white shadow-xs" : "text-text-muted hover:text-text-main"
              }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleAmpmChange("PM")}
            className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all ${ampm === "PM" ? "bg-forest text-white shadow-xs" : "text-text-muted hover:text-text-main"
              }`}
          >
            PM
          </button>
        </div>
      </div>
      <span className="text-xs text-text-muted font-medium pl-1">
        Formatted: <strong className="text-forest font-bold">{parseInt(hour, 10)}:{minute} {ampm}</strong>
      </span>
    </div>
  );
}

export default function AdminSettingsClient({ initialSettings }) {
  const [openTime, setOpenTime] = useState(initialSettings.openTime || "07:00");
  const [closeTime, setCloseTime] = useState(initialSettings.closeTime || "22:00");

  const [statusOption, setStatusOption] = useState(initialSettings.status || "Open");
  const [customStatus, setCustomStatus] = useState(
    !["Open", "Delivery Closed Today", "Delivery Unavailable"].includes(initialSettings.status)
      ? initialSettings.status
      : ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openTime,
          closeTime,
          status: statusOption === "Custom" ? "Custom Message" : statusOption,
          customMessage: statusOption === "Custom" ? customStatus : "",
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setErrorMessage("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setStatusOption("Open");
    setCustomStatus("");
    setSuccessMessage("");
    setErrorMessage("");
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-border-main flex flex-col gap-6 animate-fade-in font-sans">

      {/* Top Success / Error Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl font-sans font-bold text-sm flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-700 hover:text-emerald-950 font-extrabold text-base leading-none">
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-xl font-sans font-bold text-sm flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-rose-700 hover:text-rose-950 font-extrabold text-base leading-none">
            ×
          </button>
        </div>
      )}

      <div>
        <h3 className="font-serif font-bold text-xl text-text-main mb-4">Delivery Timings</h3>
        <div className="flex flex-col sm:flex-row gap-5">
          <TimePicker12 label="Open Time" value={openTime} onChange={setOpenTime} />
          <TimePicker12 label="Close Time" value={closeTime} onChange={setCloseTime} />
        </div>
      </div>

      <div className="border-t border-border-main pt-6">
        <h3 className="font-serif font-bold text-xl text-text-main mb-4">Delivery Status Overrides</h3>

        <div className="flex flex-col gap-3 font-sans">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="status" value="Open" checked={statusOption === "Open"} onChange={e => setStatusOption(e.target.value)} className="accent-forest" />
            Normal (Open during timings)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="status" value="Delivery Closed Today" checked={statusOption === "Delivery Closed Today"} onChange={e => setStatusOption(e.target.value)} className="accent-forest" />
            Delivery Closed Today
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="status" value="Delivery Unavailable" checked={statusOption === "Delivery Unavailable"} onChange={e => setStatusOption(e.target.value)} className="accent-forest" />
            Delivery Unavailable
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="status" value="Custom" checked={statusOption === "Custom"} onChange={e => setStatusOption(e.target.value)} className="accent-forest" />
            Custom Message
          </label>

          {statusOption === "Custom" && (
            <div className="mt-2 pl-6">
              <Input placeholder="Type your own message..." value={customStatus} onChange={e => setCustomStatus(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-4 pt-6 border-t border-border-main">
        {/*} <Button variant="outline" className="flex-1 font-bold" onClick={handleClear}>Clear Override</Button> */}
        <Button className="flex-1 font-bold" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Settings"}</Button>
      </div>

    </div>
  );
}
