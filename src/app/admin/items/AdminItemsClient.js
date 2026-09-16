"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pencil, Plus, Image as ImageIcon } from "lucide-react";

export default function AdminItemsClient({ initialItems = [], initialAddons = [] }) {
  const [items, setItems] = useState(initialItems);
  const [addons, setAddons] = useState(initialAddons);

  // Menu Item Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Menu Item Form State
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [quantityLabel, setQuantityLabel] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add-on Form & Modal State
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [addonName, setAddonName] = useState("");
  const [addonDescription, setAddonDescription] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [addonIsAvailable, setAddonIsAvailable] = useState(true);
  const [addonImageFile, setAddonImageFile] = useState(null);
  const [addonExistingImage, setAddonExistingImage] = useState("");
  const [isAddonSubmitting, setIsAddonSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setIngredients("");
    setPrice("");
    setQuantityLabel("");
    setNutrition("");
    setIsAvailable(true);
    setImageFile(null);
    setExistingImage("");
    setEditingItem(null);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setName(item.name || "");
    setIngredients(item.ingredients || "");
    setPrice(item.price?.toString() || "");
    setQuantityLabel(item.quantityLabel || "");
    setNutrition(item.nutrition || "");
    setIsAvailable(item.isAvailable ?? true);
    setExistingImage(item.image || "");
    setIsFormOpen(true);
  };

  const openAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openAddAddonModal = () => {
    setEditingAddon(null);
    setAddonName("");
    setAddonDescription("");
    setAddonPrice("");
    setAddonIsAvailable(true);
    setAddonExistingImage("");
    setAddonImageFile(null);
    setIsAddonModalOpen(true);
  };

  const openEditAddonModal = (addon) => {
    setEditingAddon(addon);
    setAddonName(addon.name || "");
    setAddonDescription(addon.description || "");
    setAddonPrice(addon.price?.toString() || "");
    setAddonIsAvailable(addon.isAvailable ?? true);
    setAddonExistingImage(addon.image || "");
    setAddonImageFile(null);
    setIsAddonModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = existingImage;

      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append("file", imageFile);
          
          const uploadRes = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
          } else {
            imageUrl = URL.createObjectURL(imageFile);
          }
        } catch (upErr) {
          imageUrl = URL.createObjectURL(imageFile);
        }
      }

      const itemData = {
        name,
        ingredients,
        price: parseFloat(price),
        quantityLabel,
        nutrition,
        isAvailable: Boolean(isAvailable),
        image: imageUrl,
      };

      const res = await fetch(`/api/admin/items${editingItem ? `/${editingItem.id}` : ''}`, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Failed to save item");
      }
      
      const newItem = {
        id: editingItem ? editingItem.id : (resData.id || `item_${Date.now()}`),
        ...itemData,
      };
      const updated = editingItem
        ? items.map(i => i.id === editingItem.id ? newItem : i)
        : [newItem, ...items];
        
      setItems(updated);
      setIsFormOpen(false);
      resetForm();
      setIsSubmitting(false);
    } catch (error) {
      alert(error.message);
      setIsSubmitting(false);
    }
  };

  // Add / Edit Add-on Submit
  const handleSaveAddon = async (e) => {
    e.preventDefault();
    if (!addonName || !addonPrice) {
      alert("Please fill in Add-on item name and price.");
      return;
    }
    setIsAddonSubmitting(true);

    try {
      let imageUrl = addonExistingImage;
      if (addonImageFile) {
        try {
          const formData = new FormData();
          formData.append("file", addonImageFile);
          const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
          } else {
            imageUrl = URL.createObjectURL(addonImageFile);
          }
        } catch (e) {
          imageUrl = URL.createObjectURL(addonImageFile);
        }
      }

      const addonPayload = {
        name: addonName,
        description: addonDescription,
        price: parseFloat(addonPrice),
        isAvailable: Boolean(addonIsAvailable),
        image: imageUrl,
      };

      const url = editingAddon ? `/api/admin/addons/${editingAddon.id}` : "/api/admin/addons";
      const method = editingAddon ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addonPayload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || `Failed to ${editingAddon ? "update" : "add"} add-on`);

      if (editingAddon) {
        const updatedAddons = addons.map(a => 
          a.id === editingAddon.id ? { ...a, ...addonPayload } : a
        );
        setAddons(updatedAddons);
      } else {
        const newAddonObj = {
          id: resData.id || `addon_${Date.now()}`,
          ...addonPayload,
        };
        setAddons([newAddonObj, ...addons]);
      }

      setIsAddonModalOpen(false);
      setIsAddonSubmitting(false);
    } catch (error) {
      alert(error.message);
      setIsAddonSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-fade-in pb-12">
      {/* MENU ITEMS SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-text-main">Menu Items</h2>
          <Button onClick={openAdd} className="gap-2"><Plus size={18}/> Add New Item</Button>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-border-main p-4">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-border-main text-text-muted">
                <th className="p-3 font-semibold">SL No</th>
                <th className="p-3 font-semibold">Image</th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Edit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-border-main hover:bg-forest/5 transition-colors">
                  <td className="p-3">{idx + 1}</td>
                  <td className="p-3">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-md" />
                    ) : (
                      <div className="w-10 h-10 bg-border-main/30 rounded-md flex items-center justify-center text-text-muted"><ImageIcon size={16}/></div>
                    )}
                  </td>
                  <td className="p-3 font-bold text-text-main">{item.name}</td>
                  <td className="p-3">₹{item.price}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.isAvailable ? 'bg-green/10 text-green' : 'bg-red-100 text-red-600'}`}>
                      {item.isAvailable ? "Available" : "Hidden"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEdit(item)} className="p-2 text-forest hover:bg-forest/10 rounded-full transition-colors">
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="text-text-muted text-center py-6">No items found.</p>}
        </div>
      </div>

      {/* ADD-ONS (FRUITS) SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-text-main">Add-ons (fruits)</h2>
          <Button onClick={openAddAddonModal} className="gap-2"><Plus size={18}/> Add New Add-ons (fruits)</Button>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-border-main p-4">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-border-main text-text-muted">
                <th className="p-3 font-semibold">SL No</th>
                <th className="p-3 font-semibold">Add-ons Item Name</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Edit</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon, idx) => (
                <tr key={addon.id} className="border-b border-border-main hover:bg-forest/5 transition-colors">
                  <td className="p-3">{idx + 1}</td>
                  <td className="p-3 font-bold text-text-main flex items-center gap-2">
                    {addon.image ? (
                      <img src={addon.image} alt={addon.name} className="w-8 h-8 object-cover rounded-md" />
                    ) : (
                      <div className="w-8 h-8 bg-border-main/30 rounded-md flex items-center justify-center text-text-muted"><ImageIcon size={14}/></div>
                    )}
                    <span>{addon.name}</span>
                  </td>
                  <td className="p-3">₹{addon.price}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${addon.isAvailable ? 'bg-green/10 text-green' : 'bg-red-100 text-red-600'}`}>
                      {addon.isAvailable ? "Available" : "Hidden"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEditAddonModal(addon)} className="p-2 text-forest hover:bg-forest/10 rounded-full transition-colors">
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {addons.length === 0 && <p className="text-text-muted text-center py-6">No add-ons found.</p>}
        </div>
      </div>

      {/* EDIT MENU ITEM MODAL */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Item" : "Add New Item"} isBottomSheet={false}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex gap-4 items-center">
            {(imageFile || existingImage) ? (
              <div className="w-20 h-20 bg-border-main/20 rounded-xl overflow-hidden shrink-0 relative">
                <img src={imageFile ? URL.createObjectURL(imageFile) : existingImage} alt="Preview" className="object-cover w-full h-full" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-cream border border-border-main border-dashed rounded-xl shrink-0 flex items-center justify-center text-text-muted">
                <ImageIcon size={24} />
              </div>
            )}
            <div className="flex-1">
              <label className="text-sm font-bold text-text-main mb-1 block">Item Image</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="text-sm w-full font-sans file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-forest/10 file:text-forest hover:file:bg-forest/20 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-text-main mb-1 block">Item Name</label>
              <Input placeholder="e.g. Overnight Oats Banana" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold text-text-main mb-1 block">Price (₹)</label>
              <Input type="number" placeholder="90" required min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold text-text-main mb-1 block">Quantity Label</label>
              <Input placeholder="e.g. 250g" required value={quantityLabel} onChange={e => setQuantityLabel(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-text-main mb-1 block">Ingredients</label>
              <Input placeholder="Oats, Banana, Honey..." required value={ingredients} onChange={e => setIngredients(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-text-main mb-1 block">Nutrition Information</label>
              <Input placeholder="Protein 11g, Carbs 40g..." value={nutrition} onChange={e => setNutrition(e.target.value)} />
            </div>
          </div>
          
          {/* Availability Toggle Switch */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl mt-2">
            <div className="flex flex-col">
              <span className="font-bold text-text-main font-sans text-sm">Availability</span>
              <span className="text-xs text-text-muted">Turn off to hide from customer view</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAvailable ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Item"}</Button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT ADD-ON MODAL */}
      <Modal isOpen={isAddonModalOpen} onClose={() => setIsAddonModalOpen(false)} title={editingAddon ? "Edit Add-ons (fruits)" : "Add New Add-ons (fruits)"} isBottomSheet={false}>
        <form onSubmit={handleSaveAddon} className="flex flex-col gap-4 py-2">
          <div className="flex gap-4 items-center">
            {(addonImageFile || addonExistingImage) ? (
              <div className="w-20 h-20 bg-border-main/20 rounded-xl overflow-hidden shrink-0 relative">
                <img src={addonImageFile ? URL.createObjectURL(addonImageFile) : addonExistingImage} alt="Preview" className="object-cover w-full h-full" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-cream border border-border-main border-dashed rounded-xl shrink-0 flex items-center justify-center text-text-muted">
                <ImageIcon size={24} />
              </div>
            )}
            <div className="flex-1">
              <label className="text-sm font-bold text-text-main mb-1 block">Image</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setAddonImageFile(e.target.files[0])}
                className="text-sm w-full font-sans file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-forest/10 file:text-forest hover:file:bg-forest/20 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-bold text-text-main mb-1 block">Add-ons Item Name</label>
              <Input placeholder="Banana" required value={addonName} onChange={e => setAddonName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold text-text-main mb-1 block">Price (₹)</label>
              <Input type="number" placeholder="20" required min="0" step="0.01" value={addonPrice} onChange={e => setAddonPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold text-text-main mb-1 block">Description</label>
              <Input placeholder="Rich in potassium and natural energy" value={addonDescription} onChange={e => setAddonDescription(e.target.value)} />
            </div>
          </div>

          {/* Availability Toggle Switch */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl mt-2">
            <div className="flex flex-col">
              <span className="font-bold text-text-main font-sans text-sm">Availability</span>
              <span className="text-xs text-text-muted">Turn off to hide from customer view</span>
            </div>
            <button
              type="button"
              onClick={() => setAddonIsAvailable(!addonIsAvailable)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                addonIsAvailable ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  addonIsAvailable ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex gap-4 mt-6">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddonModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isAddonSubmitting}>{isAddonSubmitting ? "Saving..." : (editingAddon ? "Save" : "Add Add-on")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

