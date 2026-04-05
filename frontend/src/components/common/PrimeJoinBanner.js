import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { primeMembership as primeMembershipApi } from '../../utils/api';

const PrimeJoinBanner = ({ onNavigate }) => {
  const [displayCurrency, setDisplayCurrency] = useState('INR');
  const [membershipPrice, setMembershipPrice] = useState(299);

  useEffect(() => {
    let isMounted = true;

    primeMembershipApi.getConfig()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const fetchedPrice = Number(response?.data?.primeMembershipYearlyPrice);
        const fetchedCurrency = String(response?.data?.currency || 'INR').toUpperCase();

        if (Number.isFinite(fetchedPrice) && fetchedPrice > 0) {
          setMembershipPrice(fetchedPrice);
        }

        if (fetchedCurrency) {
          setDisplayCurrency(fetchedCurrency);
        }
      })
      .catch(() => {
        // Keep default fallback values if config request fails.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedPrice = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: displayCurrency,
        maximumFractionDigits: 0,
      }).format(membershipPrice);
    } catch {
      return `INR ${Math.round(membershipPrice)}`;
    }
  }, [displayCurrency, membershipPrice]);

  const handleJoinPrime = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('PrimeMembership');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-r from-[#0b1f4e] via-[#124e7f] to-[#0e7490] p-5 text-white shadow-[0_14px_35px_-18px_rgba(14,116,144,0.85)] sm:p-6"
      aria-label="Prime membership promotion"
    >
      <div className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-white/0 via-white/20 to-white/0" style={{ animation: 'mcmPrimeShimmer 4.6s linear infinite' }} />
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-200/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-blue-300/15 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
            Prime Student Offer
          </span>
          <h3 className="mcm-display mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
            Join Prime and shop smarter on campus
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            Get priority delivery, early access to limited drops, and member-only pricing on top-rated student essentials.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-100">
            <span className="rounded-full border border-white/20 bg-slate-900/20 px-2.5 py-1">Early Access Deals</span>
            <span className="rounded-full border border-white/20 bg-slate-900/20 px-2.5 py-1">Free Campus Delivery</span>
            <span className="rounded-full border border-white/20 bg-slate-900/20 px-2.5 py-1">Extra Study Perks</span>
          </div>
        </div>

        <div className="w-full max-w-xs rounded-2xl border border-white/25 bg-slate-900/30 p-4 backdrop-blur-sm lg:w-80">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Special Launch Price</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-3xl font-black leading-none">{formattedPrice}</span>
            <span className="pb-1 text-sm text-white/80">per year</span>
          </div>
          <button
            onClick={handleJoinPrime}
            className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
          >
            Join Prime Now
          </button>
          <button
            onClick={handleJoinPrime}
            className="mt-2 w-full rounded-lg border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/90 transition hover:bg-white/10"
          >
            See all benefits
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mcmPrimeShimmer {
          0% { transform: translateX(-120%) rotate(12deg); }
          100% { transform: translateX(240%) rotate(12deg); }
        }
      `}</style>
    </motion.section>
  );
};

export default PrimeJoinBanner;
