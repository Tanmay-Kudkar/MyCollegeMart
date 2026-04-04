import { useEffect, useState } from 'react';
import { admin } from '../../utils/api';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED'];

const AdminMerchantPanel = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [updatingId, setUpdatingId] = useState(null);

  const isAdmin = Boolean(state.user?.isAdmin);

  const loadRequests = async (targetStatus = activeStatus) => {
    setStatus('loading');
    try {
      const response = await admin.getMerchantRequests(targetStatus);
      const payload = response?.data;
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setStatus('succeeded');
    } catch (error) {
      setStatus('failed');
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: error?.response?.data?.message || error?.message || 'Failed to load merchant requests.',
          type: 'error',
        },
      });
    }
  };

  useEffect(() => {
    if (!state.isLoggedIn || !isAdmin) {
      setStatus('idle');
      return;
    }

    loadRequests(activeStatus);
  }, [state.isLoggedIn, isAdmin, activeStatus]);

  const handleDecision = async (merchantId, decision) => {
    if (!merchantId) {
      return;
    }

    setUpdatingId(merchantId);
    try {
      if (decision === 'approve') {
        await admin.approveMerchant(merchantId);
      } else {
        await admin.rejectMerchant(merchantId);
      }

      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: decision === 'approve' ? 'Merchant approved.' : 'Merchant rejected.',
          type: 'success',
        },
      });

      loadRequests(activeStatus);
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: error?.response?.data?.message || error?.message || 'Failed to update merchant status.',
          type: 'error',
        },
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!state.isLoggedIn) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in required</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Admin sign in is required to review merchants.</p>
        <button
          onClick={() => onNavigate?.('Login')}
          className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          Go to Sign in
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin access required</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          This area is only available for admin users configured in backend settings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Merchant Verification Panel</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Review merchant profiles manually and approve listing permissions.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setActiveStatus(option)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${activeStatus === option
              ? 'bg-cyan-700 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
          >
            {option}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className="mt-6 text-slate-600 dark:text-slate-300">Loading merchant requests...</p>
      )}

      {status === 'failed' && (
        <p className="mt-6 text-rose-500">Failed to load merchant requests.</p>
      )}

      {status === 'succeeded' && items.length === 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-600 dark:text-slate-300">No merchant requests found for status {activeStatus}.</p>
        </div>
      )}

      {status === 'succeeded' && items.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4">
          {items.map((merchant) => (
            <div
              key={merchant.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {merchant.shopName || merchant.displayName || merchant.email}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{merchant.email}</p>
                  {merchant.shopTagline && (
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{merchant.shopTagline}</p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {merchant.merchantVerificationStatus || activeStatus}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Phone:</span> {merchant.shopPhone || 'Not provided'}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Campus Location:</span> {merchant.shopCampusLocation || 'Not provided'}
                </p>
              </div>

              {activeStatus === 'PENDING' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision(merchant.id, 'approve')}
                    disabled={updatingId === merchant.id}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(merchant.id, 'reject')}
                    disabled={updatingId === merchant.id}
                    className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMerchantPanel;
