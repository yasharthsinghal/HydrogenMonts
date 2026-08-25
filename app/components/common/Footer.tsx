import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, CheckCircle2, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
  };

  return (
    <footer style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Main Footer */}
      <div style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }} className="pt-16 pb-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Newsletter Row */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pb-12 mb-12"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] mb-2 font-medium" style={{ color: '#8b7355' }}>
                Stay in touch
              </p>
              <h3
                className="text-2xl font-bold mb-2 text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Exclusive offers straight to your inbox
              </h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}>
                Join to get special seasonal offers, artisanal previews, and limited release announcements.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              {subscribed ? (
                <div className="flex items-center gap-2 text-sm py-3 text-[#8b7355]">
                  <CheckCircle2 className="w-5 h-5" />
                  Thank you for subscribing to MONTS!
                </div>
              ) : (
                <>
                  <div className="relative flex-1">
                    <Mail
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full pl-10 pr-4 py-3 text-sm focus:outline-none rounded-[6px]"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ffffff',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-7 py-3 text-sm font-semibold rounded-[6px] transition-colors bg-[#c4622d] text-white hover:bg-[#923f12] cursor-pointer shrink-0"
                  >
                    Subscribe
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Links Grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Col 1: Brand */}
            <div className="flex flex-col gap-4">
              <h4
                className="text-xl font-bold tracking-widest uppercase text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                MONTS
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Artisanal handcrafted luxury garments and accessories created with timeless heritage craftsmanship.
              </p>
              <div className="flex flex-col gap-2 text-xs pt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#8b7355]" /> +91 (0) 120 456 7890
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#8b7355]" /> Jaipur, Rajasthan, India
                </span>
              </div>
            </div>

            {/* Col 2: Main Menu */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white/90">
                Main Menu
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: 'Shop All Products', href: '/collections/all' },
                  { label: 'All Collections', href: '/collections' },
                  { label: 'About Brand', href: '/about' },
                  { label: 'Contact Us', href: '/contact' },
                  { label: 'Wholesale Inquiries', href: '/wholesale' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      className="text-sm transition-colors text-white/60 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Customer Care */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white/90">
                Customer Care
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: 'Customer Account', href: '/account' },
                  { label: 'Order Tracking', href: '/account' },
                  { label: 'Frequently Asked Questions', href: '/faq' },
                  { label: 'Contact Support', href: '/contact' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      className="text-sm transition-colors text-white/60 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Connect */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white/90">
                Connect
              </h4>
              <p className="text-sm leading-relaxed mb-4 text-white/60">
                Follow our artisanal craft, new silhouette drops, and textile stories.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-white/60">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Facebook</a>
                <a href="https://pinterest.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Pinterest</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Footer */}
      <div className="py-4 px-6 bg-[#0d0d0d] text-white/50 text-xs">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MONTS. All rights reserved. Powered by Shopify Hydrogen.</p>
          <div className="flex gap-5 text-white/50">
            <Link to="/faq" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/faq" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/faq" className="hover:text-white transition-colors">Shipping & Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
