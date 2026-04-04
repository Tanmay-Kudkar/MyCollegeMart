import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, ArrowRightIcon } from '../../components/UI/Icons';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { assignmentHelp } from '../../utils/api';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

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

const AssignmentCheckout = ({ onNavigate, checkoutData }) => {
  const { state, dispatch } = useGlobalState();
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentInfo, setPaymentInfo] = useState(null);

  const amountDue = Number(checkoutData?.amountDue || 0);
  const hasCheckoutData = Boolean(checkoutData?.requestId && checkoutData?.razorpayOrderId);

  const handlePayment = async () => {
    if (!state.isLoggedIn) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please sign in to continue with payment.', type: 'error' },
      });
      onNavigate('Login');
      return;
    }

    if (!hasCheckoutData) {
      setCheckoutError('Checkout session not found. Please submit the request again.');
      return;
    }

    setCheckoutError('');
    setPaymentStatus('processing');

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentStatus('failed');
      setCheckoutError('Unable to load Razorpay checkout. Please try again.');
      return;
    }

    const razorpay = new window.Razorpay({
      key: checkoutData.keyId,
      amount: checkoutData.amount,
      currency: checkoutData.currency || 'INR',
      name: 'MyCollegeMart',
      description: `Assignment Help: ${checkoutData.subject || checkoutData.serviceType || 'Request'}`,
      order_id: checkoutData.razorpayOrderId,
      prefill: {
        email: state.user?.email || '',
        name: state.user?.displayName || '',
      },
      theme: {
        color: '#0e7490',
      },
      handler: async (razorpayResponse) => {
        try {
          const verifyResponse = await assignmentHelp.verifyCheckoutPayment({
            requestId: checkoutData.requestId,
            razorpayOrderId: razorpayResponse.razorpay_order_id,
            razorpayPaymentId: razorpayResponse.razorpay_payment_id,
            razorpaySignature: razorpayResponse.razorpay_signature,
          });

          setPaymentInfo({
            requestId: checkoutData.requestId,
            paymentId: verifyResponse?.data?.paymentId || razorpayResponse.razorpay_payment_id,
            paymentStatus: verifyResponse?.data?.paymentStatus || 'PAID',
          });
          setPaymentStatus('success');

          dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: { message: 'Payment successful. Assignment request submitted.', type: 'success' },
          });
        } catch (error) {
          setPaymentStatus('failed');
          setCheckoutError(error?.response?.data?.message || error?.message || 'Payment verification failed.');
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentStatus('idle');
          setCheckoutError('Payment was cancelled. Your request is still pending payment.');
        },
      },
    });

    razorpay.on('payment.failed', (response) => {
      setPaymentStatus('failed');
      setCheckoutError(response?.error?.description || 'Payment failed. Please try again.');
    });

    razorpay.open();
  };

  if (!hasCheckoutData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <h1 className="mcm-display text-3xl font-bold text-slate-900 dark:text-white">No Active Assignment Checkout</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Start from Assignment Help to create a payable request.</p>
          <button
            onClick={() => onNavigate('AssignmentHelp')}
            className="mt-6 rounded-full bg-cyan-700 px-8 py-3 font-semibold text-white shadow-lg hover:bg-cyan-800"
          >
            Go to Assignment Help
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <ShieldCheckIcon className="w-20 h-20 mx-auto text-green-500" />
          <h1 className="mcm-display mt-4 text-3xl font-bold text-slate-900 dark:text-white">Payment Confirmed</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Your assignment request has been submitted successfully.</p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Request ID: {paymentInfo?.requestId}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Payment ID: {paymentInfo?.paymentId}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Payment Status: {paymentInfo?.paymentStatus}</p>
          <button
            onClick={() => onNavigate('SkillMarketplace')}
            className="mt-8 rounded-full bg-cyan-700 px-8 py-3 font-semibold text-white shadow-lg hover:bg-cyan-800"
          >
            Back to Services
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-800/20" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-800/20" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-400">Assignment Checkout</p>
          <h1 className="mcm-display mt-1 text-4xl font-extrabold text-slate-900 dark:text-white">Complete Payment</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your request is saved and waiting for payment confirmation.</p>
        </section>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mcm-display text-2xl font-bold text-slate-900 dark:text-white">Request Summary</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Request ID</span>
              <span className="font-semibold text-slate-900 dark:text-white">#{checkoutData.requestId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Service Type</span>
              <span className="font-semibold text-slate-900 dark:text-white">{checkoutData.serviceType || 'Assignment'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Subject</span>
              <span className="font-semibold text-slate-900 dark:text-white">{checkoutData.subject || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Deadline</span>
              <span className="font-semibold text-slate-900 dark:text-white">{checkoutData.deadline || 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Files Attached</span>
              <span className="font-semibold text-slate-900 dark:text-white">{checkoutData.filesAttached || 0}</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center justify-between text-lg font-bold text-slate-900 dark:text-white">
              <span>Total to Pay</span>
              <span>₹{amountDue.toFixed(2)}</span>
            </div>
          </div>

          {checkoutError && (
            <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{checkoutError}</p>
          )}

          <button
            onClick={handlePayment}
            disabled={paymentStatus === 'processing'}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-cyan-400"
          >
            {paymentStatus === 'processing' ? 'Opening Razorpay...' : (
              <>
                Pay Now <ArrowRightIcon />
              </>
            )}
          </button>

          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Secured by Razorpay Payment Gateway</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AssignmentCheckout;
