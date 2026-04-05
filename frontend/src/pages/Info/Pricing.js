import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../../context/GlobalStateContext';
import { primeMembership as primeMembershipApi } from '../../utils/api';

const DEFAULT_CONFIG = {
  currency: 'INR',
  primeMembershipYearlyPrice: 299,
  assignmentPricing: {
    Standard: {
      label: 'Standard Deadline (7 days)',
      eta: 'Balanced turnaround',
      regularPrice: 149,
      primePrice: 99,
    },
    Express: {
      label: 'Express Deadline (3 days)',
      eta: 'Priority queue delivery',
      regularPrice: 249,
      primePrice: 149,
    },
    Urgent: {
      label: 'Urgent Deadline (24 hours)',
      eta: 'Fast-track support',
      regularPrice: 399,
      primePrice: 249,
    },
  },
};

const normalizeTier = (tierPayload, fallbackTier) => {
  const regularPrice = Number(tierPayload?.regularPrice);
  const primePrice = Number(tierPayload?.primePrice);

  return {
    label: tierPayload?.label || fallbackTier.label,
    eta: tierPayload?.eta || fallbackTier.eta,
    regularPrice: Number.isFinite(regularPrice) && regularPrice > 0
      ? regularPrice
      : fallbackTier.regularPrice,
    primePrice: Number.isFinite(primePrice) && primePrice > 0
      ? primePrice
      : fallbackTier.primePrice,
  };
};

const normalizeConfig = (payload) => ({
  currency: payload?.currency || DEFAULT_CONFIG.currency,
  primeMembershipYearlyPrice: Number.isFinite(Number(payload?.primeMembershipYearlyPrice))
    ? Number(payload.primeMembershipYearlyPrice)
    : DEFAULT_CONFIG.primeMembershipYearlyPrice,
  assignmentPricing: {
    Standard: normalizeTier(payload?.assignmentPricing?.Standard, DEFAULT_CONFIG.assignmentPricing.Standard),
    Express: normalizeTier(payload?.assignmentPricing?.Express, DEFAULT_CONFIG.assignmentPricing.Express),
    Urgent: normalizeTier(payload?.assignmentPricing?.Urgent, DEFAULT_CONFIG.assignmentPricing.Urgent),
  },
});

const formatCurrency = (value, currency = 'INR') => (
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
);

const Pricing = ({ user, onNavigate }) => {
  const { state } = useGlobalState();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const isMasterAdmin = Boolean(state.user?.isMaster);
  const walletBalance = Number(user?.wallet ?? state.studentWallet ?? 0);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const response = await primeMembershipApi.getConfig();
        if (cancelled) {
          return;
        }

        const normalizedConfig = normalizeConfig(response?.data);
        setConfig(normalizedConfig);
      } catch {
        if (!cancelled) {
          setConfig(DEFAULT_CONFIG);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConfig(false);
        }
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const assignmentRows = useMemo(() => ([
    { key: 'Standard', ...config.assignmentPricing.Standard },
    { key: 'Express', ...config.assignmentPricing.Express },
    { key: 'Urgent', ...config.assignmentPricing.Urgent },
  ]), [config.assignmentPricing]);

  return (
    <div className="min-h-[60vh] bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto w-full max-w-5xl"
      >
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Pricing & Membership</h1>
            <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-300">
              Simple, transparent pricing for students. Buy items at listed prices and upgrade to Prime for delivery and premium benefits.
            </p>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-right">
              <div className="text-xs text-slate-500">Your Wallet</div>
              <div className="text-xl font-bold text-emerald-600">₹{walletBalance.toFixed(2)}</div>
            </div>
            <button
              onClick={() => onNavigate('PrimeMembership')}
              className="rounded bg-amber-400 px-4 py-2 font-semibold text-slate-900 shadow hover:bg-amber-500"
            >
              Add Money
            </button>
          </div>
        </div>

        {isMasterAdmin && (
          <div className="mb-8 rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-700/40 dark:bg-cyan-900/20">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Pricing edits are centralized in Admin Merchant Panel.</p>
            <button
              type="button"
              onClick={() => onNavigate('AdminMerchantPanel')}
              className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Open Admin Panel
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="text-sm font-medium text-slate-500">Free</div>
            <div className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">No subscription</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Buy and sell on marketplace with no subscription fee.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Standard listings</li>
              <li>Campus pickup</li>
              <li>Use Student Wallet</li>
            </ul>
            <div className="mt-6">
              <button
                onClick={() => onNavigate('Marketplace')}
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Continue Browsing
              </button>
            </div>
          </div>

          <div className="relative scale-100 rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-xl dark:border-amber-700 dark:bg-amber-900/20 md:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Best value</div>
                <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">Prime</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {isLoadingConfig ? 'Loading...' : `${formatCurrency(config.primeMembershipYearlyPrice, config.currency)} / year`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 dark:text-slate-300">Save time</div>
                <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">Free campus delivery</div>
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Free campus delivery to Library and Canteen</li>
              <li>Access to Prime exclusive listings</li>
              <li>Early access to flash deals</li>
              <li>Priority seller support</li>
            </ul>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => onNavigate('PrimeMembership')}
                className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg hover:bg-amber-500"
              >
                <span className="z-10">
                  Join Prime - {isLoadingConfig ? 'Loading...' : `${formatCurrency(config.primeMembershipYearlyPrice, config.currency)}/yr`}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity hover:opacity-100"
                  style={{ mixBlendMode: 'screen' }}
                />
              </button>
              <button
                onClick={() => onNavigate('PrimeMembership')}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                See Benefits
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">Prime activation requires online payment.</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="text-sm font-medium text-slate-500">Pro / Bulk</div>
            <div className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">Custom</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">For sellers with multiple listings or stores, contact us for campus programs.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>Bulk listing support</li>
              <li>Seller tools and reports</li>
              <li>Promotions and featured spots</li>
            </ul>
            <div className="mt-6">
              <button
                onClick={() => onNavigate('Contact')}
                className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Assignment Help Pricing</h3>
          <div className="space-y-3 text-sm">
            {assignmentRows.map((row) => (
              <div key={row.key} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/30 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{row.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.eta}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-slate-700 dark:text-slate-300">Regular: {formatCurrency(row.regularPrice, config.currency)}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Prime: {formatCurrency(row.primePrice, config.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Why Prime?</h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <div className="font-semibold">Free Campus Delivery</div>
              <div className="text-slate-600 dark:text-slate-300">Delivered to convenient pickup points without extra charge.</div>
            </div>
            <div>
              <div className="font-semibold">Prime-Only Deals</div>
              <div className="text-slate-600 dark:text-slate-300">Exclusive listings and early access to flash deals.</div>
            </div>
            <div>
              <div className="font-semibold">Priority Support</div>
              <div className="text-slate-600 dark:text-slate-300">Faster help for listing issues and disputes.</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Pricing;
