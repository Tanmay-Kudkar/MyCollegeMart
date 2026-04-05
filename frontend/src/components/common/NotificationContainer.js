import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';

const Notification = ({ notification, onRemove }) => {
  useEffect(() => {
    const autoDismissMs = notification.type === 'error' ? 4500 : 2500;
    const timer = setTimeout(() => onRemove(notification.id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [notification.id, notification.type, onRemove]);

  const isSuccess = notification.type === 'success';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`pointer-events-auto mcm-overlay-card mb-3 flex w-full items-start gap-3 border p-4 text-white shadow-lg ${isSuccess ? 'border-green-400/50 bg-green-500' : 'border-red-400/50 bg-red-500'}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{isSuccess ? 'Success' : 'Error'}</p>
        <p className="mt-0.5 break-words text-sm leading-5">{notification.message}</p>
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="shrink-0 rounded-full p-1 transition hover:bg-white/20"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" /></svg>
      </button>
    </motion.div>
  );
};

const NotificationContainer = () => {
  const { state, dispatch } = useGlobalState();
  const { notifications } = state;

  const removeNotification = (id) => {
    dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: id });
  };

  // De-duplicate by type+message and show only the latest 3
  const deduped = [];
  const seen = new Set();
  for (const n of notifications) {
    const key = `${n.type}:${n.message}`;
    if (!seen.has(key)) {
      deduped.push(n);
      seen.add(key);
    }
  }
  const toShow = deduped.slice(-3); // last 3 only

  return (
    <div className="pointer-events-none fixed z-[100] mcm-safe-top-inset mcm-safe-x-inset sm:left-auto sm:w-full sm:max-w-sm sm:mcm-safe-top-inset-lg sm:mcm-safe-right-inset-lg">
      <AnimatePresence initial={false}>
        {toShow.map(n => (
          <Notification key={n.id} notification={n} onRemove={removeNotification} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
