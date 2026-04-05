import { useEffect, useMemo, useState } from 'react';
import { admin, primeMembership as primeMembershipApi } from '../../utils/api';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { getErrorMessage } from '../../utils/errorHandling/errorMessageUtils';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED'];
const FEEDBACK_TYPE_OPTIONS = ['ALL', 'DOWN', 'UP'];

const TRACKING_STAGE_OPTIONS = [
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PLACED', label: 'Order Placed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'DELIVERED', label: 'Delivered' },
];

const TRACKING_STAGE_LABEL_MAP = TRACKING_STAGE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const normalizeTrackingStage = (stage) => String(stage || '').toUpperCase();

const TRACKING_STAGE_RANK = {
  PENDING_PAYMENT: 0,
  PLACED: 1,
  PACKED: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  READY_FOR_PICKUP: 4,
  DELIVERED: 5,
};

const DELIVERY_QUICK_ACTIONS = [
  {
    stage: 'PACKED',
    label: 'Mark Packed',
    eventTitle: 'Packed at fulfillment center',
    eventDescription: 'Package packed and ready for dispatch.',
    eventLocation: 'Regional fulfillment center',
  },
  {
    stage: 'SHIPPED',
    label: 'Mark Shipped',
    eventTitle: 'Shipped',
    eventDescription: 'Package handed to line-haul courier and moved in transit.',
    eventLocation: 'In transit',
  },
  {
    stage: 'OUT_FOR_DELIVERY',
    label: 'Mark Out for Delivery',
    eventTitle: 'Out for delivery',
    eventDescription: 'Package reached local hub and left for final delivery.',
    eventLocation: 'Local delivery hub',
  },
  {
    stage: 'DELIVERED',
    label: 'Mark Delivered',
    eventTitle: 'Delivered',
    eventDescription: 'Delivery completed successfully.',
    eventLocation: 'Delivery address',
  },
];

const PICKUP_QUICK_ACTIONS = [
  {
    stage: 'PACKED',
    label: 'Mark Packed',
    eventTitle: 'Packed for pickup',
    eventDescription: 'Package packed and moved to pickup staging area.',
    eventLocation: 'Regional fulfillment center',
  },
  {
    stage: 'READY_FOR_PICKUP',
    label: 'Mark Ready for Pickup',
    eventTitle: 'Ready for pickup',
    eventDescription: 'Package is ready at the campus pickup counter.',
    eventLocation: 'Campus pickup counter',
  },
  {
    stage: 'DELIVERED',
    label: 'Mark Picked Up',
    eventTitle: 'Picked up',
    eventDescription: 'Customer collected the package from pickup counter.',
    eventLocation: 'Campus pickup counter',
  },
];

const trackingStageLabel = (stage) => TRACKING_STAGE_LABEL_MAP[String(stage || '').toUpperCase()] || 'Processing';

const trackingStageChipClass = (stage) => {
  const normalizedStage = normalizeTrackingStage(stage);

  if (normalizedStage === 'DELIVERED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
  }

  if (normalizedStage === 'OUT_FOR_DELIVERY' || normalizedStage === 'READY_FOR_PICKUP') {
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300';
  }

  if (normalizedStage === 'SHIPPED' || normalizedStage === 'PACKED') {
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
  }

  if (normalizedStage === 'PENDING_PAYMENT') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
  }

  return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
};

const isPickupDeliveryOption = (deliveryOption) => /pickup|collect/i.test(String(deliveryOption || ''));

const getQuickActionsForOrder = (order) => (
  isPickupDeliveryOption(order?.deliveryOption)
    ? PICKUP_QUICK_ACTIONS
    : DELIVERY_QUICK_ACTIONS
);

