import React from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
export default function Admin() {
  const { user } = useAuth(); const [stats, setStats] = useState(null); const [error, setError] = useState('');
  useEffect(() => { if (user?.role === 'ADMIN') api.get('/admin/dashboard').then(({ data }) => setStats(data)).catch(err => setError(err.response?.data?.message || 'Unable to load dashboard')); }, [user]);
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <section className="mx-auto max-w-7xl px-5 py-14"><p className="text-sm font-bold uppercase tracking-widest text-violet-600">Control center</p><h1 className="mt-2 text-4xl font-black">Admin dashboard</h1>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{stats && <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[['Revenue', `$${Number(stats.revenue).toFixed(2)}`], ['Orders', stats.orders], ['Customers', stats.users], ['Products', stats.products]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div>}</section>;
}
