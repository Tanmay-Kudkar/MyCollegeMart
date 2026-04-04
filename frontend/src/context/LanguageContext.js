import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'mcm.language';
const GOOGLE_TRANSLATE_CONTAINER_ID = 'mcm-google-translate-element';
const GOOGLE_TRANSLATE_SCRIPT_ID = 'mcm-google-translate-script';
const GOOGLE_TRANSLATE_CALLBACK_NAME = 'mcmGoogleTranslateElementInit';
const GOOGLE_TRANSLATE_FORCE_EVENT = 'mcm-force-translate';

let googleTranslateLoadPromise = null;

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.marketplace': 'Marketplace',
    'nav.skills': 'Skills',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'login': 'Login',
    'signup': 'Sign Up',
    'search_placeholder': 'Search for books, notes, gadgets...',
  },
  hi: {
    'nav.home': 'होम',
    'nav.marketplace': 'बाज़ार',
    'nav.skills': 'कौशल',
    'nav.about': 'हमारे बारे में',
    'nav.contact': 'संपर्क करें',
    'login': 'लॉग इन करें',
    'signup': 'साइन अप करें',
    'search_placeholder': 'किताबें, नोट्स, गैजेट्स खोजें...',
  },
  mr: {
    'nav.home': 'मुख्यपृष्ठ',
    'nav.marketplace': 'मार्केटप्लेस',
    'nav.skills': 'कौशल्य',
    'nav.about': 'आमच्याबद्दल',
    'nav.contact': 'संपर्क',
    'login': 'लॉग इन',
    'signup': 'साइन अप',
    'search_placeholder': 'पुस्तके, नोट्स, गॅझेट्स शोधा...',
  },
};

const LanguageContext = createContext();

const normalizeLanguageCode = (value) => {
  const normalized = (value || '').toString().trim().toUpperCase();
  if (normalized === 'HI' || normalized === 'MR' || normalized === 'EN') {
    return normalized;
  }
  return 'EN';
};

const toContextLanguage = (code) => normalizeLanguageCode(code).toLowerCase();

const ensureTranslateContainer = () => {
  if (typeof document === 'undefined') {
    return null;
  }

  let container = document.getElementById(GOOGLE_TRANSLATE_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = GOOGLE_TRANSLATE_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.opacity = '0';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  }

  return container;
};

const waitForTranslateCombo = () => new Promise((resolve) => {
  if (typeof document === 'undefined') {
    resolve(false);
    return;
  }

  if (document.querySelector('.goog-te-combo')) {
    resolve(true);
    return;
  }

  let attempts = 0;
  const maxAttempts = 60;
  const intervalId = window.setInterval(() => {
    attempts += 1;
    if (document.querySelector('.goog-te-combo')) {
      window.clearInterval(intervalId);
      resolve(true);
      return;
    }

    if (attempts >= maxAttempts) {
      window.clearInterval(intervalId);
      resolve(false);
    }
  }, 100);
});

const createTranslateElement = () => {
  if (typeof window === 'undefined' || !window.google?.translate?.TranslateElement) {
    return false;
  }

  const container = ensureTranslateContainer();
  if (!container) {
    return false;
  }

  if (!document.querySelector('.goog-te-combo')) {
    // eslint-disable-next-line no-new
    new window.google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: 'en,hi,mr',
        autoDisplay: false,
      },
      GOOGLE_TRANSLATE_CONTAINER_ID,
    );
  }

  return true;
};

const ensureGoogleTranslateLoaded = async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (document.querySelector('.goog-te-combo')) {
    return true;
  }

  if (window.google?.translate?.TranslateElement) {
    createTranslateElement();
    return waitForTranslateCombo();
  }

  if (googleTranslateLoadPromise) {
    return googleTranslateLoadPromise;
  }

  googleTranslateLoadPromise = new Promise((resolve) => {
    let isResolved = false;
    const finish = (value) => {
      if (isResolved) {
        return;
      }
      isResolved = true;
      resolve(value);
    };

    window[GOOGLE_TRANSLATE_CALLBACK_NAME] = async () => {
      createTranslateElement();
      const ready = await waitForTranslateCombo();
      finish(ready);
    };

    const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
      script.src = `https://translate.google.com/translate_a/element.js?cb=${GOOGLE_TRANSLATE_CALLBACK_NAME}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => finish(false);
      document.body.appendChild(script);
    }

    window.setTimeout(async () => {
      if (isResolved) {
        return;
      }

      if (window.google?.translate?.TranslateElement) {
        createTranslateElement();
        const ready = await waitForTranslateCombo();
        finish(ready);
      } else {
        finish(false);
      }
    }, 8000);
  });

  return googleTranslateLoadPromise;
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return toContextLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const applyWebsiteLanguage = useCallback(async (targetLanguage, force = false) => {
    const desiredLanguage = toContextLanguage(targetLanguage);
    const isReady = await ensureGoogleTranslateLoaded();
    if (!isReady) {
      return false;
    }

    const combo = document.querySelector('.goog-te-combo');
    if (!combo) {
      return false;
    }

    const currentLanguage = (combo.value || 'en').toLowerCase();

    const applyComboValue = (nextValue) => {
      combo.value = nextValue;
      combo.dispatchEvent(new Event('change'));
    };

    if (!force && currentLanguage === desiredLanguage) {
      return true;
    }

    if (force && currentLanguage === desiredLanguage && desiredLanguage !== 'en') {
      applyComboValue('en');
      window.setTimeout(() => {
        applyComboValue(desiredLanguage);
      }, 50);
      return true;
    }

    applyComboValue(desiredLanguage);
    return true;
  }, []);

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = normalizeLanguageCode(nextLanguage);
    const contextLanguage = normalized.toLowerCase();
    setLanguageState(contextLanguage);

    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    }
  }, []);

  useEffect(() => {
    applyWebsiteLanguage(language);
  }, [language, applyWebsiteLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleForceTranslate = () => {
      if ((language || 'en').toLowerCase() === 'en') {
        return;
      }
      applyWebsiteLanguage(language, true);
    };

    window.addEventListener(GOOGLE_TRANSLATE_FORCE_EVENT, handleForceTranslate);
    return () => window.removeEventListener(GOOGLE_TRANSLATE_FORCE_EVENT, handleForceTranslate);
  }, [language, applyWebsiteLanguage]);

  const t = useCallback((key) => {
    const activePack = translations[language] || translations.en;
    return activePack[key] || translations.en[key] || key;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    applyPreferredLanguage: setLanguage,
    t,
  }), [language, setLanguage, t]);
  
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => useContext(LanguageContext);
