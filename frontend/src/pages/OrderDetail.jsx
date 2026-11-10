import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load order'));
  }, [id]);

  if (error) return <section className="mx-auto max-w-4xl px-5 py-14"><p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p><Link to="/orders" className="mt-6 inline-block font-semibold text-violet-600">Back to orders</Link></section>;
  if (!order) return <section className="mx-auto max-w-4xl px-5 py-14 text-slate-500">Loading order...</section>;

  return <section className="mx-auto max-w-4xl px-5 py-14">
    <Link to="/orders" className="text-sm font-semibold text-violet-600">← Back to orders</Link>
    <div className="mt-6 rounded-3xl bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Order #{order.id.slice(-8)}</h1>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">{order.status}</span>
      </div>
      <div className="mt-8 space-y-4">
        {order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b pb-4">
          <div><p className="font-semibold">{item.product.name}</p><p className="text-sm text-slate-500">Quantity: {item.quantity}</p></div>
          <p className="font-semibold">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</p>
        </div>)}
      </div>
      <div className="mt-6 flex justify-between border-t pt-5 text-lg font-black"><span>Total</span><span>${Number(order.total).toFixed(2)}</span></div>
    </div>
  </section>;
}
