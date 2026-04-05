import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState } from '../../context/GlobalStateContext';
import { orders } from '../../utils/api';

const STAGE_LABELS = {
  PENDING_PAYMENT: 'Pending Payment',
  PLACED: 'Order Placed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  READY_FOR_PICKUP: 'Ready for Pickup',
  DELIVERED: 'Delivered'
};

const DELIVERY_STEPS = ['PLACED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const PICKUP_STEPS = ['PLACED', 'READY_FOR_PICKUP', 'DELIVERED'];

const FILTERS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'PENDING_PAYMENT', label: 'Pending Payment' }
];
const ORDER_TRACKING_FETCH_TIMEOUT_MS = 4000;
const ORDER_TRACKING_RETRY_MS = 1000;

const normalizeStage = (stage) => String(stage || '').trim().toUpperCase();

const isPickupOrder = (order) => /pickup|collect/i.test(String(order?.deliveryOption || ''));

const stageLabel = (stage) => STAGE_LABELS[normalizeStage(stage)] || 'Processing';

const stageBadgeClass = (stage) => {
  const normalized = normalizeStage(stage);
  if (normalized === 'DELIVERED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  }
  if (normalized === 'PENDING_PAYMENT') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
  }
  if (normalized === 'OUT_FOR_DELIVERY' || normalized === 'READY_FOR_PICKUP') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300';
  }
  if (normalized === 'SHIPPED' || normalized === 'PACKED') {
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200';
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount, currency = 'INR') => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(value);
};

