import React from 'react';
import { type MetaFunction } from '@remix-run/react';
import { Breadcrumb } from '~/components/ui/Breadcrumb';

export const meta: MetaFunction = () => {
  return [
    { title: 'About Us | MONTS Artisanal Luxury' },
    { name: 'description', content: 'Discover the story, craftsmanship, and heritage behind MONTS.' },
  ];
};

export default function AboutRoute() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'About Us' }]} className="mb-8" />

      <div className="max-w-3xl mx-auto flex flex-col gap-10">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2">
            Heritage & Craft
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold text-[#060505] mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            The Story of MONTS
          </h1>
          <p
            className="text-lg text-[#686764] leading-relaxed"
            style={{ fontFamily: "'Cormorant', serif", fontSize: '1.3rem' }}
          >
            Born from a deep reverence for Indian textile heritage, MONTS bridges timeless artisanal handcrafting techniques with modern minimalist silhouettes.
          </p>
        </div>

        <div className="aspect-[16/9] w-full rounded-[4px] overflow-hidden bg-[#e8dfd5]">
          <img
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80"
            alt="Artisanal Handcrafting"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-6 text-[#2c2c2c] leading-relaxed" style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem' }}>
          <h2 className="text-2xl font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Artisanal Block-Printing & Quilted Textures
          </h2>
          <p>
            Every tote bag, pouch, and ready-to-wear silhouette is handcrafted in small batches by master artisans. Using wooden blocks carved by hand and rich, eco-conscious dyes, our fabrics carry the distinct signature of the craftsman's touch.
          </p>
          <p>
            We believe luxury lies in patience, precision, and longevity. By working directly with craft clusters, we preserve heritage traditions while bringing functional, timeless elegance to contemporary lifestyles.
          </p>
        </div>
      </div>
    </div>
  );
}
