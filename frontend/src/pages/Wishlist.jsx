import React from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Wishlist() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) return;
    api.get('/wishlist').then(({ data }) => setItems(data.items || [])).catch(() => setError('Unable to load your wishlist'));
  }, [token]);
  if (!token) return <Navigate to="/login" replace />;
  return <section className="mx-auto max-w-7xl px-5 py-14"><p className="text-sm font-bold uppercase tracking-widest text-violet-600">Saved for later</p><h1 className="mt-2 text-4xl font-black">Your wishlist</h1>{error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{items.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ product }) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-10 rounded-3xl bg-white p-12 text-center"><p className="text-slate-500">Save products you want to revisit.</p><Link to="/products" className="mt-5 inline-block rounded-full bg-slate-900 px-6 py-3 font-semibold text-white">Explore products</Link></div>}</section>;
}
