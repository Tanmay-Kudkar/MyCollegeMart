import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { settings as settingsApi } from '../../utils/api';

const defaultFormState = {
  displayName: '',
  phoneNumber: '',
  campusLocation: '',
  bio: '',
  emailNotifications: true,
  orderUpdates: true,
  marketingEmails: false,
  twoFactorEnabled: false,
  preferredLanguage: 'EN',
  themeMode: 'SYSTEM',
};

const Settings = ({ onNavigate }) => {
  const { state, dispatch } = useGlobalState();
  const { setThemePreference } = useTheme();
  const { setLanguage } = useTranslation();
  const [form, setForm] = useState(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!state.isLoggedIn) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    settingsApi.getMe()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const profile = response.data?.profile || {};
        const preferences = response.data?.preferences || {};

        setForm({
          displayName: profile.displayName || state.user?.displayName || '',
          phoneNumber: preferences.phoneNumber || '',
          campusLocation: preferences.campusLocation || '',
          bio: preferences.bio || '',
          emailNotifications: preferences.emailNotifications !== false,
          orderUpdates: preferences.orderUpdates !== false,
          marketingEmails: Boolean(preferences.marketingEmails),
          twoFactorEnabled: Boolean(preferences.twoFactorEnabled),
          preferredLanguage: preferences.preferredLanguage || 'EN',
          themeMode: preferences.themeMode || 'SYSTEM',
        });

        if (preferences.themeMode) {
          setThemePreference(preferences.themeMode);
        }
        if (preferences.preferredLanguage) {
          setLanguage(preferences.preferredLanguage);
        }
      })
      .catch((error) => {
        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: { message: error?.message || 'Failed to load settings.', type: 'error' },
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [state.isLoggedIn, state.user?.displayName, dispatch, setThemePreference, setLanguage]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!state.isLoggedIn) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        displayName: form.displayName,
        phoneNumber: form.phoneNumber,
        campusLocation: form.campusLocation,
        bio: form.bio,
        emailNotifications: form.emailNotifications,
        orderUpdates: form.orderUpdates,
        marketingEmails: form.marketingEmails,
        twoFactorEnabled: form.twoFactorEnabled,
        preferredLanguage: form.preferredLanguage,
        themeMode: form.themeMode,
      };

      const response = await settingsApi.updateMe(payload);
      const profile = response.data?.profile || {};
      const preferences = response.data?.preferences || {};

      const mergedUser = {
        ...state.user,
        id: profile.id ?? state.user?.id,
        email: profile.email ?? state.user?.email,
        displayName: profile.displayName ?? state.user?.displayName,
        accountType: profile.accountType ?? state.user?.accountType,
        isPrimeMember: profile.isPrimeMember ?? state.user?.isPrimeMember,
        primeExpiryDate: profile.primeExpiryDate ?? state.user?.primeExpiryDate,
      };

      localStorage.setItem('user', JSON.stringify(mergedUser));
      dispatch({ type: actionTypes.SET_USER, payload: mergedUser });

      setForm((prev) => ({
        ...prev,
        displayName: profile.displayName || prev.displayName,
        phoneNumber: preferences.phoneNumber || '',
        campusLocation: preferences.campusLocation || '',
        bio: preferences.bio || '',
        emailNotifications: preferences.emailNotifications !== false,
        orderUpdates: preferences.orderUpdates !== false,
        marketingEmails: Boolean(preferences.marketingEmails),
        twoFactorEnabled: Boolean(preferences.twoFactorEnabled),
        preferredLanguage: preferences.preferredLanguage || prev.preferredLanguage,
        themeMode: preferences.themeMode || prev.themeMode,
      }));

      setThemePreference(preferences.themeMode || form.themeMode);
      setLanguage(preferences.preferredLanguage || form.preferredLanguage);

      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Settings saved successfully.', type: 'success' },
      });
    } catch (error) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: error?.message || 'Failed to save settings.', type: 'error' },
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!state.isLoggedIn) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in required</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-3">
            Please sign in to manage your account settings.
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Manage profile and notification preferences for your account.</p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-slate-600 dark:text-slate-300">
          Loading your settings...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Profile</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Display Name</span>
                <input
                  value={form.displayName}
                  onChange={(event) => updateField('displayName', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your display name"
                  maxLength={255}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone Number</span>
                <input
                  value={form.phoneNumber}
                  onChange={(event) => updateField('phoneNumber', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional"
                  maxLength={32}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Campus Location</span>
                <input
                  value={form.campusLocation}
                  onChange={(event) => updateField('campusLocation', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Hostel / Department / Block"
                  maxLength={255}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => updateField('bio', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  maxLength={2000}
                  placeholder="Tell other students about your interests, skills, or store details."
                />
              </label>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Preferences</h2>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <span className="text-sm text-slate-700 dark:text-slate-200">Email Notifications</span>
                <input
                  type="checkbox"
                  checked={form.emailNotifications}
                  onChange={(event) => updateField('emailNotifications', event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <span className="text-sm text-slate-700 dark:text-slate-200">Order Updates</span>
                <input
                  type="checkbox"
                  checked={form.orderUpdates}
                  onChange={(event) => updateField('orderUpdates', event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <span className="text-sm text-slate-700 dark:text-slate-200">Marketing Emails</span>
                <input
                  type="checkbox"
                  checked={form.marketingEmails}
                  onChange={(event) => updateField('marketingEmails', event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <span className="text-sm text-slate-700 dark:text-slate-200">Two-Factor Authentication</span>
                <input
                  type="checkbox"
                  checked={form.twoFactorEnabled}
                  onChange={(event) => updateField('twoFactorEnabled', event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Preferred Language</span>
                <select
                  value={form.preferredLanguage}
                  onChange={(event) => updateField('preferredLanguage', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EN">English</option>
                  <option value="HI">Hindi</option>
                  <option value="MR">Marathi</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme Preference</span>
                <select
                  value={form.themeMode}
                  onChange={(event) => updateField('themeMode', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SYSTEM">System</option>
                  <option value="LIGHT">Light</option>
                  <option value="DARK">Dark</option>
                </select>
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('Account')}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Back to Account
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

export default Settings;
