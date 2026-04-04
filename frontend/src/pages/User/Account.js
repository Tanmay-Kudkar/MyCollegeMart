import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { auth } from '../../utils/api';
import { 
  ClipboardListIcon, 
  LocationMarkerIcon, 
  CogIcon, 
  LogoutIcon,
  WalletIcon 
} from '../../components/UI/Icons';

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
  
  const isPrimeMember = state.user?.isPrimeMember;
  const primeExpiryDate = state.user?.primeExpiryDate;
  const isMerchant = (state.user?.accountType || 'INDIVIDUAL').toUpperCase() === 'MERCHANT';
  const merchantVerificationStatus = (state.user?.merchantVerificationStatus || (isMerchant ? 'PENDING' : 'NOT_REQUIRED')).toUpperCase();
  const canManageListings = Boolean(state.user?.canManageListings);
  const isAdmin = Boolean(state.user?.isAdmin);

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
    ...(canManageListings ? [{ name: 'My Listings', icon: <ClipboardListIcon />, page: 'SellerDashboard' }] : []),
    ...(isAdmin ? [{ name: 'Merchant Verification', icon: <CogIcon />, page: 'AdminMerchantPanel' }] : []),
    { name: 'Track Orders', icon: <LocationMarkerIcon />, page: 'OrderTracking' },
    { name: 'Settings', icon: <CogIcon />, page: 'Settings' },
    { name: 'Logout', icon: <LogoutIcon />, page: 'Home', action: 'logout' },
  ];

  const handleSwitchToMerchant = async () => {
    setIsSwitchingRole(true);
    try {
      const updatedUser = await auth.updateAccountType('MERCHANT');
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: actionTypes.SET_USER, payload: updatedUser });
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
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: actionTypes.SET_USER, payload: updatedUser });
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
      className="max-w-5xl mx-auto py-8 px-4"
    >
      {/* User profile card with Prime indicator if applicable */}
      <div className={`flex flex-col md:flex-row items-center gap-6 p-6 rounded-lg ${
        isPrimeMember 
          ? 'bg-gradient-to-r from-amber-100 to-white dark:from-amber-900/50 dark:to-slate-900 border border-amber-200 dark:border-amber-700/30' 
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      }`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${
          isPrimeMember 
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-300/50' 
            : 'bg-indigo-600'
        }`}>
          {user.initials}
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
            Account Type: <span className="font-semibold">{isMerchant ? 'Business / Merchant' : 'Individual'}</span>
          </p>
          {isMerchant && (
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Menu sidebar */}
        <div className="md:col-span-1 space-y-3">
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
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
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
                onClick={() => onNavigate('PrimeMembership')} 
                className="bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 transition-colors"
              >
                Add Money
              </button>
              
              <button 
                onClick={() => onNavigate('OrderTracking')} 
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
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
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

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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

                <div className="mt-4 flex flex-wrap gap-3">
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
          </div>
          
          {/* Prime Benefits Section (if Prime member) */}
          {isPrimeMember && (
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
    </motion.div>
  );
};

export default Account;