const buildSearchText = (order) => {
  const itemNames = Array.isArray(order?.items)
    ? order.items.map((item) => item?.name).filter(Boolean).join(' ')
    : '';

  return [order?.orderNumber, order?.trackingNumber, order?.carrierName, itemNames]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const buildOrderTrackingQueryFromParams = (pageParams = {}) => {
  const orderNumber = String(pageParams?.orderNumber || pageParams?.orderId || '').trim();
  const trackingNumber = String(pageParams?.trackingNumber || '').trim();
  return orderNumber || trackingNumber || '';
};

const resolveBucket = (order) => {
  const stage = normalizeStage(order?.trackingStage || order?.orderStatus);

  if (stage === 'DELIVERED') {
    return 'DELIVERED';
  }

  if (stage === 'PENDING_PAYMENT') {
    return 'PENDING_PAYMENT';
  }

  return 'IN_TRANSIT';
};

const getProgressValue = (order, steps, stage) => {
  const backendProgress = Number(order?.trackingProgress);
  if (Number.isFinite(backendProgress)) {
    return Math.min(100, Math.max(5, backendProgress));
  }

  const currentIndex = steps.indexOf(stage);
  if (currentIndex < 0) {
    return 8;
  }

  return ((currentIndex + 1) / steps.length) * 100;
};

const buildFallbackEvents = (order) => {
  const stage = normalizeStage(order?.trackingStage || order?.orderStatus);
  if (!stage) {
    return [];
  }

  return [
    {
      eventStatus: stage,
      eventTitle: stageLabel(stage),
      eventDescription: 'Latest status update for your order.',
      eventLocation: order?.currentLocation || 'MyCollegeMart',
      eventTime: order?.lastTrackingUpdateAt || order?.createdAt,
      sortOrder: 0
    }
  ];
};

const getSortedEvents = (order) => {
  const sourceEvents = Array.isArray(order?.trackingEvents) && order.trackingEvents.length > 0
    ? order.trackingEvents
    : buildFallbackEvents(order);

  return [...sourceEvents].sort((a, b) => {
    const orderA = Number(a?.sortOrder ?? 0);
    const orderB = Number(b?.sortOrder ?? 0);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const timeA = new Date(a?.eventTime || 0).getTime();
    const timeB = new Date(b?.eventTime || 0).getTime();
    return timeA - timeB;
  });
};

const OrderTracking = ({ onNavigate, pageParams = {} }) => {
  const { state } = useGlobalState();
  const [status, setStatus] = useState('loading');
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState(() => buildOrderTrackingQueryFromParams(pageParams));
  const [activeFilter, setActiveFilter] = useState('ALL');

  const focusedOrderNumber = String(pageParams?.orderNumber || pageParams?.orderId || '').trim();
  const focusedTrackingNumber = String(pageParams?.trackingNumber || '').trim();

  useEffect(() => {
    let isCancelled = false;

    if (!state.isLoggedIn) {
      setStatus('idle');
      setItems([]);
      return;
    }

    setStatus('loading');

    orders.getMyOrders({ timeout: ORDER_TRACKING_FETCH_TIMEOUT_MS })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setItems(Array.isArray(response.data) ? response.data : []);
        setStatus('succeeded');
      })
      .catch(() => {
        if (!isCancelled) {
          setStatus('failed');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [state.isLoggedIn]);

  useEffect(() => {
    if (!state.isLoggedIn || status !== 'failed' || typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;

    const attemptReloadOrders = () => {
      orders.getMyOrders({ timeout: ORDER_TRACKING_FETCH_TIMEOUT_MS })
        .then((response) => {
          if (isCancelled) {
            return;
          }

          setItems(Array.isArray(response.data) ? response.data : []);
          setStatus('succeeded');
        })
        .catch(() => {
          // Keep retrying in background until backend responds.
        });
    };

    attemptReloadOrders();
    const retryInterval = window.setInterval(attemptReloadOrders, ORDER_TRACKING_RETRY_MS);
    window.addEventListener('online', attemptReloadOrders);

    return () => {
      isCancelled = true;
      window.clearInterval(retryInterval);
      window.removeEventListener('online', attemptReloadOrders);
    };
  }, [state.isLoggedIn, status]);

  useEffect(() => {
    const nextQuery = buildOrderTrackingQueryFromParams(pageParams);
    if (!nextQuery) {
      return;
    }

    setQuery((prev) => (prev === nextQuery ? prev : nextQuery));
    setActiveFilter('ALL');
  }, [pageParams?.orderNumber, pageParams?.orderId, pageParams?.trackingNumber]);

  const summary = useMemo(() => {
    const delivered = items.filter((order) => resolveBucket(order) === 'DELIVERED').length;
    const pendingPayment = items.filter((order) => resolveBucket(order) === 'PENDING_PAYMENT').length;
    const inTransit = Math.max(0, items.length - delivered - pendingPayment);

    return {
      total: items.length,
      delivered,
      pendingPayment,
      inTransit
    };
  }, [items]);

  const filteredOrders = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    return items.filter((order) => {
      const matchesFilter = activeFilter === 'ALL' || resolveBucket(order) === activeFilter;
      if (!matchesFilter) {
        return false;
      }

      if (!trimmedQuery) {
        return true;
      }

      return buildSearchText(order).includes(trimmedQuery);
    });
  }, [activeFilter, items, query]);

  if (!state.isLoggedIn) {
    return (
      <div className="min-h-[70vh] bg-slate-100 px-3 py-10 dark:bg-slate-950 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">MyCollegeMart Tracking</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">Track every order in one place</h1>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Sign in to view live shipping timeline, courier updates, and delivery ETA.
          </p>
          <button
            onClick={() => onNavigate('Login')}
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Go to Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-slate-100 px-3 py-5 dark:bg-slate-950 sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-sky-900 via-sky-800 to-amber-500 p-5 text-white shadow-xl sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Order Tracking Center</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">Your deliveries with clear tracking</h1>
          <p className="mt-2 max-w-2xl text-sm text-sky-50/90 sm:text-base">
            Track status, courier, ETA and every movement of your package from seller desk to your doorstep.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">Total</p>
              <p className="mt-1 text-2xl font-bold">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">In Transit</p>
              <p className="mt-1 text-2xl font-bold">{summary.inTransit}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">Delivered</p>
              <p className="mt-1 text-2xl font-bold">{summary.delivered}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">Pending Pay</p>
              <p className="mt-1 text-2xl font-bold">{summary.pendingPayment}</p>
            </div>
          </div>
        </motion.section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search by order no, tracking no, item name"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-sky-900"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    activeFilter === filter.id
                      ? 'bg-sky-700 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {(focusedOrderNumber || focusedTrackingNumber) && (
            <div className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-sky-200">
              Focused: {focusedOrderNumber ? `Order #${focusedOrderNumber}` : `Tracking #${focusedTrackingNumber}`}
            </div>
          )}
        </section>

        {status === 'loading' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Loading your latest tracking details...
          </div>
        )}

        {status === 'failed' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            Reconnecting to the server. Your tracking timeline will update automatically.
          </div>
        )}

        {status === 'succeeded' && items.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Place your first order and track it here in real time.</p>
            <button
              onClick={() => onNavigate('Marketplace')}
              className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
            >
              Browse Marketplace
            </button>
          </div>
        )}

        {status === 'succeeded' && items.length > 0 && filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No orders matched your current filters.
          </div>
        )}

        {status === 'succeeded' && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const normalizedStage = normalizeStage(order.trackingStage || order.orderStatus);
              const pickupOrder = isPickupOrder(order);
              const steps = pickupOrder ? PICKUP_STEPS : DELIVERY_STEPS;
              const currentStepIndex = steps.indexOf(normalizedStage);
              const progress = getProgressValue(order, steps, normalizedStage);
              const eventTimeline = getSortedEvents(order).slice().reverse();
              const orderItems = Array.isArray(order.items) ? order.items : [];

              return (
                <motion.article
                  key={order.id || order.orderNumber}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.04 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Order</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">#{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Placed {formatDateTime(order.createdAt)}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Tracking ID</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{order.trackingNumber || 'Generating...'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.carrierName || 'Courier allocation pending'}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Delivery ETA</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatDateTime(order.estimatedDeliveryAt)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{order.deliveryOption || 'Standard delivery'}</p>
                    </div>

                    <div className="sm:text-right lg:text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Order Value</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(order.amountPaid || order.subtotal, order.currency || 'INR')}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stageBadgeClass(normalizedStage)}`}>
                        {stageLabel(normalizedStage)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigate('OrderTracking', {
                          orderNumber: order.orderNumber,
                          trackingNumber: order.trackingNumber,
                        })}
                        className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500/50 dark:hover:bg-sky-900/20 dark:hover:text-sky-300"
                      >
                        Track
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 p-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          <span>Shipment Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-sky-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {steps.map((step, stepIndex) => {
                            const completed = currentStepIndex >= stepIndex;
                            const active = currentStepIndex === stepIndex;

                            return (
                              <div
                                key={`${order.id}-${step}`}
                                className={`min-w-[122px] rounded-xl border px-3 py-2 text-xs ${
                                  completed
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300'
                                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                                } ${active ? 'ring-2 ring-amber-300 dark:ring-amber-500/50' : ''}`}
                              >
                                <p className="font-semibold">{stageLabel(step)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Items in this order</p>
                        {orderItems.length > 0 ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {orderItems.slice(0, 4).map((item, itemIndex) => (
                              <div
                                key={`${order.id}-item-${item.id || itemIndex}`}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                              >
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name || 'Campus item'}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Qty {item.quantity || 1} · {formatCurrency(item.lineTotal || 0, order.currency || 'INR')}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Order items are being prepared.</p>
                        )}
                      </div>
                    </div>

                    <aside className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Latest Location</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{order.currentLocation || 'Awaiting location update'}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Courier support: {order.carrierContact || 'Not assigned yet'}</p>

                      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Tracking timeline</p>
                        <ul className="mt-3 space-y-3">
                          {eventTimeline.slice(0, 5).map((event, timelineIndex) => (
                            <li key={`${order.id}-event-${event.eventStatus}-${timelineIndex}`} className="relative pl-4">
                              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{event.eventTitle || stageLabel(event.eventStatus)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{event.eventLocation || 'MyCollegeMart'} · {formatDateTime(event.eventTime)}</p>
                              {event.eventDescription && (
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.eventDescription}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </aside>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
