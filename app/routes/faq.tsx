import React from 'react';
import { type MetaFunction } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Accordion } from '~/components/ui/Accordion';

export const meta: MetaFunction = () => {
  return [
    { title: 'Frequently Asked Questions | MONTS' },
    { name: 'description', content: 'Answers to common questions regarding artisanal craft, orders, shipping, and returns.' },
  ];
};

export default function FAQRoute() {
  const faqItems = [
    {
      id: 'craft',
      title: 'How are MONTS products handcrafted?',
      content: (
        <p>
          Each piece is individually created by master artisans using traditional block-printing, vegetable and azo-free dyes, and quilted cotton layering. Due to the handcrafted nature, subtle variations in print and dye shade are authentic marks of genuine handcraft.
        </p>
      ),
    },
    {
      id: 'care',
      title: 'How should I care for my handcrafted quilted cotton pieces?',
      content: (
        <p>
          We recommend dry cleaning for the first wash or a gentle cold hand wash with mild, pH-neutral liquid detergent. Avoid direct harsh sunlight when line drying to preserve the natural vibrancy of artisanal dyes.
        </p>
      ),
    },
    {
      id: 'shipping',
      title: 'What are your delivery timelines?',
      content: (
        <p>
          Domestic orders within India are typically processed in 1–2 business days and delivered within 4–7 business days. Express options are calculated at checkout.
        </p>
      ),
    },
    {
      id: 'returns',
      title: 'What is your return & exchange policy?',
      content: (
        <p>
          We offer a 30-day return policy for unwashed, unused products in original packaging with tags intact. Simply reach out to our concierge team at care@montsindia.com with your order number to initiate a return.
        </p>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'FAQ' }]} className="mb-8" />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2">
            Help & Guidance
          </span>
          <h1
            className="text-4xl font-bold text-[#060505] mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Frequently Asked Questions
          </h1>
          <p
            className="text-base text-[#686764]"
            style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem' }}
          >
            Everything you need to know about our artisanal pieces, orders, and services.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[6px] border border-[#e8e4df]">
          <Accordion items={faqItems} defaultOpenId="craft" allowMultiple />
        </div>
      </div>
    </div>
  );
}
