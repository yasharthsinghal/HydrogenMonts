import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, CheckCircle2, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';

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
      <div style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }} className="pt-16 pb-12">
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

          {/* Main Footer Columns */}
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Col 1: Brand & Contact Info */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div>
                <h4
                  className="text-xl font-bold tracking-widest uppercase text-white"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  MONTS
                </h4>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8b7355] mt-0.5 font-medium">
                  Artisanal Handcraft
                </p>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                MONTS brings handcrafted cotton products inspired by Rajasthan's timeless artistry. Our website now features exclusive accessories collections, while our Faridabad store offers suits, bedsheet.
              </p>

              {/* Contact Details List */}
              <div className="flex flex-col gap-2.5 text-xs pt-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#8b7355] shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    MONTS, Shop No.7 The Emporium, Puri Anand Vilas, Haryana, Faridabad, 121007
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#8b7355] shrink-0" />
                  <a
                    href="mailto:vastrabymonty@gmail.com"
                    className="hover:text-white transition-colors underline decoration-white/20 underline-offset-2"
                  >
                    vastrabymonty@gmail.com
                  </a>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#8b7355] shrink-0" />
                  <a href="tel:+918290985337" className="hover:text-white transition-colors">
                    +91 - 8290985337
                  </a>
                </div>

                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0" />
                  <a
                    href="https://wa.me/918290985337"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>+91 - 8290985337 (WhatsApp)</span>
                  </a>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#8b7355] shrink-0" />
                  <span>24/7 Support</span>
                </div>
              </div>

              {/* Social icons */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#1877F2] text-white flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E4405F] text-white flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Shop */}
            <div className="md:col-span-3">
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white/90">
                Shop
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: 'Flat Pouches', href: '/collections/all' },
                  { label: 'Small Tote', href: '/collections/all' },
                  { label: 'Pouch Bag Set (Set of 3)', href: '/collections/all' },
                  { label: 'BEST SELLERS', href: '/collections/all' },
                  { label: 'Medium Tote', href: '/collections/all' },
                  { label: 'BAGS & ACCESSORIES', href: '/collections/all' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      className="text-sm transition-colors text-white/65 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Policy */}
            <div className="md:col-span-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white/90">
                Policy & Information
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Privacy Policy', href: '/faq' },
                  { label: 'Return Policy', href: '/faq' },
                  { label: 'Shipping Policy', href: '/faq' },
                  { label: 'Terms and condition', href: '/faq' },
                  { label: 'Contact Us', href: '/contact' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      className="text-sm transition-colors text-white/65 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Sub-Footer */}
      <div className="py-4 px-6 bg-[#0d0d0d] text-white/50 text-xs">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MONTS. All rights reserved.</p>
          <div className="flex gap-5 text-white/50">
            <Link to="/faq" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/faq" className="hover:text-white transition-colors">Terms and condition</Link>
            <Link to="/faq" className="hover:text-white transition-colors">Shipping & Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
