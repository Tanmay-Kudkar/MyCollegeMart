import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';
import ProductCard from '../components/product/ProductCard';
import PrimeJoinBanner from '../components/common/PrimeJoinBanner';
import ProductCardSkeleton from '../components/common/ProductCardSkeleton';

const SkeletonBlock = ({ className = '' }) => (
  <div className={`mcm-skeleton-block mcm-skeleton-shimmer relative rounded ${className}`} />
);

const HomeLoadingSkeleton = () => (
  <div className="space-y-6">
    <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-52" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-5 w-20" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <ProductCardSkeleton key={`home-hot-deal-skeleton-${index}`} compact />
        ))}
      </div>
    </section>

    <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonBlock className="h-5 w-16" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={`home-featured-skeleton-${index}`} compact />
        ))}
      </div>
    </section>
  </div>
);

const Home = ({ onNavigate }) => {
  const { state } = useGlobalState();
  const isProductsLoading = state.products?.status === 'idle' || state.products?.status === 'loading';

  const allProducts = useMemo(
    () => {
      const items = Array.isArray(state.products?.items) ? state.products.items : [];
      const seen = new Set();

      return items.filter((item) => {
        const key = item?.id != null
          ? `id:${item.id}`
          : `fallback:${item?.name || 'unknown'}|${item?.category || 'misc'}|${item?.price || 0}`;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
    },
    [state.products?.items]
  );

  const curatedDeals = useMemo(() => allProducts.slice(0, 4), [allProducts]);
  const featuredProducts = useMemo(() => allProducts.slice(4, 12), [allProducts]);

  const categoryCards = useMemo(() => {
    const buckets = new Map();

    allProducts.forEach((product) => {
      const category = product?.category || 'Campus Picks';
      const price = Number(product?.price || 0);
      const existing = buckets.get(category);

      if (!existing) {
        buckets.set(category, {
          name: category,
          count: 1,
          minPrice: price,
          imageUrl: product?.imageUrl,
        });
        return;
      }

      existing.count += 1;
      existing.minPrice = Math.min(existing.minPrice, price);
      if (!existing.imageUrl && product?.imageUrl) {
        existing.imageUrl = product.imageUrl;
      }
    });

    return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [allProducts]);

  const heroSpotlight = allProducts[0] || null;

  const stats = useMemo(() => {
    const total = allProducts.length;
    const prime = allProducts.filter((item) => item?.isPrimeExclusive).length;
    const average = total > 0
      ? allProducts.reduce((sum, item) => sum + Number(item?.price || 0), 0) / total
      : 0;

    return {
      total,
      prime,
      average,
    };
  }, [allProducts]);

  if (isProductsLoading) {
    return <HomeLoadingSkeleton />;
  }

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 top-16 h-64 w-64 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute right-0 top-[24rem] h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl dark:bg-indigo-800/20" />
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-[1.75fr_1fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1b45] via-[#1f4f8f] to-[#0b7a8f] p-6 text-white sm:p-8 md:p-10">
            {heroSpotlight?.imageUrl && (
              <img
                src={heroSpotlight.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-105 object-cover opacity-[0.18]"
              />
            )}
            <div
              className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
              style={{ animation: 'mcm-banner-shimmer 4.8s linear infinite' }}
            />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-14 -bottom-24 h-64 w-64 rounded-full bg-blue-950/70 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07112e]/55 via-transparent to-transparent" />

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-slate-900/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                Campus Commerce Dashboard
              </div>

              <h1 className="mcm-display mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl md:text-6xl">
                Discover Better Deals, Faster
              </h1>
              <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-xl">
                Shop verified student listings, track flash offers, and manage buying and selling from one premium storefront.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100/95">
                <span className="rounded-full border border-white/25 bg-slate-900/20 px-2.5 py-1">Verified Sellers</span>
                <span className="rounded-full border border-white/25 bg-slate-900/20 px-2.5 py-1">Realtime Tracking</span>
                <span className="rounded-full border border-white/25 bg-slate-900/20 px-2.5 py-1">Prime Member Benefits</span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('Marketplace')}
                  className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-900 shadow-[0_12px_24px_-14px_rgba(251,191,36,0.9)] transition hover:-translate-y-0.5 hover:bg-amber-300"
                >
                  Shop Now
                </button>
                <button
                  onClick={() => onNavigate('Sell')}
                  className="rounded-xl border border-white/35 bg-white/5 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/12"
                >
                  Start Selling
                </button>
                <button
                  onClick={() => onNavigate('PrimeMembership')}
                  className="rounded-xl border border-cyan-200/40 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/20"
                >
                  Prime Benefits
                </button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/25 bg-white/[0.12] p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/75">Live Listings</p>
                  <p className="mt-1 text-2xl font-bold leading-none">{stats.total}</p>
                  <p className="mt-1 text-[11px] text-white/70">Available now</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/[0.12] p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/75">Prime Exclusive</p>
                  <p className="mt-1 text-2xl font-bold leading-none">{stats.prime}</p>
                  <p className="mt-1 text-[11px] text-white/70">Premium catalog</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/[0.12] p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/75">Avg Price</p>
                  <p className="mt-1 text-2xl font-bold leading-none">₹{stats.average.toFixed(0)}</p>
                  <p className="mt-1 text-[11px] text-white/70">Across listings</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-700 dark:bg-slate-900/70 sm:p-6 lg:border-t-0 lg:border-l">
            <h2 className="mcm-display text-lg font-bold text-slate-900 dark:text-white">Quick Panel</h2>
            <div className="mt-4 space-y-3">
              <button
                onClick={() => onNavigate('Marketplace', { category: 'Textbooks' })}
                className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Top Textbook Deals</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Updated listings for this week</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Hot</span>
                </div>
              </button>
              <button
                onClick={() => onNavigate('OrderTracking')}
                className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Track Your Orders</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Realtime checkout and delivery states</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Live</span>
                </div>
              </button>
              <button
                onClick={() => onNavigate('Wishlist')}
                className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Your Saved Items</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Wishlist synced with your account</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Sync</span>
                </div>
              </button>
            </div>

            {heroSpotlight && (
              <motion.button
                type="button"
                onClick={() => onNavigate('ProductDetail', heroSpotlight)}
                className="mt-5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="relative">
                  <img src={heroSpotlight.imageUrl} alt={heroSpotlight.name} className="h-32 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                  <p className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-800">
                    Spotlight Product
                  </p>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 font-semibold text-slate-900 dark:text-white">{heroSpotlight.name}</p>
                  <p className="mt-1 font-bold text-cyan-700 dark:text-cyan-400">₹{Number(heroSpotlight.price || 0).toFixed(2)}</p>
                </div>
              </motion.button>
            )}
          </div>
        </div>
      </section>

      <PrimeJoinBanner onNavigate={onNavigate} />

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Shop by Category</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Explore the most active segments in the student marketplace.</p>
          </div>
          <button
            onClick={() => onNavigate('Marketplace')}
            className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-400"
          >
            Browse all
          </button>
        </div>

        {categoryCards.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {categoryCards.map((category) => (
              <button
                key={category.name}
                onClick={() => onNavigate('Marketplace', { category: category.name })}
                className="group relative h-36 overflow-hidden rounded-2xl border border-slate-200/70 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:shadow-cyan-950/20"
              >
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent transition-opacity duration-300 group-hover:from-black/85 group-hover:via-black/25" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-white transition-colors group-hover:text-cyan-100">{category.name}</p>
                  <p className="text-[11px] text-white/80 transition-colors group-hover:text-cyan-100/90">
                    {category.count} items from ₹{Math.max(0, Number(category.minPrice || 0)).toFixed(0)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Categories will appear once listings are available.</p>
        )}
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Campus Hot Deals</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Freshly picked listings with competitive student pricing.</p>
          </div>
          <button
            onClick={() => onNavigate('Marketplace')}
            className="text-sm font-semibold text-cyan-700 transition-colors hover:text-cyan-800 hover:underline hover:underline-offset-4 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            View all deals
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {curatedDeals.map((item) => (
            <motion.div
              key={`deal-${item.id}`}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/70 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-cyan-950/20"
            >
              <p className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700 transition-colors group-hover:bg-cyan-100 dark:bg-cyan-900/25 dark:text-cyan-300 dark:group-hover:bg-cyan-900/40">
                {item.isPrimeExclusive ? 'Prime Pick' : 'Limited Drop'}
              </p>
              <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] text-base font-bold text-slate-900 transition-colors group-hover:text-cyan-800 dark:text-white dark:group-hover:text-cyan-300">{item.name}</h3>
              <div className="relative mt-3 overflow-hidden rounded-xl">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-28 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/30 via-slate-900/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-cyan-700 transition-colors group-hover:text-cyan-800 dark:text-cyan-400 dark:group-hover:text-cyan-300">₹{Number(item.price || 0).toFixed(2)}</span>
                <button
                  onClick={() => onNavigate('ProductDetail', item)}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-cyan-300"
                >
                  View deal
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Featured Products</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Popular listings curated for quick discovery and faster checkout.</p>
          </div>
          <button
            onClick={() => onNavigate('Marketplace')}
            className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-400"
          >
            View all
          </button>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                compact
                onProductSelect={(selected) => onNavigate('ProductDetail', selected)}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-slate-600 dark:text-slate-300">
              {allProducts.length === 0
                ? 'No products loaded yet. Visit Marketplace to browse listings.'
                : 'More featured products will appear here as new listings are added.'}
            </p>
            <button
              onClick={() => onNavigate('Marketplace')}
              className="mt-4 rounded-md bg-cyan-700 px-4 py-2 font-medium text-white hover:bg-cyan-800"
            >
              Go to Marketplace
            </button>
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default Home;