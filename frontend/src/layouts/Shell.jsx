import React from 'react';
import { Heart, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Shell() {
  const { count } = useCart(); const { user, logout } = useAuth(); const navigate = useNavigate();
  return <div className="min-h-screen">
    <div className="bg-slate-900 px-4 py-2 text-center text-xs font-medium text-slate-200">Free shipping on orders over $75 · Welcome to the new way to shop</div>
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-5">
        <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight"><span className="rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 p-2 text-white"><Sparkles size={18} /></span>ShopSphere<span className="text-violet-600">AI</span></Link>
        <form className="hidden flex-1 md:block" onSubmit={(event) => { event.preventDefault(); navigate(`/products?search=${event.currentTarget.search.value}`); }}><div className="flex items-center rounded-full bg-slate-100 px-4 py-3"><Search size={18} className="text-slate-400" /><input name="search" className="ml-3 w-full bg-transparent text-sm outline-none" placeholder="Search products, brands, and more..." /></div></form>
        <nav className="ml-auto flex items-center gap-3"><Link to="/products" className="hidden text-sm font-medium sm:block">Explore</Link>{user?.role === 'ADMIN' && <Link to="/admin" className="hidden text-sm font-medium sm:block">Admin</Link>}{user ? <button onClick={logout} className="hidden text-sm font-medium sm:block">Sign out</button> : <Link to="/login" className="hidden text-sm font-medium sm:block">Sign in</Link>}<Link to="/wishlist" className="rounded-full bg-slate-100 p-3" aria-label="Wishlist"><Heart size={19} /></Link><Link to="/cart" className="relative rounded-full bg-slate-100 p-3" aria-label="Cart"><ShoppingBag size={19} /><span className="absolute -right-1 -top-1 rounded-full bg-violet-600 px-1.5 text-[10px] text-white">{count}</span></Link></nav>
      </div>
    </header>
    <main><Outlet /></main>
    <footer className="mt-24 bg-slate-950 px-5 py-14 text-slate-300"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3"><div><div className="text-xl font-bold text-white">ShopSphere<span className="text-violet-400">AI</span></div><p className="mt-3 max-w-sm text-sm leading-6">Curated products, intelligent discovery, and a shopping experience designed around you.</p></div><div><h3 className="font-semibold text-white">Shop</h3><div className="mt-4 grid gap-2 text-sm"><Link to="/products">All products</Link><Link to="/products?category=Electronics">Electronics</Link><Link to="/products?category=Fashion">Fashion</Link></div></div><div><h3 className="font-semibold text-white">Stay in the loop</h3><p className="mt-3 text-sm">Get thoughtful picks and special offers in your inbox.</p><div className="mt-4 flex"><input className="w-full rounded-l-xl bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Email address" /><button className="rounded-r-xl bg-violet-600 px-4 text-sm font-semibold text-white">Join</button></div></div></div></footer>
  </div>;
}
