import { useState, useEffect, useRef } from 'react';
import Navbar from './layout/Navbar';
import Footer from './layout/Footer';
import ShoppingCart from './shopping/ShoppingCart';
import Home from '../pages/Home';
import Marketplace from '../pages/Marketplace';
import ProductDetail from '../pages/ProductDetail';
import Login from '../pages/Auth/Login';
import Signup from '../pages/Auth/Signup';
import About from '../pages/Info/About';
import Contact from '../pages/Info/Contact';
import Wishlist from '../pages/User/Wishlist';
import Account from '../pages/User/Account';
import Settings from '../pages/User/Settings';
import Sell from '../pages/User/Sell';
import AdminMerchantPanel from '../pages/User/AdminMerchantPanel';
import Checkout from '../pages/Checkout';
import SellerDashboard from '../pages/User/SellerDashboard';
import PrimeMembership from '../pages/Info/PrimeMembership';
import OrderTracking from '../pages/Info/OrderTracking';
import BookExchange from '../pages/Info/BookExchange';
import FAQ from '../pages/Info/FAQ';
import Pricing from '../pages/Info/Pricing';
import Careers from '../pages/Info/Careers';
import StudyCorner from '../pages/Info/StudyCorner';
import Privacy from '../pages/Info/Privacy';
import Terms from '../pages/Info/Terms';
import SkillMarketplace from '../pages/SkillMarketplace';
import AIChatbot from './common/AIChatbot';
import AssignmentHelp from '../pages/services/AssignmentHelp';
import AssignmentCheckout from '../pages/services/AssignmentCheckout';
import { useGlobalState, actionTypes } from '../context/GlobalStateContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import {
  auth,
  cart as cartApi,
  products as productsApi,
  runtime as runtimeApi,
  settings as settingsApi,
  wishlist as wishlistApi,
} from '../utils/api';

const OAUTH_RETURN_PAGE_KEY = 'mcm.oauth.returnPage';
const OAUTH_RETURN_PARAMS_KEY = 'mcm.oauth.returnParams';
const OAUTH_BACK_GUARD_KEY = 'mcm.oauth.backGuardPending';
// Supported values: 'auto' | 'premium' | 'minimal'
const FOOTER_VARIANT = 'auto';
const BACKEND_WARMUP_HEAD_START_MAX_MS = 1200;
const AUTO_RECOVERY_RETRY_MS = 1000;
const INITIAL_PRODUCTS_FETCH_TIMEOUT_MS = 10000;
const LOADING_STUCK_FAILSAFE_MS = 12000;
const RECOVERY_WARMUP_TIMEOUT_MS = 900;
const RECOVERY_PRODUCTS_FETCH_TIMEOUT_MS = 3500;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;
const ACTIVE_SESSION_WINDOW_MS = 5 * 60 * 1000;
const BRAND_TITLE = 'MyCollegeMart';

const STATIC_PAGE_TITLES = {
  Home: 'Home',
  Marketplace: 'Marketplace',
  Login: 'Login',
  Signup: 'Create Account',
  About: 'About Us',
  Contact: 'Contact Us',
  Wishlist: 'Your Wishlist',
  Account: 'Your Account',
  Settings: 'Settings',
  Sell: 'Sell on MyCollegeMart',
  AdminMerchantPanel: 'Admin Dashboard',
  Checkout: 'Checkout',
  SellerDashboard: 'Seller Dashboard',
  PrimeMembership: 'Prime Membership',
  OrderTracking: 'Track Orders',
  BookExchange: 'Book Exchange',
  FAQ: 'Help Center',
  Pricing: 'Pricing',
  Careers: 'Careers',
  StudyCorner: 'Study Corner',
  Privacy: 'Privacy Policy',
  Terms: 'Terms and Conditions',
  SkillMarketplace: 'Skill Marketplace',
  AssignmentHelp: 'Assignment Help',
  AssignmentCheckout: 'Assignment Checkout',
};

const cleanTitleSegment = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const getSafeDisplayName = (user) => {
  const displayName = cleanTitleSegment(user?.displayName);
  return displayName && !/^guest$/i.test(displayName) ? displayName : '';
};

const getSafeShopName = (user) => cleanTitleSegment(user?.shopName);

const withBrandTitle = (title) => `${title} | ${BRAND_TITLE}`;

