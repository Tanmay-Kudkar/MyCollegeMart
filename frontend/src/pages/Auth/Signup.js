import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { auth } from '../../utils/api';
import googleIcon from '../../../assets/google-icon.svg';

const INPUT_CLASS = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-cyan-900/40';

const Signup = ({ onNavigate, defaultAccountType }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState(
        (defaultAccountType || '').toUpperCase() === 'MERCHANT' ? 'MERCHANT' : 'INDIVIDUAL'
    );
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { dispatch } = useGlobalState();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'email') setEmail(value);
        else if (name === 'password') setPassword(value);
    };

    // This function for standard registration is correct.
    // We will apply the same improvements to it.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await auth.register({ email, password, accountType });
            
            const loginResponse = await auth.login({ email, password, accountType });
            localStorage.setItem('token', loginResponse.token);
            
            const userProfile = await auth.getCurrentUser();
            // ✅ 3. Save the user profile to localStorage to persist the session.
            localStorage.setItem('user', JSON.stringify(userProfile));
            dispatch({ type: actionTypes.SET_USER, payload: userProfile });
            
            onNavigate('Home');
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.message || "Failed to create account.");
        }
        setIsLoading(false);
    };

    const handleGoogleSignUp = () => {
        setError('');
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
                <section className="hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 p-8 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 lg:flex lg:flex-col lg:justify-between">
                    <div>
                        <p className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:border-cyan-800/50 dark:bg-cyan-900/30 dark:text-cyan-300">
                            Start Selling Or Shopping
                        </p>
                        <h2 className="mcm-display mt-4 text-4xl font-bold text-slate-900 dark:text-white">Create Your MyCollegeMart Account</h2>
                        <p className="mt-3 text-slate-600 dark:text-slate-300">
                            Join a verified campus marketplace for study materials, tools, and student services. Switch between individual and merchant workflows anytime.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Student Ready</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Marketplace + Skill Help</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Merchant Tools</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Listing + Dashboard</p>
                        </div>
                    </div>
                </section>

                <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
                    <h1 className="mcm-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Create account</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set up your student or merchant profile.</p>

                    <div className="mt-6 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Account Type</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Merchant access is for campus student sellers to list and manage items.
                        </p>
                    </div>

                    <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={handleChange}
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
                                onChange={handleChange}
                                required
                                className={INPUT_CLASS}
                            />
                        </div>

                        {error && (
                            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl border border-amber-500 bg-amber-400 py-2.5 font-semibold text-slate-900 transition-colors hover:bg-amber-500 disabled:opacity-60"
                        >
                            {isLoading ? 'Creating account...' : `Create ${accountType === 'MERCHANT' ? 'Merchant' : 'Individual'} Account`}
                        </button>
                    </form>

                    <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        By creating an account, you agree to MyCollegeMart&apos;s Conditions of Use and Privacy Notice.
                    </p>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="rounded-full border border-slate-200 bg-white px-2 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">or</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignUp}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                        <img
                            src={googleIcon}
                            alt=""
                            aria-hidden="true"
                            className="mr-2 inline-block h-5 w-5"
                        />
                        Sign up with Google
                    </button>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Already have an account?{' '}
                        <button 
                            onClick={() => onNavigate('Login', { accountType })} 
                            className="font-semibold text-cyan-700 hover:underline dark:text-cyan-400"
                        >
                            Sign in
                        </button>
                    </p>
                </div>
                </section>
            </motion.div>
        </div>
    );
};

export default Signup;