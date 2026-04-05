import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { auth } from '../../utils/api';
import googleIcon from '../../../assets/google-icon.svg';

const INPUT_CLASS = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-900/40';

const Login = ({ onNavigate, defaultAccountType, defaultEmail, signupSuccessMessage }) => {
    const [email, setEmail] = useState(defaultEmail || '');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState(
        (defaultAccountType || '').toUpperCase() === 'MASTER'
            ? 'MASTER'
            : (defaultAccountType || '').toUpperCase() === 'MERCHANT'
                ? 'MERCHANT'
                : 'INDIVIDUAL'
    );
    const [isLoading, setIsLoading] = useState(false);
    const [notice, setNotice] = useState(signupSuccessMessage || '');
    const { dispatch } = useGlobalState();

    // This function for standard email/password login is correct.
    // We will apply the same improvements to it.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setNotice('');
        try {
            const response = await auth.login({ email, password, accountType });
            localStorage.setItem('token', response.token);

            const userProfile = await auth.getCurrentUser();
            // ✅ 3. Save the user profile to localStorage to persist the session.
            localStorage.setItem('user', JSON.stringify(userProfile));
            dispatch({ type: actionTypes.SET_USER, payload: userProfile });

            onNavigate('Home');
        } catch (err) {
            console.error("Login error:", err);
            dispatch({
                type: actionTypes.ADD_NOTIFICATION,
                payload: {
                    message: err?.message || 'Failed to sign in. Please check your credentials.',
                    type: 'error'
                }
            });
        }
        setIsLoading(false);
    };

    const handleGoogleSignIn = () => {
        setNotice('');
        if (accountType === 'MASTER') {
            dispatch({
                type: actionTypes.ADD_NOTIFICATION,
                payload: {
                    message: 'Master portal supports secure email/password sign in only.',
                    type: 'error'
                }
            });
            return;
        }
        auth.startGoogleLoginForAccountType(accountType);
    };

    return (
        <div className="min-h-[82vh] bg-slate-100 px-4 py-8 transition-colors dark:bg-slate-900 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_minmax(0,460px)]"
            >
                <section className="hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 lg:flex lg:flex-col">
                    <div>
                        <p className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:border-cyan-800/50 dark:bg-cyan-900/30 dark:text-cyan-300">
                            Secure Student Commerce
                        </p>
                        <h2 className="mcm-display mt-4 text-4xl font-bold text-slate-900 dark:text-white">Welcome Back to MyCollegeMart</h2>
                        <p className="mt-3 text-slate-600 dark:text-slate-300">
                            Sign in to continue shopping verified campus listings, track orders, manage wallet, and switch to merchant tools whenever needed.
                        </p>
                    </div>

                    <div className="my-6 flex flex-1 items-center justify-center rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-cyan-50 p-8 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40">
                        <img
                            src="/MyCollegeMart-Icon.jpg"
                            alt="MyCollegeMart Logo"
                            className="h-full w-full object-contain"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Fast Checkout</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Saved Cart + Wallet</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Seller Ready</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Merchant Dashboard</p>
                        </div>
                    </div>
                </section>

                <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
                    <h1 className="mcm-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Access your student or merchant account.</p>

                    <div className="mt-6 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Choose Portal</p>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                onClick={() => setAccountType('INDIVIDUAL')}
                                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${accountType === 'INDIVIDUAL'
                                    ? 'bg-cyan-700 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountType('MERCHANT')}
                                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${accountType === 'MERCHANT'
                                    ? 'bg-cyan-700 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                Business / Merchant
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountType('MASTER')}
                                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${accountType === 'MASTER'
                                    ? 'bg-slate-900 text-white dark:bg-cyan-700'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                Master
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Individual: buy and request study services. Merchant: list products. Master: full A to Z control.
                        </p>
                    </div>

                    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className={INPUT_CLASS}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className={INPUT_CLASS}
                            />
                        </div>

                        {notice && (
                            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                                {notice}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl border border-amber-500 bg-amber-400 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-amber-500 disabled:opacity-60"
                        >
                            {isLoading ? 'Signing in...' : 'Continue'}
                        </button>
                    </form>

                    <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        By continuing, you agree to MyCollegeMart&apos;s Conditions of Use and Privacy Notice.
                    </p>

                    {accountType === 'MASTER' ? (
                        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-200">
                            Master portal is restricted to secure email/password authentication only.
                            Google sign-in and self-signup are disabled for this portal.
                        </div>
                    ) : (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-xs uppercase tracking-[0.2em] text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">or</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                className="group w-full rounded-xl border border-slate-300 bg-white py-2.5 font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                            >
                                <img
                                    src={googleIcon}
                                    alt=""
                                    aria-hidden="true"
                                    className="mr-2 inline-block h-5 w-5 align-[-2px]"
                                />
                                Continue with Google
                            </button>

                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">New to MyCollegeMart?</p>
                                <button
                                    onClick={() => onNavigate('Signup', { accountType })}
                                    className="mt-2.5 w-full rounded-xl border border-amber-500 bg-amber-400 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-amber-500"
                                >
                                    Create your {accountType === 'MERCHANT' ? 'Merchant' : 'Student'} account
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </motion.div>
        </div>
    );
};

export default Login;