import React, { useState } from 'react';
import { type MetaFunction } from '@remix-run/react';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Contact Us | MONTS' },
    { name: 'description', content: 'Get in touch with the MONTS customer care and concierge team.' },
  ];
};

export default function ContactRoute() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Contact Us' }]} className="mb-8" />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2">
            Get In Touch
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold text-[#060505]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            We Would Love to Hear From You
          </h1>
          <p
            className="text-base text-[#686764] mt-3"
            style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem' }}
          >
            Have a question about sizing, custom inquiries, or orders? Reach out below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Info Column */}
          <div className="flex flex-col gap-6 p-6 bg-[#faf8f5] rounded-[6px] border border-[#e8e4df]">
            <h3 className="text-lg font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Concierge Details
            </h3>

            <div className="flex items-start gap-3 text-sm text-[#2c2c2c]">
              <Phone className="w-4 h-4 text-[#c4622d] shrink-0 mt-1" />
              <div>
                <span className="font-semibold block">Phone</span>
                <span className="text-[#686764]">+91 (0) 120 456 7890</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-[#2c2c2c]">
              <Mail className="w-4 h-4 text-[#c4622d] shrink-0 mt-1" />
              <div>
                <span className="font-semibold block">Email</span>
                <span className="text-[#686764]">care@montsindia.com</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-[#2c2c2c]">
              <MapPin className="w-4 h-4 text-[#c4622d] shrink-0 mt-1" />
              <div>
                <span className="font-semibold block">Studio</span>
                <span className="text-[#686764]">Jaipur, Rajasthan, India</span>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="md:col-span-2 p-8 bg-white rounded-[6px] border border-[#e8e4df]">
            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
                <CheckCircle2 className="w-12 h-12 text-[#8b7355]" />
                <h3 className="text-xl font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Message Received
                </h3>
                <p className="text-sm text-[#686764]" style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem' }}>
                  Thank you for reaching out. Our concierge team will respond within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Your Name" required placeholder="First & Last name" />
                  <Input label="Email Address" type="email" required placeholder="name@domain.com" />
                </div>
                <Input label="Subject" required placeholder="Order inquiry / feedback" />
                <div className="flex flex-col gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <label className="text-xs font-semibold text-[#060505] tracking-wide">
                    Your Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="How can we help you today?"
                    className="w-full text-sm rounded-[6px] border border-[#e8e4df] p-3 focus:border-[#c4622d] focus:ring-1 focus:ring-[#c4622d] outline-none bg-[#faf8f5] text-[#2c2c2c]"
                  />
                </div>
                <Button type="submit" variant="primary" className="self-start px-8">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
