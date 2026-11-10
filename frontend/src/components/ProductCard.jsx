import React from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { token } = useAuth();
  const saveToWishlist = async () => {
    if (token) await api.post('/wishlist', { productId: product.id });
  };
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <button onClick={saveToWishlist} aria-label="Add to wishlist" className="absolute right-3 top-3 rounded-full bg-white/90 p-2"><Heart size={17} /></button>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">{product.category?.name || 'Featured'}</p>
        <Link to={`/products/${product.id}`} className="mt-2 block font-semibold text-slate-900 hover:text-violet-600">{product.name}</Link>
        <div className="mt-3 flex items-center gap-1 text-sm text-amber-500"><Star size={15} fill="currentColor" /> {product.rating || '4.8'} <span className="text-slate-400">({product.reviewCount || 0})</span></div>
        <div className="mt-4 flex items-center justify-between"><span className="text-xl font-bold">${Number(product.price).toFixed(2)}</span><button onClick={() => addItem(product)} className="rounded-full bg-slate-900 p-3 text-white transition hover:bg-violet-600" aria-label="Add to cart"><ShoppingBag size={18} /></button></div>
      </div>
    </article>
  );
}
