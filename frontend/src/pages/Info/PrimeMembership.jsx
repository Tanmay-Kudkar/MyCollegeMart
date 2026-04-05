import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
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

const PrimeMembership = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [showExtraFeatures, setShowExtraFeatures] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const isMasterAdmin = Boolean(state.user?.isMaster);

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

  const primeProduct = useMemo(() => ({
    id: 'prime-membership',
    name: 'MyCollegeMart Prime Membership',
    price: config.primeMembershipYearlyPrice,
    description: 'Annual subscription for exclusive benefits and features.',
    imageUrl: 'https://placehold.co/300x300/fde68a/1f2937?text=Prime',
    category: 'Membership',
    isPrime: true,
  }), [config.primeMembershipYearlyPrice]);

  const handleAddToCart = () => {
    if (state.cart?.items?.['prime-membership']) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Prime Membership can only be added once.', type: 'error' }
      });
      return;
    }
    dispatch({ type: actionTypes.ADD_TO_CART, payload: primeProduct });
    dispatch({
      type: actionTypes.ADD_NOTIFICATION,
      payload: {
        message: `Prime Membership added to cart at ${formatCurrency(config.primeMembershipYearlyPrice, config.currency)}!`,
        type: 'success',
      }
    });
  };

  const FeatureCard = ({ title, children, icon }) => (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      className="h-full rounded-2xl border border-slate-300 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-800/60"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-lg text-white dark:bg-slate-700">{icon}</span>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-slate-700 dark:text-slate-300">{children}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 py-6 sm:py-10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-slate-300 bg-slate-900 px-5 py-10 text-white shadow-xl sm:px-8 sm:py-12"
        >
          <div
            className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
            style={{ animation: 'mcm-banner-shimmer 4.6s linear infinite' }}
          />
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -left-12 top-0 h-44 w-44 rounded-full bg-amber-400/35 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          </div>

          <div className="relative z-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Premium Student Benefits</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">MyCollegeMart Prime</h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-100 sm:text-lg">
              Unlock fast delivery, priority support, and special rates for assignment services.
            </p>

            <motion.button
              onClick={handleAddToCart}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="mt-7 rounded-xl bg-amber-400 px-6 py-3 text-base font-extrabold text-slate-900 shadow-lg transition hover:bg-amber-300 sm:px-10 sm:py-4 sm:text-lg"
              title="Add Prime Membership to your cart"
            >
              Join Prime - {isLoadingConfig ? 'Loading price...' : `${formatCurrency(config.primeMembershipYearlyPrice, config.currency)}/year`}
            </motion.button>
          </div>
        </motion.section>

        {isMasterAdmin && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-700/40 dark:bg-cyan-900/20">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Pricing updates moved to Admin Merchant Panel.</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Edit all Prime and Assignment rates from one master-only location.</p>
            <button
              type="button"
              onClick={() => onNavigate('AdminMerchantPanel')}
              className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Open Admin Panel
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon="D" title="Free Campus Delivery">
            Get your items delivered to hostel and pickup points without extra delivery charges.
          </FeatureCard>
          <FeatureCard icon="E" title="Early Access">
            View high-demand listings earlier than non-Prime users and lock your item faster.
          </FeatureCard>
          <FeatureCard icon="S" title="Special Deals">
            Access Prime-exclusive discounts across study tools, accessories, and premium listings.
          </FeatureCard>
        </section>

        <section>
          <button
            onClick={() => setShowExtraFeatures((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-5 py-4 text-left text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            title={showExtraFeatures ? 'Hide extra features' : 'Show more Prime features'}
          >
            <span className="text-lg font-bold sm:text-2xl">Explore More Prime Features</span>
            <motion.span animate={{ rotate: showExtraFeatures ? 45 : 0 }} className="text-3xl leading-none">+</motion.span>
          </button>

          {showExtraFeatures && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-5"
            >
              <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Assignment and Practical Help</h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">Prime members get discounted service rates for every deadline.</p>
                  </div>
                  <span className="inline-flex rounded-full border border-cyan-500 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                    Prime Benefit
                  </span>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  {assignmentRows.map((row) => {
                    const savings = Math.max(0, row.regularPrice - row.primePrice);

                    return (
                      <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{row.label}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{row.eta}</p>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(row.primePrice, config.currency)}</span>
                            <span className="text-sm text-slate-500 line-through dark:text-slate-400">{formatCurrency(row.regularPrice, config.currency)}</span>
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Save {formatCurrency(savings, config.currency)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => onNavigate('AssignmentHelp')}
                  className="mt-4 w-full rounded-lg bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Request Assignment Help
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Prime-Only Listings</h3>
                  <p className="mt-2 text-slate-700 dark:text-slate-300">Access select high-demand listings before general marketplace users.</p>
                </div>
                <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Priority Support</h3>
                  <p className="mt-2 text-slate-700 dark:text-slate-300">Get faster responses for listing disputes, payment help, and account issues.</p>
                </div>
              </div>
            </motion.div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/70 sm:p-8">
          <h2 className="text-center text-3xl font-black tracking-tight text-slate-900 dark:text-white">Frequently Asked Questions</h2>

          <div className="mx-auto mt-7 grid max-w-4xl grid-cols-1 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">How do I get started?</h3>
              <p className="mt-1 text-slate-700 dark:text-slate-300">Add Prime membership to cart and complete checkout. Benefits activate after successful payment.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">How do I confirm Prime status?</h3>
              <p className="mt-1 text-slate-700 dark:text-slate-300">Your account page shows active Prime status and expiry date once payment is verified.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">What payment methods are accepted?</h3>
              <p className="mt-1 text-slate-700 dark:text-slate-300">Prime activation is online payment only via Razorpay for immediate membership activation.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrimeMembership;