const getNextQuickActionForOrder = (order) => {
  const actions = getQuickActionsForOrder(order);
  const currentStage = normalizeTrackingStage(order?.trackingStage || order?.orderStatus);
  const currentRank = TRACKING_STAGE_RANK[currentStage] ?? -1;

  return actions.find((action) => (TRACKING_STAGE_RANK[action.stage] ?? -1) > currentRank) || null;
};

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const pad = (input) => String(input).padStart(2, '0');
  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())}T${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}`;
};

const toIsoOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
};

const DEFAULT_TRACKING_FORM = {
  trackingStage: 'PLACED',
  eventTitle: '',
  eventDescription: '',
  eventLocation: '',
  carrierName: '',
  carrierContact: '',
  trackingNumber: '',
  estimatedDeliveryAt: '',
};

const buildTrackingFormFromOrder = (order) => ({
  ...DEFAULT_TRACKING_FORM,
  trackingStage: String(order?.trackingStage || order?.orderStatus || 'PLACED').toUpperCase(),
  eventLocation: order?.currentLocation || '',
  carrierName: order?.carrierName || '',
  carrierContact: order?.carrierContact || '',
  trackingNumber: order?.trackingNumber || '',
  estimatedDeliveryAt: toDateTimeLocalValue(order?.estimatedDeliveryAt),
});

const DEFAULT_PRICING_CONFIG = {
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

const normalizePricingConfig = (payload) => ({
  currency: payload?.currency || DEFAULT_PRICING_CONFIG.currency,
  primeMembershipYearlyPrice: Number.isFinite(Number(payload?.primeMembershipYearlyPrice))
    ? Number(payload.primeMembershipYearlyPrice)
    : DEFAULT_PRICING_CONFIG.primeMembershipYearlyPrice,
  assignmentPricing: {
    Standard: normalizeTier(payload?.assignmentPricing?.Standard, DEFAULT_PRICING_CONFIG.assignmentPricing.Standard),
    Express: normalizeTier(payload?.assignmentPricing?.Express, DEFAULT_PRICING_CONFIG.assignmentPricing.Express),
    Urgent: normalizeTier(payload?.assignmentPricing?.Urgent, DEFAULT_PRICING_CONFIG.assignmentPricing.Urgent),
  },
});

const toPricingDraft = (config) => ({
  primeMembershipYearlyPrice: String(config.primeMembershipYearlyPrice),
  assignmentStandardRegularPrice: String(config.assignmentPricing.Standard.regularPrice),
  assignmentStandardPrimePrice: String(config.assignmentPricing.Standard.primePrice),
  assignmentExpressRegularPrice: String(config.assignmentPricing.Express.regularPrice),
  assignmentExpressPrimePrice: String(config.assignmentPricing.Express.primePrice),
  assignmentUrgentRegularPrice: String(config.assignmentPricing.Urgent.regularPrice),
  assignmentUrgentPrimePrice: String(config.assignmentPricing.Urgent.primePrice),
});

const formatCurrency = (value, currency = 'INR') => (
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
);

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const truncateText = (value, maxLength = 180) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trimEnd()}...`
    : normalized;
};

