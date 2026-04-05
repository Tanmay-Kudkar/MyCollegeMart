import { useEffect, useMemo, useState } from 'react';
import { seller } from '../../utils/api';
import { useGlobalState } from '../../context/GlobalStateContext';
import PrimeJoinBanner from '../../components/common/PrimeJoinBanner';

const SELLER_DASHBOARD_FETCH_TIMEOUT_MS = 4000;
const SELLER_DASHBOARD_RETRY_MS = 1000;

const SellerDashboard = ({ onNavigate }) => {
  const { state } = useGlobalState();
  const [status, setStatus] = useState('loading');
  const [dashboard, setDashboard] = useState(null);

  const isMerchant = (state.user?.accountType || 'INDIVIDUAL').toUpperCase() === 'MERCHANT';
  const canManageListings = Boolean(state.user?.canManageListings);
  const isAdmin = Boolean(state.user?.isAdmin);
  const hasSellerAccess = canManageListings || isAdmin;
  const verificationStatus = (state.user?.merchantVerificationStatus || (isMerchant ? 'PENDING' : 'NOT_REQUIRED')).toUpperCase();

  useEffect(() => {
    let isCancelled = false;

    if (!state.isLoggedIn || (!isMerchant && !isAdmin) || !hasSellerAccess) {
      setStatus('idle');
      return;
    }

    setStatus('loading');

    seller.getDashboard({ timeout: SELLER_DASHBOARD_FETCH_TIMEOUT_MS })
      .then((response) => {
        if (!isCancelled) {
          setDashboard(response.data || null);
          setStatus('succeeded');
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setStatus('failed');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [state.isLoggedIn, isMerchant, isAdmin, hasSellerAccess]);

  useEffect(() => {
    if (status !== 'failed' || !state.isLoggedIn || (!isMerchant && !isAdmin) || !hasSellerAccess || typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;

    const attemptReloadDashboard = () => {
      seller.getDashboard({ timeout: SELLER_DASHBOARD_FETCH_TIMEOUT_MS })
        .then((response) => {
          if (!isCancelled) {
            setDashboard(response.data || null);
            setStatus('succeeded');
          }
        })
        .catch(() => {
          // Keep retrying until backend responds.
        });
    };

    attemptReloadDashboard();
    const retryInterval = window.setInterval(attemptReloadDashboard, SELLER_DASHBOARD_RETRY_MS);
    window.addEventListener('online', attemptReloadDashboard);

    return () => {
      isCancelled = true;
      window.clearInterval(retryInterval);
      window.removeEventListener('online', attemptReloadDashboard);
    };
  }, [status, state.isLoggedIn, isMerchant, isAdmin, hasSellerAccess]);

  const listings = useMemo(() => {
    const allListings = Array.isArray(dashboard?.recentListings) ? dashboard.recentListings : [];
    if (isAdmin) {
      return allListings;
    }

    const currentUserId = Number(state.user?.id);
    if (!Number.isFinite(currentUserId)) {
      return [];
    }

    return allListings.filter((item) => Number(item?.listedByUserId) === currentUserId);
  }, [dashboard, isAdmin, state.user?.id]);

  const activeListingsCount = useMemo(() => {
    const fromApi = Number(dashboard?.activeListings);
    if (Number.isFinite(fromApi) && fromApi >= 0) {
      return fromApi;
    }

    return listings.length;
  }, [dashboard?.activeListings, listings.length]);

  const unansweredQuestions = Number(dashboard?.unansweredQuestions || 0);

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

  if (!isMerchant && !isAdmin) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Seller access required</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Seller dashboard is available for Merchant or Admin accounts.
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

  if (!hasSellerAccess) {
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
    return <div className="py-12 text-center text-amber-700 dark:text-amber-300">Reconnecting to the server. Seller dashboard will update automatically.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Seller Dashboard</h1>

      {!isAdmin && !state.user?.isPrimeMember && (
        <div className="mt-6">
          <PrimeJoinBanner onNavigate={onNavigate} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Sales</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">₹{Number(dashboard?.estimatedSales || 0).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active Listings</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{activeListingsCount}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Seller Rating</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{Number(dashboard?.averageRating || 0).toFixed(1)}/5</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Open Q&amp;A</p>
          <p className={`text-3xl font-bold ${unansweredQuestions > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
            {unansweredQuestions}
          </p>
        </div>
      </div>

      <div className="mt-10 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{isAdmin ? 'All Listings' : 'My Listings'}</h2>
        <button
          type="button"
          onClick={() => onNavigate?.('Sell')}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
        >
          Add Listing
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <p className="text-slate-600 dark:text-slate-300">{isAdmin ? 'No listings found yet.' : 'No listings available yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
              <div className="relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-md" />
                ) : (
                  <div className="w-full h-40 rounded-md bg-gradient-to-br from-cyan-600 via-indigo-700 to-slate-900" />
                )}
                {Number(item.openQuestionCount || 0) > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-1 text-[11px] font-semibold text-slate-900 shadow">
                    {Number(item.openQuestionCount)} open Q&amp;A
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white line-clamp-2">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.description || 'No description provided.'}</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">₹{Number(item.price || 0).toFixed(2)}</span>
                <span className="text-slate-500 dark:text-slate-400">★ {Number(item.rating || 0).toFixed(1)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Q&amp;A: {Number(item.openQuestionCount || 0)} open / {Number(item.totalQuestionCount || 0)} total
              </p>
              {isAdmin && (
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Listed by user ID: {item.listedByUserId ?? 'Unknown'}
                </p>
              )}
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
