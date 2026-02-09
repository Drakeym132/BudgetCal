import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { formatDisplayDate } from '../utils/dateUtils';
import TransactionItem from './TransactionItem';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

const listVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    transition: { duration: 0.2 } 
  }
};

const ViewTransactionsModal = ({ 
  selectedDate, 
  transactions, 
  isClosing, 
  isReturningToView,
  onClose, 
  onEdit, 
  onDelete, 
  onAddNew 
}) => {
  return (
    <motion.div 
      className="modal-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div 
        className="modal"
        variants={modalVariants}
        initial={isReturningToView ? false : "hidden"}
        animate="visible"
        exit="exit"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Transactions for {formatDisplayDate(selectedDate)}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <motion.div 
          className="view-tx-list"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {transactions.map(tx => (
              <motion.div
                key={tx.id}
                variants={itemVariants}
                layout
                layoutId={`modal-tx-${tx.id}`}
              >
                <TransactionItem
                  transaction={tx}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        
        <button className="add-more-btn" onClick={onAddNew}>
          <Plus size={18} /> Add Transaction
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ViewTransactionsModal;
