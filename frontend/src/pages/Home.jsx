import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';
import ProductCard from '../components/product/ProductCard';

const Home = ({ onNavigate }) => {
  const { state } = useGlobalState();

  const allProducts = useMemo(
    () => (Array.isArray(state.products?.items) ? state.products.items : []),
    [state.products?.items]
  );

  const featuredProducts = useMemo(() => allProducts.slice(0, 8), [allProducts]);

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

  const heroSpotlight = featuredProducts[0] || null;
  const curatedDeals = useMemo(() => featuredProducts.slice(0, 4), [featuredProducts]);

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

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 top-16 h-64 w-64 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute right-0 top-[24rem] h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl dark:bg-indigo-800/20" />
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-[1.75fr_1fr]">
          <div className="relative overflow-hidden p-6 sm:p-8 md:p-10 text-white bg-gradient-to-br from-[#10255f] via-[#114784] to-[#117985]">
            {heroSpotlight?.imageUrl && (
              <img
                src={heroSpotlight.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-[0.16]"
              />
            )}
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -left-14 -bottom-24 h-64 w-64 rounded-full bg-blue-950/70 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Campus Commerce Dashboard
              </div>

              <h1 className="mcm-display mt-4 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
                Discover Better Deals, Faster
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">
                Shop verified student listings, track flash offers, and manage buying and selling from one premium storefront.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('Marketplace')}
                  className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-900 shadow hover:bg-amber-500"
                >
                  Shop Now
                </button>
                <button
                  onClick={() => onNavigate('Sell')}
                  className="rounded-lg border border-white/35 px-5 py-3 font-semibold text-white hover:bg-white/10"
                >
                  Start Selling
                </button>
                <button
                  onClick={() => onNavigate('PrimeMembership')}
                  className="rounded-lg border border-cyan-200/40 px-5 py-3 font-semibold text-cyan-100 hover:bg-cyan-400/15"
                >
                  Prime Benefits
                </button>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/20 bg-white/[0.11] p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/70">Live Listings</p>
                  <p className="mt-1 text-xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/[0.11] p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/70">Prime Exclusive</p>
                  <p className="mt-1 text-xl font-bold">{stats.prime}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/[0.11] p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/70">Avg Price</p>
                  <p className="mt-1 text-xl font-bold">₹{stats.average.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-l border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-700 dark:bg-slate-900/70 sm:p-6">
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
                whileHover={{ y: -2 }}
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

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
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
                className="group relative h-36 overflow-hidden rounded-2xl border border-slate-200/70 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700"
              >
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{category.name}</p>
                  <p className="text-[11px] text-white/80">
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
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Campus Hot Deals</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Freshly picked listings with competitive student pricing.</p>
          </div>
          <button
            onClick={() => onNavigate('Marketplace')}
            className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-400"
          >
            View all deals
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {curatedDeals.map((item) => (
            <motion.div
              key={`deal-${item.id}`}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-400">
                {item.isPrimeExclusive ? 'Prime Pick' : 'Limited Drop'}
              </p>
              <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] text-base font-bold text-slate-900 dark:text-white">{item.name}</h3>
              <img src={item.imageUrl} alt={item.name} className="mt-3 h-28 w-full rounded-xl object-cover" />
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-cyan-700 dark:text-cyan-400">₹{Number(item.price || 0).toFixed(2)}</span>
                <button
                  onClick={() => onNavigate('ProductDetail', item)}
                  className="text-sm font-semibold text-slate-700 hover:text-cyan-700 dark:text-slate-200 dark:hover:text-cyan-400"
                >
                  View deal
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
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
            <p className="text-slate-600 dark:text-slate-300">No products loaded yet. Visit Marketplace to browse listings.</p>
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