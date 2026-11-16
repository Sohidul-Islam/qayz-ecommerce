import React from 'react';

export const metadata = {
  title: 'Privacy Policy & Terms',
  description: 'QAYZ Privacy Policy, Analytics Transparency, and Terms of Service.',
};

export default function PrivacyTermsPage() {
  return (
    <div className="bg-[#F8F6F1] text-[#111113] py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white border border-[#E5E0D8] p-8 sm:p-12 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            Legal & Data Stewardship
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Privacy Policy & Terms</h1>
        </div>

        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed">
          <h2 className="font-serif text-xl text-neutral-900">1. Privacy-Conscious Analytics</h2>
          <p>
            QAYZ collects minimal, anonymized browsing events (page views, product interests,
            selected sizes, search terms, and UTM campaign attribution) solely to improve stock
            availability and tailoring quality. We never sell personal data or store raw payment
            card credentials on our servers.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed">
          <h2 className="font-serif text-xl text-neutral-900">2. Order & Delivery Information</h2>
          <p>
            Customer contact details (name, phone number, delivery address, and optional email)
            are used exclusively for order fulfillment, courier dispatch, and customer support.
            Access is strictly guarded via server-side role-based access control and audit logs.
          </p>
        </section>

        <section className="space-y-3 text-sm text-neutral-700 leading-relaxed">
          <h2 className="font-serif text-xl text-neutral-900">3. Return & Size Exchange Terms</h2>
          <p>
            Unworn Panjabis with original woven tags and atelier packaging may be exchanged for a
            different size or returned within 7 days of delivery. Returned garments automatically
            undergo quality inspection prior to inventory restoration.
          </p>
        </section>
      </div>
    </div>
  );
}
