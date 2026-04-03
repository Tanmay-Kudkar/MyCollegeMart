import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';
import FlashDealBanner from '../components/common/FlashDealBanner';
import ProductCard from '../components/product/ProductCard';

const Home = ({ onNavigate }) => {
  const { state } = useGlobalState();

  const featuredProducts = useMemo(() => {
    const items = Array.isArray(state.products?.items) ? state.products.items : [];
    return items.slice(0, 6);
  }, [state.products?.items]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-8 md:p-12 text-white shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold">Buy, Sell, and Save on Campus</h1>
          <p className="mt-3 text-white/80 text-lg">
            Discover books, gadgets, lab items, and student essentials in one trusted campus marketplace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('Marketplace')}
              className="px-5 py-3 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold"
            >
              Explore Marketplace
            </button>
            <button
              onClick={() => onNavigate('Sell')}
              className="px-5 py-3 rounded-lg border border-white/30 hover:bg-white/10 text-white font-semibold"
            >
              Sell an Item
            </button>
            <button
              onClick={() => onNavigate('PrimeMembership')}
              className="px-5 py-3 rounded-lg border border-fuchsia-300/40 hover:bg-fuchsia-500/20 text-fuchsia-100 font-semibold"
            >
              View Prime Benefits
            </button>
          </div>
        </div>
      </section>

      <FlashDealBanner onNavigate={onNavigate} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Featured Products</h2>
          <button
            onClick={() => onNavigate('Marketplace')}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            View all
          </button>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6"
          >
            <p className="text-slate-600 dark:text-slate-300">No products loaded yet. Visit Marketplace to browse listings.</p>
            <button
              onClick={() => onNavigate('Marketplace')}
              className="mt-4 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
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