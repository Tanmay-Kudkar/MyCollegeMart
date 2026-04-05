import React from 'react';
import { motion } from 'framer-motion';

const PlaceholderPage = ({ title, children }) => (
    <div className="min-h-[60vh] py-12">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl rounded-xl border-2 border-slate-400 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6">{title}</h1>
            <div className="prose dark:prose-invert max-w-none">
                {children}
            </div>
        </motion.div>
    </div>
);

export default PlaceholderPage;
