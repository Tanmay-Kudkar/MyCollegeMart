import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGlobalState, actionTypes } from '../../context/GlobalStateContext';
import { CloseIcon } from '../UI/Icons';

const Notification = ({ message, type, onDismiss }) => {
  const bgColor = type === 'success' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900';
  const textColor = type === 'success' ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200';
  const borderColor = type === 'success' ? 'border-green-400' : 'border-red-400';

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`pointer-events-auto mcm-overlay-card mb-3 flex w-full items-start gap-3 border-l-4 p-4 shadow-lg ${borderColor} ${bgColor} ${textColor}`}
    >
      <span className="min-w-0 flex-1 break-words text-sm leading-5">{message}</span>
      <button onClick={onDismiss} className="shrink-0 rounded-full p-1 transition hover:bg-black/10 dark:hover:bg-white/10" aria-label="Close notification">
        <CloseIcon className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

const NotificationHost = () => {
  const { state, dispatch } = useGlobalState();
  const { notifications } = state;
  
  const handleDismiss = (id) => {
    dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: id });
  };

  return createPortal(
    <div className="pointer-events-none fixed z-[9999] mcm-safe-top-inset mcm-safe-x-inset sm:left-auto sm:w-full sm:max-w-sm sm:mcm-safe-top-inset-lg sm:mcm-safe-right-inset-lg">
      {notifications.map(n => (
        <Notification key={n.id} {...n} onDismiss={() => handleDismiss(n.id)} />
      ))}
    </div>,
    document.body
  );
};

export default NotificationHost;
