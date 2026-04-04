import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { auth } from '../../utils/api';
import googleIcon from '../../../assets/google-icon.svg';

const Login = ({ onNavigate }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { dispatch } = useGlobalState();

    // This function for standard email/password login is correct.
    // We will apply the same improvements to it.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await auth.login({ email, password });
            localStorage.setItem('token', response.token);

            const userProfile = await auth.getCurrentUser();
            // ✅ 3. Save the user profile to localStorage to persist the session.
            localStorage.setItem('user', JSON.stringify(userProfile));
            dispatch({ type: actionTypes.SET_USER, payload: userProfile });

            onNavigate('Home');
        } catch (err) {
            console.error("Login error:", err);
            setError(err.message || "Failed to sign in. Please check your credentials.");
        }
        setIsLoading(false);
    };

    const handleGoogleSignIn = () => {
        setError('');
        auth.startGoogleLogin();
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-start bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4 pt-10 pb-8 transition-colors">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm p-7 border border-slate-300/90 dark:border-slate-700 rounded-2xl bg-white/95 dark:bg-slate-800/90 shadow-xl shadow-slate-300/35 dark:shadow-black/35 backdrop-blur"
            >
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-5">Sign in</h1>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-400/90 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.16)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-400/90 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.16)]"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-lg bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-semibold shadow-md border border-amber-500/90 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {isLoading ? 'Signing in...' : 'Continue'}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-400 mt-4">
                    By continuing, you agree to MyCollegeMart's Conditions of Use and Privacy Notice.
                </p>
                <div className="relative my-7">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-3 py-0.5 text-xs uppercase tracking-[0.2em] bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-600 rounded-full">or</span>
                    </div>
                </div>
                <div className="w-full">
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="group w-full py-2.5 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-300 dark:border-slate-500 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800"
                    >
                        <img
                            src={googleIcon}
                            alt=""
                            aria-hidden="true"
                            className="inline-block w-5 h-5 mr-2 align-[-2px] transition-transform duration-200 group-hover:scale-110"
                        />
                        Continue with Google
                    </button>
                </div>
            </motion.div>
            <div className="w-full max-w-sm mt-4 text-center rounded-xl border border-slate-300/90 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 p-4 shadow-md shadow-slate-300/20 dark:shadow-black/20 backdrop-blur-sm">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">New to MyCollegeMart?</p>
                <button
                    onClick={() => onNavigate('Signup')}
                    className="w-full mt-2.5 py-2.5 px-4 rounded-lg bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-semibold border border-amber-500/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                >
                    Create your MyCollegeMart account
                </button>
            </div>
        </div>
    );
};

export default Login;