const getDocumentTitleForPage = (page, pageParams = {}, product = null, user = null) => {
  const safePage = String(page || 'Home');
  const safeDisplayName = getSafeDisplayName(user);
  const safeShopName = getSafeShopName(user);

  if (safePage === 'ProductDetail') {
    const productName = cleanTitleSegment(product?.name || product?.title || '');
    return withBrandTitle(productName || 'Product Details');
  }

  if (safePage === 'Marketplace') {
    const searchQuery = cleanTitleSegment(pageParams?.searchQuery);
    const category = cleanTitleSegment(pageParams?.category);

    if (searchQuery) {
      return withBrandTitle(`Search: ${searchQuery}`);
    }

    if (category) {
      return withBrandTitle(category);
    }
  }

  if (safePage === 'AssignmentHelp') {
    const service = cleanTitleSegment(pageParams?.service);
    if (service) {
      return withBrandTitle(`${service} Assignment Help`);
    }
  }

  if (safePage === 'OrderTracking') {
    const orderNumber = cleanTitleSegment(pageParams?.orderNumber || pageParams?.orderId);
    const trackingNumber = cleanTitleSegment(pageParams?.trackingNumber);

    if (orderNumber) {
      return withBrandTitle(`Order #${orderNumber} Tracking`);
    }

    if (trackingNumber) {
      return withBrandTitle(`Tracking #${trackingNumber}`);
    }

    return withBrandTitle('Track Orders & Deliveries');
  }

  if (safePage === 'SellerDashboard') {
    if (safeShopName) {
      return withBrandTitle(`${safeShopName} Seller Dashboard`);
    }

    if (safeDisplayName) {
      return withBrandTitle(`${safeDisplayName} Seller Dashboard`);
    }
  }

  if (safePage === 'AdminMerchantPanel' && safeDisplayName) {
    return withBrandTitle(`Admin Dashboard - ${safeDisplayName}`);
  }

  if (safePage === 'Account' && safeDisplayName) {
    return withBrandTitle(`${safeDisplayName} Account`);
  }

  if (safePage === 'Settings' && safeDisplayName) {
    return withBrandTitle(`${safeDisplayName} Settings`);
  }

  if (safePage === 'Wishlist' && safeDisplayName) {
    return withBrandTitle(`${safeDisplayName} Wishlist`);
  }

  if (safePage === 'AssignmentCheckout') {
    const serviceType = cleanTitleSegment(pageParams?.serviceType);
    const topic = cleanTitleSegment(pageParams?.topic);

    if (topic) {
      return withBrandTitle(`${topic} Checkout`);
    }

    if (serviceType) {
      return withBrandTitle(`${serviceType} Assignment Checkout`);
    }
  }

  const staticTitle = STATIC_PAGE_TITLES[safePage] || 'Home';
  return withBrandTitle(staticTitle);
};

const getSafePageParams = (value) => (value && typeof value === 'object' ? value : {});

const buildAppHistoryState = (page, pageParams = {}, extra = {}) => ({
  mcmAppPage: true,
  page: page || 'Home',
  params: getSafePageParams(pageParams),
  ...extra,
});

const getStoredAppState = () => {
  const page = localStorage.getItem('mcm.currentPage') || 'Home';
  try {
    return {
      page,
      params: getSafePageParams(JSON.parse(localStorage.getItem('mcm.pageParams') || '{}')),
    };
  } catch {
    return { page, params: {} };
  }
};

const replaceHistoryWithStoredAppState = () => {
  const cleanUrl = window.location.pathname + window.location.search;
  const stored = getStoredAppState();
  window.history.replaceState(buildAppHistoryState(stored.page, stored.params), '', cleanUrl);
};

const getOauthReturnState = () => {
  const savedPage = localStorage.getItem(OAUTH_RETURN_PAGE_KEY);
  const safePage = savedPage && !['Login', 'Signup'].includes(savedPage) ? savedPage : 'Home';

  try {
    const savedParams = JSON.parse(localStorage.getItem(OAUTH_RETURN_PARAMS_KEY) || '{}');
    return {
      page: safePage,
      params: savedParams && typeof savedParams === 'object' ? savedParams : {},
    };
  } catch {
    return {
      page: safePage,
      params: {},
    };
  }
};

const clearOauthReturnState = () => {
  localStorage.removeItem(OAUTH_RETURN_PAGE_KEY);
  localStorage.removeItem(OAUTH_RETURN_PARAMS_KEY);
  localStorage.removeItem(OAUTH_BACK_GUARD_KEY);
};

