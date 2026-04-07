// src/components/CustomModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '🏆';
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚡';
      default:
        return '📢';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-900/90';
      case 'error':
        return 'border-red-500 bg-red-900/90';
      case 'warning':
        return 'border-yellow-500 bg-yellow-900/90';
      default:
        return 'border-blue-500 bg-blue-900/90';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`max-w-md w-full rounded-2xl shadow-2xl border-2 ${getColors()} p-6 text-center`}
          >
            <div className="text-6xl mb-4">{getIcon()}</div>
            <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
            <p className="text-gray-200 whitespace-pre-line mb-6">{message}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomModal;