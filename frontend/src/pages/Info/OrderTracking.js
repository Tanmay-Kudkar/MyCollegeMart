import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../../context/GlobalStateContext';
import { orders } from '../../utils/api';

const statusColor = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PLACED' || normalized === 'PAID') return 'text-green-600 dark:text-green-400';
  if (normalized.includes('PENDING')) return 'text-amber-600 dark:text-amber-400';
  return 'text-slate-600 dark:text-slate-400';
};

const OrderTracking = ({ onNavigate }) => {
  const { state } = useGlobalState();
  const [status, setStatus] = useState('loading');
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!state.isLoggedIn) {
      setStatus('idle');
      setItems([]);
      return;
    }

    orders.getMyOrders()
      .then((response) => {
        setItems(Array.isArray(response.data) ? response.data : []);
        setStatus('succeeded');
      })
      .catch(() => {
        setStatus('failed');
      });
  }, [state.isLoggedIn]);

  if (!state.isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-2">
        <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Track Your Orders</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Please sign in to view your order history.</p>
          <button
            onClick={() => onNavigate('Login')}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
          >
            Go to Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-2">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-4xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
      >
        <div className="flex items-center mb-6">
          <span className="text-3xl mr-3">🚚</span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Track Your Orders</h1>
        </div>

        {status === 'loading' && (
          <p className="text-slate-600 dark:text-slate-300">Loading your orders...</p>
        )}

        {status === 'failed' && (
          <p className="text-rose-600 dark:text-rose-400">Unable to load order history right now.</p>
        )}

        {status === 'succeeded' && items.length === 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            No orders yet. Place your first order from the marketplace.
          </div>
        )}

        {status === 'succeeded' && items.length > 0 && (
          <div className="space-y-4">
            {items.map((order) => (
              <div key={order.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">#{order.orderNumber}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${statusColor(order.orderStatus)}`}>{order.orderStatus}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Payment: {order.paymentStatus}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Delivery</p>
                    <p className="font-medium text-slate-900 dark:text-white">{order.deliveryOption || 'Library Pickup Point'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Amount Paid</p>
                    <p className="font-medium text-slate-900 dark:text-white">₹{Number(order.amountPaid || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Amount Due</p>
                    <p className="font-medium text-slate-900 dark:text-white">₹{Number(order.amountDue || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrderTracking;