const AdminMerchantPanel = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [updatingId, setUpdatingId] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [pricingDraft, setPricingDraft] = useState(() => toPricingDraft(DEFAULT_PRICING_CONFIG));
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [showPricingEditor, setShowPricingEditor] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [orderResults, setOrderResults] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState('idle');
  const [trackingTargetOrder, setTrackingTargetOrder] = useState(null);
  const [trackingForm, setTrackingForm] = useState(DEFAULT_TRACKING_FORM);
  const [isPushingTrackingEvent, setIsPushingTrackingEvent] = useState(false);
  const [aiFeedbackQuery, setAiFeedbackQuery] = useState('');
  const [aiFeedbackType, setAiFeedbackType] = useState('ALL');
  const [aiFeedbackItems, setAiFeedbackItems] = useState([]);
  const [aiFeedbackStatus, setAiFeedbackStatus] = useState('idle');

  const isAdmin = Boolean(state.user?.isAdmin);
  const isMasterAdmin = Boolean(state.user?.isMaster);

  const assignmentRows = useMemo(() => ([
    { key: 'Standard', ...pricingConfig.assignmentPricing.Standard },
    { key: 'Express', ...pricingConfig.assignmentPricing.Express },
    { key: 'Urgent', ...pricingConfig.assignmentPricing.Urgent },
  ]), [pricingConfig.assignmentPricing]);

  const quickTrackingActions = useMemo(
    () => getQuickActionsForOrder(trackingTargetOrder),
    [trackingTargetOrder]
  );

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
          message: getErrorMessage(error, 'Failed to load merchant requests.'),
          type: 'error',
        },
      });
    }
  };

  const loadPricingConfig = async () => {
    setIsLoadingPricing(true);
    try {
      const response = await primeMembershipApi.getConfig();
      const normalizedConfig = normalizePricingConfig(response?.data);
      setPricingConfig(normalizedConfig);
      setPricingDraft(toPricingDraft(normalizedConfig));
    } catch (error) {
      setPricingConfig(DEFAULT_PRICING_CONFIG);
      setPricingDraft(toPricingDraft(DEFAULT_PRICING_CONFIG));
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, 'Failed to load pricing configuration.'),
          type: 'error',
        },
      });
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const loadAdminOrders = async ({ query = '', limit = 12 } = {}) => {
    setOrdersStatus('loading');

    try {
      const response = await admin.getOrders({ query, limit });
      const payload = response?.data;
      const loadedOrders = Array.isArray(payload?.items) ? payload.items : [];
      setOrderResults(loadedOrders);
      setOrdersStatus('succeeded');

      setTrackingTargetOrder((previousOrder) => {
        if (!previousOrder) {
          return null;
        }

        return loadedOrders.find((item) => item.id === previousOrder.id) || null;
      });
    } catch (error) {
      setOrdersStatus('failed');
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, 'Failed to load orders for tracking.'),
          type: 'error',
        },
      });
    }
  };

  const loadAiFeedback = async ({ sessionId = aiFeedbackQuery, feedbackType = aiFeedbackType, limit = 20 } = {}) => {
    setAiFeedbackStatus('loading');

    try {
      const normalizedFeedbackType = feedbackType === 'ALL' ? '' : feedbackType;
      const response = await admin.getAiFeedback({
        sessionId,
        feedbackType: normalizedFeedbackType,
        limit,
      });

      const payload = response?.data;
      setAiFeedbackItems(Array.isArray(payload?.items) ? payload.items : []);
      setAiFeedbackStatus('succeeded');
    } catch (error) {
      setAiFeedbackStatus('failed');
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, 'Failed to load AI feedback logs.'),
          type: 'error',
        },
      });
    }
  };

  const handleAiFeedbackSearch = async (event) => {
    event.preventDefault();
    await loadAiFeedback({ sessionId: aiFeedbackQuery, feedbackType: aiFeedbackType, limit: 40 });
  };

  const handleTrackingOrderSearch = async (event) => {
    event.preventDefault();
    await loadAdminOrders({ query: orderQuery, limit: 20 });
  };

  const handleSelectTrackingOrder = (order) => {
    setTrackingTargetOrder(order);
    setTrackingForm(buildTrackingFormFromOrder(order));
  };

  const handleTrackingFormChange = (field, value) => {
    setTrackingForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const normalizeOptionalText = (value) => {
    const normalized = String(value || '').trim();
    return normalized || null;
  };

  const pushTrackingEvent = async (payload, successMessage) => {
    if (!trackingTargetOrder?.id) {
      return;
    }

    setIsPushingTrackingEvent(true);
    try {
      const response = await admin.addTrackingEvent(trackingTargetOrder.id, payload);
      const updatedOrder = response?.data?.updatedOrder;

      if (updatedOrder && typeof updatedOrder === 'object') {
        setOrderResults((prev) => prev.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)));
        setTrackingTargetOrder(updatedOrder);
        setTrackingForm(buildTrackingFormFromOrder(updatedOrder));
      }

      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: successMessage, type: 'success' },
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, 'Failed to push tracking update.'),
          type: 'error',
        },
      });
    } finally {
      setIsPushingTrackingEvent(false);
    }
  };

  const handlePushTrackingEvent = async () => {
    if (!trackingTargetOrder?.id) {
      return;
    }

    if (!trackingForm.trackingStage) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Tracking stage is required.', type: 'error' },
      });
      return;
    }

    const payload = {
      trackingStage: trackingForm.trackingStage,
      eventTitle: normalizeOptionalText(trackingForm.eventTitle),
      eventDescription: normalizeOptionalText(trackingForm.eventDescription),
      eventLocation: normalizeOptionalText(trackingForm.eventLocation),
      carrierName: normalizeOptionalText(trackingForm.carrierName),
      carrierContact: normalizeOptionalText(trackingForm.carrierContact),
      trackingNumber: normalizeOptionalText(trackingForm.trackingNumber),
      estimatedDeliveryAt: toIsoOrNull(trackingForm.estimatedDeliveryAt),
    };

    await pushTrackingEvent(payload, 'Tracking update pushed successfully.');
  };

  const handleQuickTrackingAction = async (action) => {
    if (!trackingTargetOrder?.id || !action?.stage) {
      return;
    }

    const currentStage = String(trackingTargetOrder.trackingStage || trackingTargetOrder.orderStatus || '').toUpperCase();
    const currentRank = TRACKING_STAGE_RANK[currentStage] ?? -1;
    const requestedRank = TRACKING_STAGE_RANK[action.stage] ?? -1;

    if (requestedRank < currentRank) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Cannot move tracking stage backwards.', type: 'error' },
      });
      return;
    }

    const payload = {
      trackingStage: action.stage,
      eventTitle: action.eventTitle,
      eventDescription: action.eventDescription,
      eventLocation: normalizeOptionalText(trackingForm.eventLocation) || action.eventLocation,
      carrierName: normalizeOptionalText(trackingForm.carrierName),
      carrierContact: normalizeOptionalText(trackingForm.carrierContact),
      trackingNumber: normalizeOptionalText(trackingForm.trackingNumber),
      estimatedDeliveryAt: toIsoOrNull(trackingForm.estimatedDeliveryAt),
    };

    await pushTrackingEvent(payload, `${action.label} update pushed.`);
  };

  useEffect(() => {
    if (!state.isLoggedIn || !isAdmin) {
      setStatus('idle');
      return;
    }

    loadRequests(activeStatus);
  }, [state.isLoggedIn, isAdmin, activeStatus]);

  useEffect(() => {
    if (!state.isLoggedIn || !isAdmin) {
      setIsLoadingPricing(false);
      return;
    }

    loadPricingConfig();
  }, [state.isLoggedIn, isAdmin]);

  useEffect(() => {
    if (!state.isLoggedIn || !isAdmin) {
      setOrdersStatus('idle');
      setOrderResults([]);
      setTrackingTargetOrder(null);
      return;
    }

    loadAdminOrders({ query: '', limit: 12 });
  }, [state.isLoggedIn, isAdmin]);

  useEffect(() => {
    if (!state.isLoggedIn || !isAdmin) {
      setAiFeedbackStatus('idle');
      setAiFeedbackItems([]);
      return;
    }

    loadAiFeedback({ sessionId: '', feedbackType: 'ALL', limit: 20 });
  }, [state.isLoggedIn, isAdmin]);

  const handlePricingDraftChange = (field, value) => {
    setPricingDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetPricingDraft = () => {
    setPricingDraft(toPricingDraft(pricingConfig));
  };

  const handleSavePricing = async () => {
    if (!isMasterAdmin) {
      return;
    }

    const payload = {
      primeMembershipYearlyPrice: Number(pricingDraft.primeMembershipYearlyPrice),
      assignmentStandardRegularPrice: Number(pricingDraft.assignmentStandardRegularPrice),
      assignmentStandardPrimePrice: Number(pricingDraft.assignmentStandardPrimePrice),
      assignmentExpressRegularPrice: Number(pricingDraft.assignmentExpressRegularPrice),
      assignmentExpressPrimePrice: Number(pricingDraft.assignmentExpressPrimePrice),
      assignmentUrgentRegularPrice: Number(pricingDraft.assignmentUrgentRegularPrice),
      assignmentUrgentPrimePrice: Number(pricingDraft.assignmentUrgentPrimePrice),
    };

    const allValuesValid = Object.values(payload).every((value) => Number.isFinite(value) && value > 0);
    if (!allValuesValid) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'All prices must be numbers greater than 0.', type: 'error' },
      });
      return;
    }

    setIsSavingPricing(true);
    try {
      const response = await primeMembershipApi.updateConfig(payload);
      const normalizedConfig = normalizePricingConfig(response?.data);
      setPricingConfig(normalizedConfig);
      setPricingDraft(toPricingDraft(normalizedConfig));
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Pricing updated successfully.', type: 'success' },
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: getErrorMessage(error, 'Failed to update pricing.'), type: 'error' },
      });
    } finally {
      setIsSavingPricing(false);
    }
  };

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
          message: getErrorMessage(error, 'Failed to update merchant status.'),
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

      <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-700/40 dark:bg-cyan-900/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Pricing Control</h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Prime and Assignment pricing is managed only from this admin panel.
            </p>
          </div>
          {isMasterAdmin ? (
            <button
              type="button"
              onClick={() => setShowPricingEditor((prev) => !prev)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {showPricingEditor ? 'Hide Pricing Editor' : 'Edit All Pricing'}
            </button>
          ) : (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              Read-only for admins (Master-only edits)
            </span>
          )}
        </div>

        {isLoadingPricing ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading pricing configuration...</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Prime Membership</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(pricingConfig.primeMembershipYearlyPrice, pricingConfig.currency)}
                <span className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400">/ year</span>
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assignment Help Pricing</p>
              <div className="mt-2 space-y-2 text-sm">
                {assignmentRows.map((row) => (
                  <div key={row.key} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{row.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.eta}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-700 dark:text-slate-300">Regular: {formatCurrency(row.regularPrice, pricingConfig.currency)}</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">Prime: {formatCurrency(row.primePrice, pricingConfig.currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isMasterAdmin && showPricingEditor && (
          <div className="mt-5 space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Prime yearly price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.primeMembershipYearlyPrice}
                  onChange={(event) => handlePricingDraftChange('primeMembershipYearlyPrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Standard regular price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.assignmentStandardRegularPrice}
                  onChange={(event) => handlePricingDraftChange('assignmentStandardRegularPrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Standard prime price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.assignmentStandardPrimePrice}
                  onChange={(event) => handlePricingDraftChange('assignmentStandardPrimePrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Express regular price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.assignmentExpressRegularPrice}
                  onChange={(event) => handlePricingDraftChange('assignmentExpressRegularPrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Express prime price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.assignmentExpressPrimePrice}
                  onChange={(event) => handlePricingDraftChange('assignmentExpressPrimePrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Urgent regular price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.assignmentUrgentRegularPrice}
                  onChange={(event) => handlePricingDraftChange('assignmentUrgentRegularPrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Urgent prime price
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={pricingDraft.assignmentUrgentPrimePrice}
                  onChange={(event) => handlePricingDraftChange('assignmentUrgentPrimePrice', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleSavePricing}
                disabled={isSavingPricing}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isSavingPricing ? 'Saving...' : 'Save Pricing'}
              </button>
              <button
                type="button"
                onClick={handleResetPricingDraft}
                disabled={isSavingPricing}
                className="rounded-lg border border-slate-400 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700/40 dark:bg-amber-900/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order Dispatch Tracking Control</h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Search an order, select it, then push live tracking updates from courier scans.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadAdminOrders({ query: orderQuery, limit: 20 })}
            className="rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Refresh Orders
          </button>
        </div>

        <form onSubmit={handleTrackingOrderSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={orderQuery}
            onChange={(event) => setOrderQuery(event.target.value)}
            placeholder="Search by order number or tracking number"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
          >
            Search
          </button>
        </form>

        {ordersStatus === 'loading' && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading orders...</p>
        )}

        {ordersStatus === 'failed' && (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">Unable to load orders for tracking updates.</p>
        )}

        {ordersStatus === 'succeeded' && orderResults.length === 0 && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No orders found for this search.</p>
        )}

        {ordersStatus === 'succeeded' && orderResults.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {orderResults.map((order) => {
              const isActive = trackingTargetOrder?.id === order.id;
              const currentOrderStage = normalizeTrackingStage(order.trackingStage || order.orderStatus);
              const nextQuickAction = getNextQuickActionForOrder(order);
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleSelectTrackingOrder(order)}
                  className={`rounded-lg border p-3 text-left transition ${
                    isActive
                      ? 'border-amber-500 bg-amber-100 dark:border-amber-400 dark:bg-amber-500/10'
                      : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">#{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Tracking: {order.trackingNumber || 'Pending assignment'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${trackingStageChipClass(currentOrderStage)}`}>
                      {trackingStageLabel(currentOrderStage)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {nextQuickAction ? `Next: ${nextQuickAction.label}` : 'Tracking complete'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">User ID: {order.userId}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</p>
                </button>
              );
            })}
          </div>
        )}

        {trackingTargetOrder && (
          <div className="mt-5 rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Push Tracking Event</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Order #{trackingTargetOrder.orderNumber}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {quickTrackingActions.map((action) => {
                const currentStage = String(trackingTargetOrder.trackingStage || trackingTargetOrder.orderStatus || '').toUpperCase();
                const currentRank = TRACKING_STAGE_RANK[currentStage] ?? -1;
                const requestedRank = TRACKING_STAGE_RANK[action.stage] ?? -1;
                const isDisabled = isPushingTrackingEvent || requestedRank <= currentRank;

                return (
                  <button
                    key={`${trackingTargetOrder.id}-${action.stage}`}
                    type="button"
                    onClick={() => handleQuickTrackingAction(action)}
                    disabled={isDisabled}
                    className="rounded-md border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Tracking stage
                <select
                  value={trackingForm.trackingStage}
                  onChange={(event) => handleTrackingFormChange('trackingStage', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {TRACKING_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Event title (optional)
                <input
                  type="text"
                  value={trackingForm.eventTitle}
                  onChange={(event) => handleTrackingFormChange('eventTitle', event.target.value)}
                  placeholder="Shipped from Pune hub"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Event location
                <input
                  type="text"
                  value={trackingForm.eventLocation}
                  onChange={(event) => handleTrackingFormChange('eventLocation', event.target.value)}
                  placeholder="Pune logistics center"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Estimated delivery
                <input
                  type="datetime-local"
                  value={trackingForm.estimatedDeliveryAt}
                  onChange={(event) => handleTrackingFormChange('estimatedDeliveryAt', event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Carrier name
                <input
                  type="text"
                  value={trackingForm.carrierName}
                  onChange={(event) => handleTrackingFormChange('carrierName', event.target.value)}
                  placeholder="MCM Express"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Carrier contact
                <input
                  type="text"
                  value={trackingForm.carrierContact}
                  onChange={(event) => handleTrackingFormChange('carrierContact', event.target.value)}
                  placeholder="+91-1800-266-543"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Tracking number
                <input
                  type="text"
                  value={trackingForm.trackingNumber}
                  onChange={(event) => handleTrackingFormChange('trackingNumber', event.target.value)}
                  placeholder="MCMTRK-00000001"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="md:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                Event description (optional)
                <textarea
                  rows={3}
                  value={trackingForm.eventDescription}
                  onChange={(event) => handleTrackingFormChange('eventDescription', event.target.value)}
                  placeholder="Package handed to regional courier partner for inter-city transit."
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handlePushTrackingEvent}
                disabled={isPushingTrackingEvent}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isPushingTrackingEvent ? 'Pushing update...' : 'Push Tracking Event'}
              </button>
              <button
                type="button"
                onClick={() => setTrackingForm(buildTrackingFormFromOrder(trackingTargetOrder))}
                disabled={isPushingTrackingEvent}
                className="rounded-lg border border-slate-400 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset Form
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-700/40 dark:bg-indigo-900/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Feedback Inspector</h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Search dislikes/likes by chat session id and inspect stored reasons, details, and message timestamps.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadAiFeedback({ sessionId: aiFeedbackQuery, feedbackType: aiFeedbackType, limit: 40 })}
            className="rounded-md border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Refresh Feedback
          </button>
        </div>

        <form onSubmit={handleAiFeedbackSearch} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={aiFeedbackQuery}
            onChange={(event) => setAiFeedbackQuery(event.target.value)}
            placeholder="Search by chat session id"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={aiFeedbackType}
            onChange={(event) => setAiFeedbackType(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {FEEDBACK_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>{typeOption}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </form>

        {aiFeedbackStatus === 'loading' && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading AI feedback logs...</p>
        )}

        {aiFeedbackStatus === 'failed' && (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">Unable to load AI feedback logs.</p>
        )}

        {aiFeedbackStatus === 'succeeded' && aiFeedbackItems.length === 0 && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No feedback records matched your filters.</p>
        )}

        {aiFeedbackStatus === 'succeeded' && aiFeedbackItems.length > 0 && (
          <div className="mt-4 space-y-3">
            {aiFeedbackItems.map((item) => {
              const reasonCodes = Array.isArray(item.reasonCodes) ? item.reasonCodes : [];
              const isDownFeedback = String(item.feedbackType || '').toUpperCase() === 'DOWN';

              return (
                <article
                  key={`ai-feedback-${item.id}`}
                  className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDownFeedback
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                        {item.feedbackType || 'UNKNOWN'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {item.assistantType || 'N/A'}
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {item.sourcePage || 'STUDY_CORNER'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Logged {formatDateTime(item.createdAt)}</p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-800 dark:text-slate-100">Session:</span> {item.chatSessionId || 'UNKNOWN'}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-100">Message time:</span> {formatDateTime(item.messageTimestamp)}</p>
                  </div>

                  {reasonCodes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {reasonCodes.map((reasonCode) => (
                        <span
                          key={`${item.id}-${reasonCode}`}
                          className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                        >
                          {reasonCode}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.feedbackDetails && (
                    <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {truncateText(item.feedbackDetails, 260)}
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/80">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Prompt</p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{truncateText(item.promptText, 180) || 'N/A'}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/80">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Response</p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{truncateText(item.responseText, 180) || 'N/A'}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

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

              <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line break-words">
                <span className="font-semibold">Shop Description:</span>{' '}
                {merchant.shopDescription || 'Not provided'}
              </p>

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
