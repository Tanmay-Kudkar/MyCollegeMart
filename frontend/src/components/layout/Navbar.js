import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { settings as settingsApi } from '../../utils/api';
import {
  SearchIcon,
  ShoppingCartIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  HeartIcon,
  MicrophoneIcon
} from '../UI/Icons';

const Navbar = ({ onCartClick, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { state, dispatch } = useGlobalState();
  const isAdmin = Boolean(state.user?.isAdmin);
  const cartItemCount = Object.values(state.cart.items).reduce((sum, item) => sum + item.quantity, 0);
  const wishlistItemCount = Array.isArray(state.wishlist) ? state.wishlist.length : 0;
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 0) {
      setSuggestions(
        state.products.items.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onNavigate('Marketplace', { searchQuery: searchTerm });
      setSuggestions([]);
      setSearchTerm('');
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support voice search.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      handleSearchChange({target: {value: transcript}});
    };
    recognition.start();
  };

  const handleAccountClick = () => {
    onNavigate(state.isLoggedIn ? 'Account' : 'Login');
  };

  const handleLogout = () => {
    dispatch({ type: actionTypes.LOGOUT });
    setIsMenuOpen(false);
    onNavigate('Home');
  };

  const applyLanguagePreference = async (nextLanguageInput) => {
    const nextLanguage = (nextLanguageInput || 'EN').toUpperCase();
    const currentLanguage = (language || 'en').toUpperCase();

    if (nextLanguage === currentLanguage) {
      return;
    }

    setLanguage(nextLanguage);

    if (!state.isLoggedIn) {
      return;
    }

    try {
      await settingsApi.updateMe({ preferredLanguage: nextLanguage });
    } catch {
      dispatch({
        type: actionTypes.ADD_NOTIFICATION,
        payload: {
          message: 'Language changed locally, but could not save to account settings.',
          type: 'error'
        }
      });
    }
  };

  const handleLanguageChange = (event) => {
    applyLanguagePreference(event.target.value);
  };

  // Clean, reusable icon button (no gradient)
  const IconButton = ({ onClick, title, aria, children, disabled = false, active = false }) => (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.06 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={disabled ? undefined : onClick}
      type="button"
      aria-label={aria || title}
      title={title}
      className={[
        'relative group p-2 rounded-full',
        'text-slate-600 dark:text-slate-300',
        'border border-transparent hover:border-slate-200 dark:hover:border-slate-600',
        'hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-sm', // subtle shadow
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/60',
        'focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
        'transition-all duration-150',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        active ? 'text-indigo-600 dark:text-indigo-300' : ''
      ].join(' ')}
    >
      {/* icon */}
      <span className="relative z-10 flex items-center justify-center">
        {children}
      </span>
      {/* tooltip */}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        rounded bg-slate-900 text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100
                        shadow transition-opacity duration-150">
        {title}
      </span>
    </motion.button>
  );

  const navLinks = [
    { name: t('nav.home'), page: 'Home' },
    { name: t('nav.marketplace'), page: 'Marketplace' },
    { name: t('nav.skills'), page: 'SkillMarketplace' },
    { name: 'Study Corner', page: 'StudyCorner' },
    { name: 'Assignment Help', page: 'AssignmentHelp' },
    { name: t('nav.about'), page: 'About' },
    { name: t('nav.contact'), page: 'Contact' }
  ];
  const languageOptions = ['EN', 'HI', 'MR'];
  const languageLabels = {
    EN: 'English',
    HI: 'Hindi',
    MR: 'Marathi',
  };

  return (
    <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg sticky top-0 z-30 shadow-md">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-4 lg:px-8">
        <div className="flex flex-wrap items-center py-2 md:h-16 md:flex-nowrap md:py-0">
          {/* Hamburger menu */}
          <div className="relative" ref={menuRef}>
            <IconButton
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Menu"
              aria="Main menu"
            >
              <MenuIcon />
            </IconButton>
            {/* Dropdown menu */}
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 mt-2 z-50 w-64 max-w-[85vw] rounded-xl border-2 border-slate-300 bg-slate-100 shadow-xl shadow-slate-900/10 ring-1 ring-slate-300/70 dark:border-slate-700 dark:bg-slate-800 dark:ring-slate-700"
              >
                {/* Navigation buttons in dropdown menu */}
                <div className="py-1" role="menu">
                  {navLinks.map(link => (
                    <button
                      key={link.name}
                      type="button"
                      onClick={() => { onNavigate(link.page); setIsMenuOpen(false); }}
                      className={`mx-2 mb-1 block w-[calc(100%-1rem)] rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors
                    ${link.name === 'Sell'
                          ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60'}`}
                      role="menuitem"
                    >
                      {link.name}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-slate-300 px-3 py-2 dark:border-slate-700">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Language</p>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      {languageOptions.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => applyLanguagePreference(code)}
                          className={`w-full rounded-md px-2 py-1 text-center text-[11px] font-semibold transition ${((language || 'EN').toUpperCase() === code)
                            ? 'border border-cyan-700 bg-cyan-700 text-white'
                            : 'border border-slate-300 bg-slate-200 text-slate-800 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                          aria-label={`Switch language to ${languageLabels[code] || code}`}
                        >
                          {languageLabels[code] || code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 space-y-2 border-t border-slate-300 px-3 py-2 dark:border-slate-700">
                    {state.isLoggedIn ? (
                      <>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => { onNavigate('AdminMerchantPanel'); setIsMenuOpen(false); }}
                            className="block w-full rounded-lg border border-cyan-400 bg-cyan-100 px-3 py-2 text-center text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-200 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
                            role="menuitem"
                          >
                            Merchant Verification
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { onNavigate('Account'); setIsMenuOpen(false); }}
                          className="block w-full rounded-lg border border-slate-400 bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          role="menuitem"
                        >
                          Account
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="block w-full rounded-lg border border-rose-400 bg-rose-100 px-3 py-2 text-center text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-200 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                          role="menuitem"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => { onNavigate('Login'); setIsMenuOpen(false); }}
                          className="block w-full rounded-lg border border-amber-400 bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-400/40 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-500/10"
                          role="menuitem"
                        >
                          {t('login')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { onNavigate('Signup'); setIsMenuOpen(false); }}
                          className="block w-full rounded-lg border border-amber-500 bg-amber-400 px-3 py-2 text-center text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-500"
                          role="menuitem"
                        >
                          {t('signup')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Brand logo with both icon and text */}
          <div className="flex-shrink-0 ml-2 sm:ml-4">
            <button
              type="button"
              onClick={() => onNavigate('Home')}
              className="bg-transparent border-none p-0 m-0 cursor-pointer focus:outline-none flex items-center"
              style={{ background: 'none' }}
              aria-label="Go to Home"
              title="Home"
            >
              <span className="mr-3 inline-flex items-center justify-center">
                <img
                  src="/MyCollegeMart-Icon.jpg"
                  alt="MyCollegeMart Icon"
                  className="h-[46px] w-[46px] rounded-full object-cover"
                />
              </span>
              {/* Neutral brand wordmark (no dot, no blue) */}
              <span className="brand-wordmark hidden text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white sm:inline md:text-[26px]">
                MyCollegeMart
              </span>
            </button>
          </div>

          {/* Expanded search bar */}
          <div className="order-3 mt-2 w-full md:order-none md:mt-0 md:mx-4 md:min-w-[340px] md:flex-[1.7] lg:mx-6 lg:flex-[2.15]">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-12 py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>

                {/* Voice search button with subtle listening ring */}
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                  <div className="relative">
                    {isListening && (
                      <span className="absolute -inset-1 rounded-full ring-2 ring-rose-400/50 animate-pulse pointer-events-none" />
                    )}
                    <IconButton
                      onClick={handleVoiceSearch}
                      title={isListening ? 'Listening…' : 'Voice Search'}
                      aria="Voice search"
                      active={isListening}
                    >
                      <MicrophoneIcon />
                    </IconButton>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-3 py-2.5 md:px-5 md:py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-normal rounded-lg shadow-sm"
                disabled={!searchTerm.trim()}
              >
                <span className="hidden sm:inline">Search</span>
                <span className="sm:hidden">Go</span>
              </motion.button>

              {suggestions.length > 0 && (
                <ul className="absolute mt-1 top-full left-0 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg z-10 overflow-hidden">
                  {suggestions.slice(0, 5).map(product => (
                    <li
                      key={product.id}
                      onClick={() => { onNavigate('ProductDetail', product); setSuggestions([]); setSearchTerm(''); }}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-3"
                    >
                      <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-sm object-cover" />
                      <span className="font-medium">{product.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </div>

          {/* Right side icons */}
          <div className="ml-auto flex items-center gap-1.5 md:flex-shrink-0 md:gap-2">
            <div className="hidden md:flex items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-white/85 px-1.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800/75">
              <label htmlFor="mcm-language-select" className="sr-only">Language</label>
              <select
                id="mcm-language-select"
                value={(language || 'en').toUpperCase()}
                onChange={handleLanguageChange}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold tracking-wide text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                title="Language"
              >
                <option value="EN">English</option>
                <option value="HI">Hindi</option>
                <option value="MR">Marathi</option>
              </select>

              {!state.isLoggedIn && (
                <IconButton
                  onClick={handleAccountClick}
                  title="Login"
                  aria="Login"
                >
                  <UserCircleIcon />
                </IconButton>
              )}

              <IconButton
                onClick={toggleTheme}
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                aria="Toggle theme"
                active={false}
              >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </IconButton>

              <IconButton
                onClick={() => onNavigate('Wishlist')}
                title="Wishlist"
                aria="Wishlist"
                active={wishlistItemCount > 0}
              >
                <span className="relative">
                  <HeartIcon filled={wishlistItemCount > 0} />
                  {wishlistItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[11px] text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                      {wishlistItemCount > 99 ? '99+' : wishlistItemCount}
                    </span>
                  )}
                </span>
              </IconButton>

              <div className="relative">
                <IconButton onClick={onCartClick} title="Cart" aria="Cart" active={false}>
                  <span className="relative">
                    <ShoppingCartIcon />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[11px] text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                        {cartItemCount}
                      </span>
                    )}
                  </span>
                </IconButton>
              </div>
            </div>

            <div className="flex items-center gap-0.5 md:hidden">
              <IconButton
                onClick={handleAccountClick}
                title={state.isLoggedIn ? 'Account' : 'Login'}
                aria={state.isLoggedIn ? 'Account' : 'Login'}
              >
                <UserCircleIcon />
              </IconButton>

              <IconButton
                onClick={toggleTheme}
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                aria="Toggle theme"
              >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </IconButton>

              <IconButton
                onClick={() => onNavigate('Wishlist')}
                title="Wishlist"
                aria="Wishlist"
                active={wishlistItemCount > 0}
              >
                <span className="relative">
                  <HeartIcon filled={wishlistItemCount > 0} />
                  {wishlistItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[11px] text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                      {wishlistItemCount > 99 ? '99+' : wishlistItemCount}
                    </span>
                  )}
                </span>
              </IconButton>

              <div className="relative">
                <IconButton onClick={onCartClick} title="Cart" aria="Cart" active={false}>
                  <span className="relative">
                    <ShoppingCartIcon />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[11px] text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                        {cartItemCount}
                      </span>
                    )}
                  </span>
                </IconButton>
              </div>
            </div>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800/75">
              {state.isLoggedIn ? (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => onNavigate('AdminMerchantPanel')}
                      className="rounded-xl border border-cyan-300 bg-cyan-50 px-3.5 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('Account')}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Account
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate('Login')}
                    className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-400/40 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-500/10"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={() => onNavigate('Signup')}
                    className="rounded-xl border border-amber-500 bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-500"
                  >
                    {t('signup')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
