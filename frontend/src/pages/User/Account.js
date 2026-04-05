import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { auth, wallet as walletApi } from '../../utils/api';
import { getErrorMessage } from '../../utils/errorHandling/errorMessageUtils';
import { 
  ClipboardListIcon, 
  LocationMarkerIcon, 
  CogIcon, 
  LogoutIcon,
  WalletIcon 
} from '../../components/UI/Icons';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const QUICK_TOPUP_AMOUNTS = [100, 250, 500, 1000, 2000];
const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024;

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

const roundCurrency = (amount) => Math.round(amount * 100) / 100;

const Account = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isSavingMerchantProfile, setIsSavingMerchantProfile] = useState(false);
  const [merchantProfile, setMerchantProfile] = useState({
    shopName: '',
    shopTagline: '',
    shopDescription: '',
    shopPhone: '',
    shopCampusLocation: '',
  });
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('100');
  const [isTopupProcessing, setIsTopupProcessing] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isRemovingProfileImage, setIsRemovingProfileImage] = useState(false);
  const profileImageInputRef = useRef(null);

  const resolvedDisplayName = state.user?.displayName || state.user?.email?.split('@')[0] || 'Student';
  const user = {
    displayName: resolvedDisplayName,
    email: state.user?.email || 'Not available',
    initials: resolvedDisplayName
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST'
  };
  const profileImageDataUrl = state.user?.profileImageDataUrl || '';
  
  const isPrimeMember = state.user?.isPrimeMember;
  const primeExpiryDate = state.user?.primeExpiryDate;
  const isMerchant = (state.user?.accountType || 'INDIVIDUAL').toUpperCase() === 'MERCHANT';
  const merchantVerificationStatus = (state.user?.merchantVerificationStatus || (isMerchant ? 'PENDING' : 'NOT_REQUIRED')).toUpperCase();
  const canManageListings = Boolean(state.user?.canManageListings);
  const isAdmin = Boolean(state.user?.isAdmin);
  const hasSellerAccess = canManageListings || isAdmin;
  const isMaster = Boolean(state.user?.isMaster);
  const accountTypeLabel = isMaster ? 'Master' : (isMerchant ? 'Business / Merchant' : 'Individual');

  useEffect(() => {
    if (!isMerchant) {
      return;
    }

    setMerchantProfile({
      shopName: state.user?.shopName || '',
      shopTagline: state.user?.shopTagline || '',
      shopDescription: state.user?.shopDescription || '',
      shopPhone: state.user?.shopPhone || '',
      shopCampusLocation: state.user?.shopCampusLocation || '',
    });
  }, [
    isMerchant,
    state.user?.shopName,
    state.user?.shopTagline,
    state.user?.shopDescription,
    state.user?.shopPhone,
    state.user?.shopCampusLocation,
  ]);

  const menuItems = [
    ...(hasSellerAccess ? [{ name: 'My Listings', icon: <ClipboardListIcon />, page: 'SellerDashboard' }] : []),
    ...(isAdmin ? [{ name: 'Merchant Verification', icon: <CogIcon />, page: 'AdminMerchantPanel' }] : []),
    { name: 'Track Orders', icon: <LocationMarkerIcon />, page: 'OrderTracking' },
    { name: 'Settings', icon: <CogIcon />, page: 'Settings' },
    { name: 'Logout', icon: <LogoutIcon />, page: 'Home', action: 'logout' },
  ];

  const syncUserState = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({ type: actionTypes.SET_USER, payload: updatedUser });
  };

  const handleSwitchToMerchant = async () => {
    setIsSwitchingRole(true);
    try {
      const updatedUser = await auth.updateAccountType('MERCHANT');
      syncUserState(updatedUser);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Merchant portal enabled. Complete your shop profile and submit it for admin review.', type: 'success' }
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: error?.message || 'Failed to switch account type.', type: 'error' }
      });
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleMerchantProfileChange = (field, value) => {
    setMerchantProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveMerchantProfile = async () => {
    if (!merchantProfile.shopName.trim() || merchantProfile.shopName.trim().length < 3) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Shop name must be at least 3 characters.', type: 'error' }
      });
      return;
    }

    if (!merchantProfile.shopCampusLocation.trim() || merchantProfile.shopCampusLocation.trim().length < 3) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please add a valid campus pickup location.', type: 'error' }
      });
      return;
    }

    setIsSavingMerchantProfile(true);
    try {
      const updatedUser = await auth.updateMerchantProfile(merchantProfile);
      syncUserState(updatedUser);
      const isApproved = Boolean(updatedUser?.canManageListings);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: isApproved
            ? 'Merchant profile updated.'
            : 'Merchant profile saved and submitted for admin verification.',
          type: 'success'
        }
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: error?.message || 'Failed to save merchant profile.', type: 'error' }
      });
    } finally {
      setIsSavingMerchantProfile(false);
    }
  };

  const handleOpenProfileImagePicker = () => {
    if (isUploadingProfileImage || isRemovingProfileImage) {
      return;
    }

    profileImageInputRef.current?.click();
  };

  const handleProfileImageChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type || !selectedFile.type.startsWith('image/')) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please choose a valid image file.', type: 'error' }
      });
      return;
    }

    if (selectedFile.size > MAX_PROFILE_IMAGE_BYTES) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Profile image must be 1 MB or less.', type: 'error' }
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);

    setIsUploadingProfileImage(true);
    try {
      const updatedUser = await auth.uploadProfileImage(formData);
      syncUserState(updatedUser);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Profile image updated successfully.', type: 'success' }
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: getErrorMessage(error, 'Failed to upload profile image.'), type: 'error' }
      });
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!profileImageDataUrl) {
      return;
    }

    setIsRemovingProfileImage(true);
    try {
      const updatedUser = await auth.removeProfileImage();
      syncUserState(updatedUser);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Profile image removed.', type: 'success' }
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: getErrorMessage(error, 'Failed to remove profile image.'), type: 'error' }
      });
    } finally {
      setIsRemovingProfileImage(false);
    }
  };

  const formatTransactionDate = (value) => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    return parsed.toLocaleString();
  };

  const fetchWalletTransactions = async () => {
    setIsTransactionsLoading(true);
    try {
      const response = await walletApi.getTransactions(25);
      setWalletTransactions(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, 'Failed to load wallet transactions.'),
          type: 'error',
        }
      });
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  const handleOpenTopupModal = () => {
    setTopupAmount('100');
    setIsTopupModalOpen(true);
  };

  const handleCloseTopupModal = () => {
    if (isTopupProcessing) {
      return;
    }
    setIsTopupModalOpen(false);
  };

  const handleOpenTransactionsModal = async () => {
    setIsTransactionsModalOpen(true);
    await fetchWalletTransactions();
  };

  const handleCreateWalletTopup = async () => {
    const amount = roundCurrency(Number(topupAmount));
    if (!Number.isFinite(amount) || amount < 1) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Please enter a valid amount (minimum Rs. 1).', type: 'error' }
      });
      return;
    }

    if (amount > 50000) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Maximum top-up amount is Rs. 50000.', type: 'error' }
      });
      return;
    }

    setIsTopupProcessing(true);
    try {
      const orderResponse = await walletApi.createTopupOrder({ amount });
      const orderData = orderResponse?.data || {};

      if (!orderData?.razorpayOrderId || !orderData?.keyId) {
        throw new Error('Unable to initialize wallet payment right now.');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'MyCollegeMart Wallet',
        description: `Add Rs. ${amount.toFixed(2)} to Student Wallet`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          email: state.user?.email || '',
          name: state.user?.displayName || '',
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async (razorpayResponse) => {
          setIsTopupProcessing(true);
          try {
            const verifyResponse = await walletApi.verifyTopupPayment({
              razorpayOrderId: razorpayResponse.razorpay_order_id,
              razorpayPaymentId: razorpayResponse.razorpay_payment_id,
              razorpaySignature: razorpayResponse.razorpay_signature,
            });

            const creditedAmount = roundCurrency(Number(verifyResponse?.data?.creditedAmount || 0));
            const alreadyProcessed = Boolean(verifyResponse?.data?.alreadyProcessed);

            if (creditedAmount > 0) {
              dispatch({ type: actionTypes.ADD_WALLET_FUNDS, payload: creditedAmount });
            }

            const nextWalletBalance = roundCurrency(state.studentWallet + creditedAmount);
            dispatch({
              type: actionTypes.ADD_NOTIFICATION,
              payload: {
                message: alreadyProcessed
                  ? 'This wallet payment was already verified earlier.'
                  : `Rs. ${creditedAmount.toFixed(2)} added to your wallet. Balance: Rs. ${nextWalletBalance.toFixed(2)}`,
                type: 'success',
              }
            });

            setIsTopupModalOpen(false);
            setTopupAmount('100');
            await fetchWalletTransactions();
          } catch (error) {
            dispatch({
              type: actionTypes.ADD_NOTIFICATION,
              payload: {
                message: getErrorMessage(error, 'Payment verification failed. Please contact support if money is debited.'),
                type: 'error',
              }
            });
          } finally {
            setIsTopupProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsTopupProcessing(false);
            dispatch({
              type: actionTypes.ADD_NOTIFICATION,
              payload: { message: 'Wallet top-up was cancelled.', type: 'error' },
            });
          },
        },
      });

      razorpay.on('payment.failed', (response) => {
        setIsTopupProcessing(false);
        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: {
            message: response?.error?.description || 'Wallet top-up payment failed. Please try again.',
            type: 'error',
          },
        });
      });

      setIsTopupProcessing(false);
      razorpay.open();
    } catch (error) {
      setIsTopupProcessing(false);
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: getErrorMessage(error, 'Unable to start wallet top-up.'),
          type: 'error',
        }
      });
    }
  };

  const verificationLabel = merchantVerificationStatus === 'APPROVED'
    ? 'Verified'
    : merchantVerificationStatus === 'PENDING'
      ? 'Pending Verification'
      : merchantVerificationStatus === 'REJECTED'
        ? 'Rejected'
      : 'Not Required';

  const handleMenuClick = (item) => {
    if (item.action === 'logout') {
      dispatch({ type: actionTypes.LOGOUT });
      onNavigate('Home');
      return;
    }
    onNavigate(item.page);
  };

  if (!state.isLoggedIn) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-xl mx-auto py-16 px-4"
      >
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in required</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-3">
            Please sign in to view your account details and wallet.
          </p>
          <button
            onClick={() => onNavigate('Login')}
            className="mt-6 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold transition-colors"
          >
            Go to Sign in
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* User profile card with Prime indicator if applicable */}
      <div className={`flex flex-col md:flex-row items-center gap-6 p-6 rounded-lg ${
        isPrimeMember 
          ? 'bg-gradient-to-r from-amber-100 to-white dark:from-amber-900/50 dark:to-slate-900 border border-amber-200 dark:border-amber-700/30' 
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex flex-col items-center gap-2">
          <div className={`h-24 w-24 overflow-hidden rounded-full flex items-center justify-center text-white text-3xl font-bold ${
            isPrimeMember
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300/50'
              : 'bg-indigo-600'
          }`}>
            {profileImageDataUrl ? (
              <img
                src={profileImageDataUrl}
                alt={`${user.displayName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              user.initials
            )}
          </div>

          <input
            ref={profileImageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleProfileImageChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleOpenProfileImagePicker}
            disabled={isUploadingProfileImage || isRemovingProfileImage}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isUploadingProfileImage ? 'Uploading...' : 'Upload Photo'}
          </button>

          {profileImageDataUrl && (
            <button
              type="button"
              onClick={handleRemoveProfileImage}
              disabled={isUploadingProfileImage || isRemovingProfileImage}
              className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
            >
              {isRemovingProfileImage ? 'Removing...' : 'Remove Photo'}
            </button>
          )}
        </div>
        <div className="w-full min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{user.displayName}</h1>
            {isPrimeMember && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded flex items-center">
                <span className="mr-1">✨</span> PRIME
              </span>
            )}
          </div>
          <p className={`${isPrimeMember ? 'text-amber-700 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'}`}>
            {user.email}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Account Type: <span className="font-semibold">{accountTypeLabel}</span>
          </p>
          {isMerchant && !isMaster && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Verification: <span className={`font-semibold ${canManageListings ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{verificationLabel}</span>
            </p>
          )}
          {isPrimeMember && primeExpiryDate && (
            <p className="text-amber-600 dark:text-amber-300 text-sm mt-1">
              Prime membership active until: {new Date(primeExpiryDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Menu sidebar */}
        <div className="space-y-3 lg:col-span-4 xl:col-span-3">
          {menuItems.map(item => (
            <button 
              key={item.name} 
              onClick={() => handleMenuClick(item)} 
              className="w-full flex items-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="mr-3 text-indigo-600 dark:text-indigo-400">
                {item.icon}
              </span>
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
          {!isPrimeMember && (
            <button 
              onClick={() => onNavigate('PrimeMembership')} 
              className="w-full flex items-center p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-colors"
            >
              <span className="mr-3">✨</span>
              <span className="font-medium">Join Prime</span>
            </button>
          )}
        </div>
        
        {/* Main content area - Student wallet */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6 lg:p-7">
            {isMaster ? (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Master Portal</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Student Wallet and Merchant Shop Profile are hidden for Master login.
                  Use the admin controls from this account.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => onNavigate('AdminMerchantPanel')}
                    className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
                  >
                    Open Merchant Verification
                  </button>
                  <button
                    onClick={() => onNavigate('Settings')}
                    className="rounded-md border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-300 dark:hover:bg-cyan-900/20"
                  >
                    Open Settings
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <WalletIcon className="mr-2 text-indigo-600 dark:text-indigo-400"/> 
                  Student Wallet
                </h2>
                <p className="text-4xl font-bold text-green-500">₹{state.studentWallet.toFixed(2)}</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  Use your wallet balance for discounts at checkout!
                </p>
                
                <div className="mt-6 flex flex-wrap gap-3">
                  <button 
                    onClick={handleOpenTopupModal}
                    className="bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Add Money
                  </button>
                  
                  <button 
                    onClick={handleOpenTransactionsModal}
                    className="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded font-medium border border-indigo-600 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    View Transactions
                  </button>
                </div>

                {!isMerchant && (
                  <div className="mt-6 rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-700/40 dark:bg-cyan-900/20">
                    <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">Want to sell study items on campus?</h3>
                    <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-300">
                      Switch to Merchant access to create and manage your own listings in the student marketplace.
                    </p>
                    <button
                      onClick={handleSwitchToMerchant}
                      disabled={isSwitchingRole}
                      className="mt-3 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                    >
                      {isSwitchingRole ? 'Updating...' : 'Enable Merchant Access'}
                    </button>
                  </div>
                )}

                {isMerchant && (
                  <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30 sm:p-5 lg:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Merchant Shop Profile</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${canManageListings
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                        {verificationLabel}
                      </span>
                    </div>
                    {!canManageListings && (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                        Save your profile to submit it for admin verification. Listing access will be enabled after approval.
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Shop Name*</label>
                        <input
                          value={merchantProfile.shopName}
                          onChange={(e) => handleMerchantProfileChange('shopName', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="Campus Tech Store"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tagline</label>
                        <input
                          value={merchantProfile.shopTagline}
                          onChange={(e) => handleMerchantProfileChange('shopTagline', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="Affordable study essentials"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact Number</label>
                        <input
                          value={merchantProfile.shopPhone}
                          onChange={(e) => handleMerchantProfileChange('shopPhone', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="+91 98XXXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Campus Pickup Location*</label>
                        <input
                          value={merchantProfile.shopCampusLocation}
                          onChange={(e) => handleMerchantProfileChange('shopCampusLocation', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="Near library gate"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Shop Description</label>
                        <textarea
                          rows={3}
                          value={merchantProfile.shopDescription}
                          onChange={(e) => handleMerchantProfileChange('shopDescription', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="What do you sell and how do students collect orders?"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={handleSaveMerchantProfile}
                        disabled={isSavingMerchantProfile}
                        className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                      >
                        {isSavingMerchantProfile
                          ? 'Saving...'
                          : canManageListings
                            ? 'Update Profile'
                            : merchantVerificationStatus === 'REJECTED'
                              ? 'Resubmit for Review'
                              : 'Save and Submit'}
                      </button>
                      {canManageListings && (
                        <button
                          onClick={() => onNavigate('SellerDashboard')}
                          className="rounded-md border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-300 dark:hover:bg-cyan-900/20"
                        >
                          Open Seller Dashboard
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Prime Benefits Section (if Prime member) */}
          {!isMaster && isPrimeMember && (
            <div className="mt-6 bg-gradient-to-r from-amber-100 to-white dark:from-amber-900/30 dark:to-slate-800 p-6 rounded-lg border border-amber-200 dark:border-amber-700/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold flex items-center text-amber-800 dark:text-amber-200">
                  <span className="mr-2">✨</span> 
                  Prime Benefits
                </h2>
                <button 
                  onClick={() => onNavigate('PrimeMembership')}
                  className="text-sm text-amber-600 dark:text-amber-300 hover:underline"
                >
                  View Details
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded border border-amber-200 dark:border-amber-700/30">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Free Campus Delivery</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">All your orders delivered free</p>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/50 p-3 rounded border border-amber-200 dark:border-amber-700/30">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Exclusive Listings</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Access to premium items</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isTopupModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Money to Student Wallet</h3>
              <button
                onClick={handleCloseTopupModal}
                disabled={isTopupProcessing}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (Rs.)</label>
              <input
                type="number"
                min="1"
                max="50000"
                step="1"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Enter amount"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_TOPUP_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTopupAmount(String(amount))}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${Number(topupAmount) === amount
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    Rs. {amount}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Payments are secured by Razorpay. You can pay using UPI, cards, net banking, and wallets.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={handleCloseTopupModal}
                disabled={isTopupProcessing}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWalletTopup}
                disabled={isTopupProcessing}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isTopupProcessing ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTransactionsModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Wallet Transactions</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchWalletTransactions}
                  disabled={isTransactionsLoading}
                  className="rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-slate-700"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setIsTransactionsModalOpen(false)}
                  className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
              {isTransactionsLoading ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading transactions...</p>
              ) : walletTransactions.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No wallet transactions yet.</p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {walletTransactions.map((transaction) => {
                    const amount = Number(transaction?.amount || 0);
                    const status = String(transaction?.status || 'PENDING').toUpperCase();
                    const statusStyles = status === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : status === 'FAILED'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';

                    return (
                      <li key={transaction?.id || `${transaction?.razorpayOrderId}-${transaction?.createdAt}`} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {transaction?.description || 'Wallet top up'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatTransactionDate(transaction?.createdAt)}
                            </p>
                            {transaction?.razorpayPaymentId && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Payment ID: {transaction.razorpayPaymentId}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              +Rs. {amount.toFixed(2)}
                            </p>
                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Account;
