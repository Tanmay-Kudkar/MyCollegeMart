import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { products as productsApi } from '../utils/api';

const CART_STORAGE_KEY = 'mcm.cart';
const WISHLIST_STORAGE_KEY = 'mcm.wishlist';
const WALLET_STORAGE_KEY = 'mcm.wallet';

const buildGuestUser = () => ({
  id: null,
  displayName: 'Guest',
  email: null,
  isPrimeMember: false,
  primeExpiryDate: null,
});

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const getInitialCart = () => {
  const stored = safeParse(localStorage.getItem(CART_STORAGE_KEY), null);
  if (stored && typeof stored === 'object' && stored.items && typeof stored.items === 'object') {
    return stored;
  }
  return { items: {} };
};

const getInitialWishlist = () => {
  const stored = safeParse(localStorage.getItem(WISHLIST_STORAGE_KEY), []);
  return Array.isArray(stored) ? stored : [];
};

const getInitialWallet = () => {
  const value = Number(localStorage.getItem(WALLET_STORAGE_KEY));
  return Number.isFinite(value) ? value : 0;
};

const normalizeUser = (user) => ({
  ...buildGuestUser(),
  ...(user || {}),
  isPrimeMember: Boolean(user?.isPrimeMember),
});

const buildNotification = (payload) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: payload?.type === 'error' ? 'error' : 'success',
  message: payload?.message || '',
});

export const actionTypes = {
  SET_USER: 'SET_USER',
  LOGOUT: 'LOGOUT',
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  UPDATE_CART_ITEM_QUANTITY: 'UPDATE_CART_ITEM_QUANTITY',
  DECREASE_QUANTITY: 'DECREASE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  TOGGLE_WISHLIST: 'TOGGLE_WISHLIST',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  FETCH_PRODUCTS_START: 'FETCH_PRODUCTS_START',
  FETCH_PRODUCTS_SUCCESS: 'FETCH_PRODUCTS_SUCCESS',
  FETCH_PRODUCTS_FAIL: 'FETCH_PRODUCTS_FAIL',
  USE_WALLET_FUNDS: 'USE_WALLET_FUNDS',
  SET_PRIME_MEMBERSHIP: 'SET_PRIME_MEMBERSHIP',
};

const initialState = {
  user: buildGuestUser(),
  isLoggedIn: false,
  cart: getInitialCart(),
  wishlist: getInitialWishlist(),
  notifications: [],
  studentWallet: getInitialWallet(),
  products: {
    items: [],
    status: 'idle',
    error: null,
    api: productsApi,
  },
};

const globalStateReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_USER: {
      const isLoggedIn = Boolean(action.payload);
      return {
        ...state,
        user: normalizeUser(action.payload),
        isLoggedIn,
      };
    }

    case actionTypes.LOGOUT:
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: buildGuestUser(),
        isLoggedIn: false,
      };

    case actionTypes.ADD_TO_CART: {
      const product = action.payload;
      const productId = product?.id;
      if (!productId) return state;

      const currentItem = state.cart.items[productId];
      if (productId === 'prime-membership' && currentItem) {
        return state;
      }

      const nextQuantity = (currentItem?.quantity || 0) + 1;

      return {
        ...state,
        cart: {
          ...state.cart,
          items: {
            ...state.cart.items,
            [productId]: {
              ...(currentItem || {}),
              ...product,
              quantity: nextQuantity,
            },
          },
        },
      };
    }

    case actionTypes.REMOVE_FROM_CART: {
      const productId = action.payload;
      if (!productId || !state.cart.items[productId]) return state;

      const nextItems = { ...state.cart.items };
      delete nextItems[productId];

      return {
        ...state,
        cart: {
          ...state.cart,
          items: nextItems,
        },
      };
    }

    case actionTypes.UPDATE_CART_ITEM_QUANTITY: {
      const productId = action.payload?.id;
      const quantity = Number(action.payload?.quantity);
      if (!productId || !state.cart.items[productId] || !Number.isFinite(quantity)) {
        return state;
      }

      if (quantity <= 0) {
        const nextItems = { ...state.cart.items };
        delete nextItems[productId];
        return {
          ...state,
          cart: {
            ...state.cart,
            items: nextItems,
          },
        };
      }

      return {
        ...state,
        cart: {
          ...state.cart,
          items: {
            ...state.cart.items,
            [productId]: {
              ...state.cart.items[productId],
              quantity,
            },
          },
        },
      };
    }

    case actionTypes.DECREASE_QUANTITY: {
      const productId = action.payload;
      const currentItem = state.cart.items[productId];
      if (!currentItem) return state;

      const nextQuantity = currentItem.quantity - 1;
      if (nextQuantity <= 0) {
        const nextItems = { ...state.cart.items };
        delete nextItems[productId];
        return {
          ...state,
          cart: {
            ...state.cart,
            items: nextItems,
          },
        };
      }

      return {
        ...state,
        cart: {
          ...state.cart,
          items: {
            ...state.cart.items,
            [productId]: {
              ...currentItem,
              quantity: nextQuantity,
            },
          },
        },
      };
    }

    case actionTypes.CLEAR_CART:
      return {
        ...state,
        cart: {
          ...state.cart,
          items: {},
        },
      };

    case actionTypes.TOGGLE_WISHLIST: {
      const productId = action.payload;
      if (!productId) return state;

      const exists = state.wishlist.includes(productId);
      return {
        ...state,
        wishlist: exists
          ? state.wishlist.filter((id) => id !== productId)
          : [...state.wishlist, productId],
      };
    }

    case actionTypes.ADD_NOTIFICATION: {
      const notification = buildNotification(action.payload);
      if (!notification.message) return state;
      return {
        ...state,
        notifications: [...state.notifications, notification],
      };
    }

    case actionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    case actionTypes.FETCH_PRODUCTS_START:
      return {
        ...state,
        products: {
          ...state.products,
          status: 'loading',
          error: null,
        },
      };

    case actionTypes.FETCH_PRODUCTS_SUCCESS: {
      const items = Array.isArray(action.payload)
        ? action.payload
        : Array.isArray(action.payload?.items)
          ? action.payload.items
          : Array.isArray(action.payload?.content)
            ? action.payload.content
          : [];
      return {
        ...state,
        products: {
          ...state.products,
          items,
          status: 'succeeded',
          error: null,
        },
      };
    }

    case actionTypes.FETCH_PRODUCTS_FAIL:
      return {
        ...state,
        products: {
          ...state.products,
          status: 'failed',
          error: action.payload || 'Failed to load products',
        },
      };

    case actionTypes.USE_WALLET_FUNDS: {
      const amount = Number(action.payload);
      if (!Number.isFinite(amount) || amount <= 0) return state;
      return {
        ...state,
        studentWallet: Math.max(0, state.studentWallet - amount),
      };
    }

    case actionTypes.SET_PRIME_MEMBERSHIP:
      return {
        ...state,
        user: {
          ...state.user,
          isPrimeMember: true,
          primeExpiryDate: action.payload || null,
        },
      };

    default:
      return state;
  }
};

const GlobalStateContext = createContext(undefined);

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        dispatch({ type: actionTypes.SET_USER, payload: parsedUser });
      } catch {
        dispatch({ type: actionTypes.LOGOUT });
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  }, [state.cart]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(state.wishlist));
  }, [state.wishlist]);

  useEffect(() => {
    localStorage.setItem(WALLET_STORAGE_KEY, String(state.studentWallet));
  }, [state.studentWallet]);

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
