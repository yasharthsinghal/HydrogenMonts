import React, { useState } from 'react';
import { type MetaFunction } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { CheckCircle2, Building2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Wholesale & B2B Inquiries | MONTS' },
    { name: 'description', content: 'Stock artisanal handcrafted MONTS collections in your boutique or luxury store.' },
  ];
};

export default function WholesaleRoute() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Wholesale Inquiries' }]} className="mb-8" />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full bg-[#f0edea] text-[#8b7355] flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1
            className="text-4xl font-bold text-[#060505] mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Partner With MONTS
          </h1>
          <p
            className="text-base text-[#686764]"
            style={{ fontFamily: "'Cormorant', serif", fontSize: '1.25rem' }}
          >
            We collaborate with selected concept stores, luxury boutiques, and global retailers who share our passion for artisanal textiles and conscious design.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[6px] border border-[#e8e4df]">
          {submitted ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
              <CheckCircle2 className="w-12 h-12 text-[#8b7355]" />
              <h3 className="text-xl font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Wholesale Application Received
              </h3>
              <p className="text-sm text-[#686764]" style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem' }}>
                Thank you for your interest. Our wholesale team will review your details and send our line sheet within 2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Contact Name" required placeholder="Full Name" />
                <Input label="Business Email" type="email" required placeholder="buyer@boutique.com" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Store / Company Name" required placeholder="Boutique Name" />
                <Input label="Website / Social Handle" required placeholder="www.yourstore.com" />
              </div>
              <Input label="Store Location (City & Country)" required placeholder="City, Country" />
              <div className="flex flex-col gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <label className="text-xs font-semibold text-[#060505]">Tell Us About Your Store & Aesthetic</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Which other brands do you carry? Estimated order volume?"
                  className="w-full text-sm rounded-[6px] border border-[#e8e4df] p-3 focus:border-[#c4622d] focus:ring-1 focus:ring-[#c4622d] outline-none bg-[#faf8f5] text-[#2c2c2c]"
                />
              </div>
              <Button type="submit" variant="primary" className="self-start px-8">
                Submit Wholesale Application
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
