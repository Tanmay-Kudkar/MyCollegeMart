import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../context/GlobalStateContext';
import { ShieldCheckIcon, ArrowRightIcon } from '../components/UI/Icons';
import { checkout as checkoutApi } from '../utils/api';
import { getErrorMessage } from '../utils/errorHandling/errorMessageUtils';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const TRUST_INDICATORS = [
  {
    title: '256-bit encrypted checkout',
    subtitle: 'All payment sessions are secured using modern encryption standards.',
  },
  {
    title: 'Razorpay PCI-compliant gateway',
    subtitle: 'Transactions run on trusted payment rails across UPI, cards and netbanking.',
  },
  {
    title: 'Campus support and dispute help',
    subtitle: 'Order-level help is available if pickup or payment issues occur.',
  },
];

const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('Library Pickup Point');
  const [useWallet, setUseWallet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');

  const cartItems = useMemo(() => Object.values(state.cart.items), [state.cart.items]);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const walletBalance = state.studentWallet;
  const amountFromWallet = useWallet ? Math.min(cartTotal, walletBalance) : 0;
  const finalAmount = cartTotal - amountFromWallet;

  const hasPrimeMembership = cartItems.some((item) => item.id === 'prime-membership');
  const onlyPrimeMembership = cartItems.length === 1 && hasPrimeMembership;

  const checkoutItems = useMemo(
    () => cartItems
      .filter((item) => item?.id && Number(item?.quantity) > 0)
      .map((item) => ({ id: String(item.id), quantity: Number(item.quantity) })),
    [cartItems]
  );

  const activatePrimeMembershipLocally = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    dispatch({
      type: actionTypes.SET_PRIME_MEMBERSHIP,
      payload: oneYearFromNow.toISOString(),
    });
  };

  const finalizeSuccessfulCheckout = (responsePayload, fallbackPaymentId = null) => {
    if (amountFromWallet > 0) {
      dispatch({ type: actionTypes.USE_WALLET_FUNDS, payload: amountFromWallet });
    }

    if (hasPrimeMembership) {
      activatePrimeMembershipLocally();
    }

    dispatch({ type: actionTypes.CLEAR_CART });
    dispatch({
      type: actionTypes.ADD_NOTIFICATION,
      payload: {
        message: 'Order placed successfully!',
        type: 'success',
      },
    });

    setPaymentDetails({
      orderNumber: responsePayload?.orderNumber || 'N/A',
      paymentId: responsePayload?.paymentId || fallbackPaymentId || null,
      paymentStatus: responsePayload?.paymentStatus || (paymentMethod === 'cod' ? 'COD_PENDING' : 'PAID'),
    });
    setPaymentStatus('success');
  };

  const handleOnlinePayment = async () => {
    const payload = {
      items: checkoutItems,
      deliveryOption,
      walletAmount: amountFromWallet,
    };

    const createOrderResponse = await checkoutApi.createOrder(payload);
    const orderData = createOrderResponse.data;

    if (!orderData?.requiresPayment) {
      finalizeSuccessfulCheckout(orderData);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Unable to load Razorpay checkout. Please try again.');
    }

    const razorpay = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'MyCollegeMart',
      description: `Order ${orderData.orderNumber}`,
      order_id: orderData.razorpayOrderId,
      prefill: {
        email: state.user?.email || '',
        name: state.user?.displayName || '',
      },
      theme: {
        color: '#4f46e5',
      },
      handler: async (razorpayResponse) => {
        try {
          const verifyResponse = await checkoutApi.verifyPayment({
            razorpayOrderId: razorpayResponse.razorpay_order_id,
            razorpayPaymentId: razorpayResponse.razorpay_payment_id,
            razorpaySignature: razorpayResponse.razorpay_signature,
          });
          finalizeSuccessfulCheckout(verifyResponse.data, razorpayResponse.razorpay_payment_id);
        } catch (error) {
          setPaymentStatus('failed');
          dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: { message: getErrorMessage(error, 'Payment verification failed.'), type: 'error' },
          });
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentStatus('idle');
          dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: { message: 'Payment was cancelled.', type: 'error' },
          });
        },
      },
    });

    razorpay.on('payment.failed', (response) => {
      setPaymentStatus('failed');
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: response?.error?.description || 'Payment failed. Please try another payment method.',
          type: 'error',
        },
      });
    });

    razorpay.open();
  };

  const handleCodPayment = async () => {
    const payload = {
      items: checkoutItems,
      deliveryOption,
      walletAmount: amountFromWallet,
    };

    const codResponse = await checkoutApi.placeCodOrder(payload);
    finalizeSuccessfulCheckout(codResponse.data);
  };

  const handlePayment = async () => {
    if (!state.isLoggedIn) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please sign in to place your order.', type: 'error' },
      });
      onNavigate('Login');
      return;
    }

    if (checkoutItems.length === 0) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Your cart is empty.', type: 'error' },
      });
      return;
    }

    setPaymentStatus('processing');

    try {
      if (paymentMethod === 'cod') {
        await handleCodPayment();
      } else {
        await handleOnlinePayment();
      }
    } catch (error) {
      setPaymentStatus('failed');
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: getErrorMessage(error, 'Unable to process checkout.'), type: 'error' },
      });
    } finally {
      if (paymentStatus !== 'success') {
        setPaymentStatus((prev) => (prev === 'success' ? prev : 'idle'));
      }
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <ShieldCheckIcon className="w-20 h-20 mx-auto text-green-500" />
          <h1 className="mcm-display mt-4 text-3xl font-bold text-slate-900 dark:text-white">Order Confirmed</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Thanks for shopping with MyCollegeMart.</p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Order Number: {paymentDetails?.orderNumber}</p>
          {paymentDetails?.paymentId && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Payment ID: {paymentDetails.paymentId}</p>
          )}
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Payment Status: {paymentDetails?.paymentStatus}</p>
          <button
            onClick={() => onNavigate('Marketplace')}
            className="mt-8 rounded-full bg-cyan-700 px-8 py-3 font-semibold text-white shadow-lg hover:bg-cyan-800"
          >
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  if (cartItems.length === 0 && paymentStatus === 'idle') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h1 className="mcm-display text-3xl font-bold text-slate-900 dark:text-white">Your Cart is Empty</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Add items to your cart before checkout.</p>
        <button
          onClick={() => onNavigate('Marketplace')}
          className="mt-6 rounded-full bg-cyan-700 px-8 py-3 font-semibold text-white shadow-lg hover:bg-cyan-800"
        >
          Go to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-800/20" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">Secure Checkout</p>
          <h1 className="mcm-display mt-1 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Review and Complete Payment</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Confirm delivery details, choose payment mode, and place your order with protected checkout.</p>
        </section>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {!onlyPrimeMembership && (
              <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="mcm-display mb-4 text-2xl font-bold text-slate-900 dark:text-white">Campus Delivery Options</h2>
                <div className="space-y-3">
                  {['Library Pickup Point', 'Canteen'].map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center rounded-xl border border-slate-200 p-3 transition-colors has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50 dark:border-slate-700 dark:has-[:checked]:border-cyan-400 dark:has-[:checked]:bg-cyan-900/20"
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value={option}
                        checked={deliveryOption === option}
                        onChange={(e) => setDeliveryOption(e.target.value)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 font-medium text-slate-700 dark:text-slate-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mcm-display mb-4 text-2xl font-bold text-slate-900 dark:text-white">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center rounded-xl border border-slate-200 p-3 transition-colors has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50 dark:border-slate-700 dark:has-[:checked]:border-cyan-400 dark:has-[:checked]:bg-cyan-900/20">
                  <input
                    type="radio"
                    name="payment"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Online Payment (Razorpay)</span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">UPI, cards, netbanking and wallets</p>
                  </div>
                </label>

                <label className={`flex items-center rounded-xl border border-slate-200 p-3 transition-colors dark:border-slate-700 ${
                  hasPrimeMembership
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50 dark:has-[:checked]:border-cyan-400 dark:has-[:checked]:bg-cyan-900/20'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => !hasPrimeMembership && setPaymentMethod('cod')}
                    disabled={hasPrimeMembership}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Cash on Delivery</span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pay when items are delivered</p>
                    {hasPrimeMembership && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Prime membership requires online payment</p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Order Items</h2>
              <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
                {cartItems.map((item) => (
                  <li key={item.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="h-fit rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Payment Summary</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Final review before placing your order.</p>

            <div className="mt-4 space-y-2 border-b dark:border-slate-700 pb-4 mb-4">
              <div className="flex justify-between items-center text-slate-800 dark:text-slate-100">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              {useWallet && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span>Wallet Discount</span>
                  <span>-₹{amountFromWallet.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xl font-bold text-slate-900 dark:text-white">
              <span>To Pay</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>

            <label className="mt-4 flex cursor-pointer items-center rounded-xl border border-slate-200 p-3 has-[:checked]:border-green-500 has-[:checked]:bg-green-50 dark:border-slate-600 dark:has-[:checked]:border-green-400 dark:has-[:checked]:bg-green-900/20">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500"
              />
              <span className="ml-3 font-medium text-slate-800 dark:text-slate-200">Use Student Wallet (Balance: ₹{walletBalance.toFixed(2)})</span>
            </label>

            <button
              onClick={handlePayment}
              disabled={paymentStatus === 'processing'}
              className="mt-6 flex w-full items-center justify-center rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-cyan-400"
            >
              {paymentStatus === 'processing' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Processing...
                </>
              ) : paymentMethod === 'cod' ? (
                'Place Order'
              ) : (
                <>
                  Pay ₹{finalAmount.toFixed(2)} <ArrowRightIcon />
                </>
              )}
            </button>

            {paymentMethod === 'online' && (
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Secured by Razorpay Payment Gateway</p>
            )}

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Trust Indicators</h3>
              <ul className="mt-3 space-y-3">
                {TRUST_INDICATORS.map((item) => (
                  <li key={item.title} className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Need help before payment? Contact support from your account page.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Checkout;
