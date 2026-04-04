import { useEffect, useMemo, useState } from 'react';
import { seller } from '../../utils/api';

const SellerDashboard = ({ onNavigate }) => {
  const [status, setStatus] = useState('loading');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    seller.getDashboard()
      .then((response) => {
        setDashboard(response.data || null);
        setStatus('succeeded');
      })
      .catch(() => {
        setStatus('failed');
      });
  }, []);

  const listings = useMemo(
    () => Array.isArray(dashboard?.recentListings) ? dashboard.recentListings : [],
    [dashboard]
  );

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
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{dashboard?.activeListings || 0}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">Seller Rating</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{Number(dashboard?.averageRating || 0).toFixed(1)}/5</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900 dark:text-white">Recent Listings (from database)</h2>
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
              <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-md" />
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white line-clamp-2">{item.name}</h3>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">₹{Number(item.price || 0).toFixed(2)}</span>
                <span className="text-slate-500 dark:text-slate-400">★ {Number(item.rating || 0).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