const setupOauthBackGuard = (page, pageParams = {}) => {
  const hasPendingGuard = localStorage.getItem(OAUTH_BACK_GUARD_KEY) === '1';
  if (!hasPendingGuard) {
    return;
  }

  const cleanUrl = window.location.pathname + window.location.search;
  const currentIndex = Number(window.history.state?.mcmAppIndex);
  const safeIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
  const appState = buildAppHistoryState(page, pageParams, { mcmAppIndex: safeIndex });
  window.history.replaceState(appState, '', cleanUrl);
  window.history.pushState(
    buildAppHistoryState(page, pageParams, { mcmAppIndex: safeIndex, mcmOauthBackGuard: true }),
    '',
    cleanUrl,
  );
  localStorage.removeItem(OAUTH_BACK_GUARD_KEY);
};

const AppContent = () => {
  const { state, dispatch } = useGlobalState();
  const { theme, setThemePreference } = useTheme();
  const { setLanguage } = useTranslation();

  const resolvedFooterVariant = FOOTER_VARIANT === 'auto'
    ? (theme === 'light' ? 'minimal' : 'premium')
    : FOOTER_VARIANT;

  // Persist page + params + selected product
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('mcm.currentPage') || 'Home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mcm.selectedProduct') || 'null'); } catch { return null; }
  });
  const [params, setParams] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mcm.pageParams') || '{}'); } catch { return {}; }
  });
  const lastUserActivityRef = useRef(Date.now());
  const isProductRecoveryRetrying = state.products.status === 'failed';
  const shouldShowProductRecoveryBanner = isProductRecoveryRetrying
    && ['Home', 'Marketplace', 'ProductDetail'].includes(currentPage);
  // const [pageData, setPageData] = useState(null);
  // const { state } = useGlobalState();

  const applyPageState = (page, pageParams = {}, options = {}) => {
    const {
      syncBrowserHistory = false,
      historyMethod = 'push',
      scrollToTop = true,
    } = options;

    const safePage = page || 'Home';
    const safeParams = getSafePageParams(pageParams);

    setCurrentPage(safePage);
    setParams(safeParams);
    localStorage.setItem('mcm.currentPage', safePage);
    localStorage.setItem('mcm.pageParams', JSON.stringify(safeParams));

    if (safePage === 'ProductDetail') {
      setSelectedProduct(safeParams || null);
      localStorage.setItem('mcm.selectedProduct', JSON.stringify(safeParams || null));
    } else {
      setSelectedProduct(null);
      localStorage.removeItem('mcm.selectedProduct');
    }

    if (syncBrowserHistory) {
      const cleanUrl = window.location.pathname + window.location.search;
      const currentIndex = Number(window.history.state?.mcmAppIndex);
      const safeCurrentIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
      const nextIndex = historyMethod === 'replace' ? safeCurrentIndex : safeCurrentIndex + 1;
      const appHistoryState = buildAppHistoryState(safePage, safeParams, { mcmAppIndex: nextIndex });
      if (historyMethod === 'replace') {
        window.history.replaceState(appHistoryState, '', cleanUrl);
      } else {
        window.history.pushState(appHistoryState, '', cleanUrl);
      }
    }

    if (scrollToTop) {
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      return;
    }

    const cleanUrl = window.location.pathname + window.location.search;
    const existingState = window.history.state;
    if (!existingState || existingState.mcmAppPage !== true) {
      window.history.replaceState(buildAppHistoryState(currentPage, params, { mcmAppIndex: 0 }), '', cleanUrl);
    } else if (!Number.isFinite(Number(existingState.mcmAppIndex))) {
      window.history.replaceState(
        buildAppHistoryState(existingState.page || currentPage, existingState.params || params, { mcmAppIndex: 0 }),
        '',
        cleanUrl,
      );
    }
  }, []);

  // Give cold backend a short warm-up head start before expensive first payload.
  useEffect(() => {
    if (state.products.status !== 'idle') {
      return;
    }

    let isCancelled = false;

    const warmupBackendAndFetchProducts = async () => {
      try {
        await Promise.race([
          runtimeApi.warmup(),
          new Promise((resolve) => {
            window.setTimeout(resolve, BACKEND_WARMUP_HEAD_START_MAX_MS);
          }),
        ]);
      } catch {
        // Initial page load should continue even if warm-up ping fails.
      }

      if (isCancelled) {
        return;
      }

      dispatch({ type: actionTypes.FETCH_PRODUCTS_START });

      try {
        const response = await productsApi.getAll({ timeout: INITIAL_PRODUCTS_FETCH_TIMEOUT_MS });
        if (!isCancelled) {
          dispatch({ type: actionTypes.FETCH_PRODUCTS_SUCCESS, payload: response.data });
        }
      } catch {
        if (!isCancelled) {
          dispatch({ type: actionTypes.FETCH_PRODUCTS_FAIL, payload: 'Failed to load products' });
        }
      }
    };

    warmupBackendAndFetchProducts();

    return () => {
      isCancelled = true;
    };
  }, [state.products.status, dispatch]);

  useEffect(() => {
    if (state.products.status !== 'loading' || typeof window === 'undefined') {
      return;
    }

    const failsafeTimer = window.setTimeout(() => {
      dispatch({ type: actionTypes.FETCH_PRODUCTS_FAIL, payload: 'Product request timed out' });
    }, LOADING_STUCK_FAILSAFE_MS);

    return () => {
      window.clearTimeout(failsafeTimer);
    };
  }, [state.products.status, dispatch]);

  useEffect(() => {
    if (typeof window === 'undefined' || state.products.status !== 'failed') {
      return;
    }

    let isCancelled = false;
    let recoveryInFlight = false;

    const attemptProductsRecovery = async () => {
      if (isCancelled || recoveryInFlight) {
        return;
      }

      recoveryInFlight = true;

      try {
        await runtimeApi.warmup({ timeout: RECOVERY_WARMUP_TIMEOUT_MS });

        if (isCancelled) {
          return;
        }

        const response = await productsApi.getAll({
          mcmSkipLoader: true,
          timeout: RECOVERY_PRODUCTS_FETCH_TIMEOUT_MS,
        });

        if (!isCancelled) {
          dispatch({ type: actionTypes.FETCH_PRODUCTS_SUCCESS, payload: response.data });

          if (state.isLoggedIn) {
            cartApi.get(state.user?.id)
              .then((cartResponse) => {
                const backendItems = Array.isArray(cartResponse.data?.items) ? cartResponse.data.items : [];
                const mappedItems = backendItems.reduce((acc, item) => {
                  acc[item.id] = {
                    id: item.id,
                    name: item.name,
                    price: Number(item.price || 0),
                    imageUrl: item.imageUrl,
                    quantity: Number(item.quantity || 1),
                  };
                  return acc;
                }, {});

                dispatch({ type: actionTypes.SET_CART, payload: { items: mappedItems } });
              })
              .catch(() => {
                // Keep current cart if silent recovery sync fails.
              });

            wishlistApi.get()
              .then((wishlistResponse) => {
                dispatch({
                  type: actionTypes.SET_WISHLIST,
                  payload: Array.isArray(wishlistResponse.data?.productIds) ? wishlistResponse.data.productIds : [],
                });
              })
              .catch(() => {
                // Keep current wishlist if silent recovery sync fails.
              });

            settingsApi.getMe()
              .then((settingsResponse) => {
                const preferences = settingsResponse.data?.preferences || {};
                if (preferences.themeMode) {
                  setThemePreference(preferences.themeMode);
                }
                if (preferences.preferredLanguage) {
                  setLanguage(preferences.preferredLanguage);
                }
              })
              .catch(() => {
                // Keep current preferences if silent recovery sync fails.
              });
          }

          dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: { message: 'Server is back online. Latest data synced automatically.', type: 'success' },
          });
        }
      } catch {
        // Keep retrying in the background until backend is reachable.
      } finally {
        recoveryInFlight = false;
      }
    };

    attemptProductsRecovery();
    const retryInterval = window.setInterval(attemptProductsRecovery, AUTO_RECOVERY_RETRY_MS);
    window.addEventListener('online', attemptProductsRecovery);

    return () => {
      isCancelled = true;
      window.clearInterval(retryInterval);
      window.removeEventListener('online', attemptProductsRecovery);
    };
  }, [
    state.products.status,
    state.isLoggedIn,
    state.user?.id,
    dispatch,
    setThemePreference,
    setLanguage,
  ]);

  useEffect(() => {
    if (!state.isLoggedIn || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const markUserActivity = () => {
      lastUserActivityRef.current = Date.now();
    };

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    markUserActivity();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markUserActivity, { passive: true });
    });

    const keepAliveInterval = window.setInterval(() => {
      const isPageVisible = document.visibilityState === 'visible';
      const isRecentlyActive = (Date.now() - lastUserActivityRef.current) <= ACTIVE_SESSION_WINDOW_MS;

      if (!isPageVisible || !isRecentlyActive) {
        return;
      }

      runtimeApi.warmup({ timeout: 10000 }).catch(() => {
        // Keep-alive failures are non-blocking and should stay silent.
      });
    }, KEEPALIVE_INTERVAL_MS);

    return () => {
      window.clearInterval(keepAliveInterval);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markUserActivity);
      });
    };
  }, [state.isLoggedIn]);

  useEffect(() => {
    if (!state.isLoggedIn) {
      return;
    }

    cartApi.get(state.user?.id)
      .then((response) => {
        const backendItems = Array.isArray(response.data?.items) ? response.data.items : [];
        const mappedItems = backendItems.reduce((acc, item) => {
          acc[item.id] = {
            id: item.id,
            name: item.name,
            price: Number(item.price || 0),
            imageUrl: item.imageUrl,
            quantity: Number(item.quantity || 1),
          };
          return acc;
        }, {});

        dispatch({ type: actionTypes.SET_CART, payload: { items: mappedItems } });
      })
      .catch(() => {
        // Keep local cart if backend cart fetch fails.
      });

    let localWishlistIds = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('mcm.wishlist') || '[]');
      localWishlistIds = Array.isArray(parsed)
        ? parsed
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
        : [];
    } catch {
      localWishlistIds = [];
    }

    wishlistApi.sync(localWishlistIds)
      .then((response) => {
        dispatch({
          type: actionTypes.SET_WISHLIST,
          payload: Array.isArray(response.data?.productIds) ? response.data.productIds : []
        });
      })
      .catch(() => {
        wishlistApi.get()
          .then((response) => {
            dispatch({
              type: actionTypes.SET_WISHLIST,
              payload: Array.isArray(response.data?.productIds) ? response.data.productIds : []
            });
          })
          .catch(() => {
            // Keep local wishlist if backend sync fails.
          });
      });

    settingsApi.getMe()
      .then((response) => {
        const preferences = response.data?.preferences || {};
        if (preferences.themeMode) {
          setThemePreference(preferences.themeMode);
        }
        if (preferences.preferredLanguage) {
          setLanguage(preferences.preferredLanguage);
        }
      })
      .catch(() => {
        // Keep current theme/language if settings fetch fails.
      });
  }, [state.isLoggedIn, state.user?.id, dispatch, setThemePreference, setLanguage]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) {
      return;
    }

    const paramsFromHash = new URLSearchParams(hash.slice(1));
    const tokenFromHash = paramsFromHash.get('token');
    const authError = paramsFromHash.get('authError');

    if (authError) {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: { message: 'Google sign-in failed. Please try again.', type: 'error' }
      });
      clearOauthReturnState();
      replaceHistoryWithStoredAppState();
      return;
    }

    if (!tokenFromHash) {
      return;
    }

    localStorage.setItem('token', tokenFromHash);

    auth.getCurrentUser()
      .then((userProfile) => {
        localStorage.setItem('user', JSON.stringify(userProfile));
        dispatch({ type: actionTypes.SET_USER, payload: userProfile });
        dispatch({
          type: actionTypes.SET_WISHLIST,
          payload: Array.isArray(userProfile?.wishlistProductIds) ? userProfile.wishlistProductIds : []
        });

        const oauthReturnState = getOauthReturnState();
        applyPageState(oauthReturnState.page, oauthReturnState.params, { scrollToTop: false });
        setupOauthBackGuard(oauthReturnState.page, oauthReturnState.params);
        clearOauthReturnState();
      })
      .catch(() => {
        localStorage.removeItem('token');
        clearOauthReturnState();
        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: { message: 'Google sign-in failed. Please try again.', type: 'error' }
        });
        replaceHistoryWithStoredAppState();
      });
  }, [dispatch]);

  useEffect(() => {
    const handleBrowserHistoryNavigation = (event) => {
      const historyState = event.state;
      if (!historyState || historyState.mcmAppPage !== true) {
        return;
      }

      const nextPage = typeof historyState.page === 'string' ? historyState.page : 'Home';
      const nextParams = getSafePageParams(historyState.params);
      applyPageState(nextPage, nextParams);

      if (historyState.mcmOauthBackGuard === true) {
        const cleanUrl = window.location.pathname + window.location.search;
        const guardIndex = Number(historyState.mcmAppIndex);
        const safeGuardIndex = Number.isFinite(guardIndex) ? guardIndex : 0;
        window.history.replaceState(
          buildAppHistoryState(nextPage, nextParams, { mcmAppIndex: safeGuardIndex }),
          '',
          cleanUrl,
        );
      }
    };

    window.addEventListener('popstate', handleBrowserHistoryNavigation);
    return () => window.removeEventListener('popstate', handleBrowserHistoryNavigation);
  }, []);

  // Enhanced navigation to track history
  const handleNavigate = (page, pageParams = {}) => {
    if (window.history.state?.mcmOauthBackGuard === true) {
      const cleanUrl = window.location.pathname + window.location.search;
      const currentIndex = Number(window.history.state?.mcmAppIndex);
      const safeIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
      window.history.replaceState(buildAppHistoryState(currentPage, params, { mcmAppIndex: safeIndex }), '', cleanUrl);
    }

    applyPageState(page, pageParams, { syncBrowserHistory: true, historyMethod: 'push' });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new Event('mcm-force-translate'));
  }, [currentPage, params]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.title = getDocumentTitleForPage(currentPage, params, selectedProduct, state.user);
  }, [currentPage, params, selectedProduct, state.user]);

  // Escape key handler for navigation
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') {
        return;
      }

      const state = window.history.state || {};
      const currentIndex = Number(state.mcmAppIndex);
      const safeIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
      const canGoBackInApp = state.mcmOauthBackGuard === true || safeIndex > 0;

      if (!canGoBackInApp) {
        return;
      }

      window.history.back();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'Home':
        return <Home onNavigate={handleNavigate} />;
      case 'Marketplace':
        return <Marketplace onNavigate={handleNavigate} initialCategory={params.category} initialSearch={params.searchQuery} />;
      case 'ProductDetail':
        return <ProductDetail product={selectedProduct} onNavigate={handleNavigate} />;
      case 'Login':
        return (
          <Login
            onNavigate={handleNavigate}
            defaultAccountType={params.accountType}
            defaultEmail={params.email}
            signupSuccessMessage={params.signupSuccessMessage}
          />
        );
      case 'Signup':
        return <Signup onNavigate={handleNavigate} defaultAccountType={params.accountType} />;
      case 'About':
        return <About onNavigate={handleNavigate} />;
      case 'Contact':
        return <Contact onNavigate={handleNavigate} />;
      case 'Wishlist':
        return <Wishlist onNavigate={handleNavigate} />;
      case 'Account':
        return <Account onNavigate={handleNavigate} />;
      case 'Settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'Sell':
        return <Sell onNavigate={handleNavigate} pageParams={params} />;
      case 'AdminMerchantPanel':
        return <AdminMerchantPanel onNavigate={handleNavigate} />;
      case 'Checkout':
        return <Checkout onNavigate={handleNavigate} />;
      case 'SellerDashboard':
        return <SellerDashboard onNavigate={handleNavigate} />;
      case 'PrimeMembership':
        return <PrimeMembership onNavigate={handleNavigate} />;
      case 'OrderTracking':
        return <OrderTracking onNavigate={handleNavigate} pageParams={params} />;
      case 'BookExchange':
        return <BookExchange onNavigate={handleNavigate} />;
      case 'FAQ':
        return <FAQ onNavigate={handleNavigate} />;
      case 'Pricing':
        return <Pricing onNavigate={handleNavigate} />;
      case 'Careers':
        return <Careers onNavigate={handleNavigate} />;
      case 'StudyCorner':
        return <StudyCorner onNavigate={handleNavigate} />;
      case 'Privacy':
        return <Privacy onNavigate={handleNavigate} />;
      case 'Terms':
        return <Terms onNavigate={handleNavigate} />;
      case 'SkillMarketplace':
        return <SkillMarketplace onNavigate={handleNavigate} />;
      case 'AssignmentHelp':
        return <AssignmentHelp onNavigate={handleNavigate} selectedService={params.service} />;
      case 'AssignmentCheckout':
        return <AssignmentCheckout onNavigate={handleNavigate} checkoutData={params} />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <Navbar onCartClick={() => setIsCartOpen(true)} onNavigate={handleNavigate} />
      
      <main className="flex-grow w-full max-w-7xl mx-auto px-3 py-5 sm:px-4 sm:py-8">
        {shouldShowProductRecoveryBanner && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            Reconnecting to the server. Fresh data will appear automatically in a moment.
          </div>
        )}
        {renderPage()}
      </main>
      
      <ShoppingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onNavigate={handleNavigate} />
      <Footer onNavigate={handleNavigate} variant={resolvedFooterVariant} />
      <AIChatbot isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} onNavigate={handleNavigate} />
    </div>
  );
};

export default AppContent;
