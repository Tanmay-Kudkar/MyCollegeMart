import { useEffect, useMemo, useState } from 'react';
import { seller } from '../../utils/api';
import { useGlobalState } from '../../context/GlobalStateContext';

const SellerDashboard = ({ onNavigate }) => {
  const { state } = useGlobalState();
  const [status, setStatus] = useState('loading');
  const [dashboard, setDashboard] = useState(null);

  const isMerchant = (state.user?.accountType || 'INDIVIDUAL').toUpperCase() === 'MERCHANT';
  const canManageListings = Boolean(state.user?.canManageListings);
  const verificationStatus = (state.user?.merchantVerificationStatus || (isMerchant ? 'PENDING' : 'NOT_REQUIRED')).toUpperCase();

  useEffect(() => {
    if (!state.isLoggedIn || !isMerchant || !canManageListings) {
      setStatus('idle');
      return;
    }

    seller.getDashboard()
      .then((response) => {
        setDashboard(response.data || null);
        setStatus('succeeded');
      })
      .catch(() => {
        setStatus('failed');
      });
  }, [state.isLoggedIn, isMerchant, canManageListings]);

  const listings = useMemo(() => {
    const allListings = Array.isArray(dashboard?.recentListings) ? dashboard.recentListings : [];
    const currentUserId = Number(state.user?.id);
    if (!Number.isFinite(currentUserId)) {
      return [];
    }

    return allListings.filter((item) => Number(item?.listedByUserId) === currentUserId);
  }, [dashboard, state.user?.id]);

  if (!state.isLoggedIn) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in required</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Please sign in with your Merchant account.</p>
        <button
          onClick={() => onNavigate?.('Login')}
          className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          Go to Sign in
        </button>
      </div>
    );
  }

  if (!isMerchant) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Merchant access required</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Seller dashboard is available only for campus Merchant accounts.
        </p>
        <button
          onClick={() => onNavigate?.('Sell')}
          className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          Open Seller Flow
        </button>
      </div>
    );
  }

  if (!canManageListings) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verification pending</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Complete your Merchant profile in Account to unlock dashboard tools. Current status: {verificationStatus}.
        </p>
        <button
          onClick={() => onNavigate?.('Account')}
          className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          Go to Account
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return <div className="py-12 text-center text-slate-600 dark:text-slate-300">Loading seller dashboard...</div>;
  }

  if (status === 'failed') {
    return <div className="py-12 text-center text-rose-500">Failed to load dashboard data.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Seller Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Sales</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">₹{Number(dashboard?.estimatedSales || 0).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active Listings</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{listings.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Seller Rating</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{Number(dashboard?.averageRating || 0).toFixed(1)}/5</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900 dark:text-white">My Listings</h2>
      {listings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <p className="text-slate-600 dark:text-slate-300">No listings available yet.</p>
          <button
            onClick={() => onNavigate?.('Sell')}
            className="mt-4 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            Add First Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-md" />
              ) : (
                <div className="w-full h-40 rounded-md bg-gradient-to-br from-cyan-600 via-indigo-700 to-slate-900" />
              )}
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white line-clamp-2">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.description || 'No description provided.'}</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">₹{Number(item.price || 0).toFixed(2)}</span>
                <span className="text-slate-500 dark:text-slate-400">★ {Number(item.rating || 0).toFixed(1)}</span>
              </div>
              <p className={`mt-2 text-xs font-semibold ${item.inStock === false ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {item.inStock === false
                  ? 'Out of stock'
                  : item.stockQuantity != null
                    ? `In stock (${item.stockQuantity})`
                    : 'In stock'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.('Sell', { mode: 'edit', productId: item.id })}
                className="mt-3 w-full rounded-md border border-cyan-600/40 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-900/20 dark:text-cyan-300 dark:hover:bg-cyan-900/30"
              >
                Edit Listing
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
