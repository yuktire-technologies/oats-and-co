"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const CartContext = createContext({});

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const { user } = useAuth();
  
  // Sync from server / local storage on mount or user state change
  useEffect(() => {
    async function loadCart() {
      if (user) {
        try {
          const res = await fetch("/api/cart");
          if (res.ok) {
            const data = await res.json();
            if (data.items && Array.isArray(data.items)) {
              setCart(data.items);
              return;
            }
          }
        } catch (e) {}
      }
      
      const saved = localStorage.getItem("cart");
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch(e) {}
      }
    }
    loadCart();
  }, [user]);

  // Persist to server / local storage on change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    if (user) {
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart })
      }).catch(() => {});
    }
  }, [cart, user]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, change) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      
      const newQuantity = existing.quantity + change;
      if (newQuantity <= 0) {
        return prev.filter(i => i.id !== id);
      }
      return prev.map(i => i.id === id ? { ...i, quantity: newQuantity } : i);
    });
  };

  const clearCart = () => setCart([]);

  const getQuantity = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, clearCart, getQuantity, totalItems, subTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

