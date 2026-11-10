import React from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('shopsphere-cart') || '[]'));
  const persist = (next) => {
    localStorage.setItem('shopsphere-cart', JSON.stringify(next));
    return next;
  };
  const addItem = (product) => setItems(current => {
    const found = current.find(item => item.id === product.id);
    const next = found ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
    return persist(next);
  });
  const removeItem = (id) => setItems(current => {
    return persist(current.filter(item => item.id !== id));
  });
  const updateQuantity = (id, quantity) => setItems(current => {
    if (quantity < 1) return persist(current.filter(item => item.id !== id));
    return persist(current.map(item => item.id === id ? { ...item, quantity: Math.min(quantity, 99) } : item));
  });
  const clearCart = () => setItems(persist([]));
  const value = useMemo(() => ({ items, addItem, removeItem, updateQuantity, clearCart, count: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), total: items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
