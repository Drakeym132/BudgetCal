import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Pencil, Check, Trash2 } from 'lucide-react';
import { formatDisplayDate, formatCurrency } from '../utils/dateUtils';
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
  runningBalances = [],
  dayBalance,
  isClosing,
  isReturningToView,
  onClose,
  onEdit,
  onDelete,
  onAddNew
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Reset edit state whenever the date changes or the modal closes
  useEffect(() => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  }, [selectedDate]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEnterEdit = () => {
    setIsEditMode(true);
    setSelectedIds(new Set());
  };

  const handleDone = () => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onDelete(id));
    setSelectedIds(new Set());
    // If all transactions were deleted, exit edit mode
    if (selectedIds.size === transactions.length) {
      setIsEditMode(false);
    }
  };

  const selectedCount = selectedIds.size;

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
          <div className="modal-header-left">
            <h2>Transactions for {formatDisplayDate(selectedDate)}</h2>
            {typeof dayBalance === 'number' && (
              <div className={`eod-summary ${dayBalance >= 0 ? 'positive' : 'negative'}`}>
                EOD Balance: <strong>${formatCurrency(dayBalance)}</strong>
              </div>
            )}
          </div>
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
            {transactions.map((tx, i) => {
              const withBalance = runningBalances[i] ?? tx;
              return (
                <motion.div
                  key={tx.id}
                  variants={itemVariants}
                  layout
                  layoutId={`modal-tx-${tx.id}`}
                >
                  <TransactionItem
                    transaction={withBalance}
                    isEditMode={isEditMode}
                    isSelected={selectedIds.has(tx.id)}
                    onToggleSelect={toggleSelect}
                    onEdit={onEdit}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        <div className="modal-footer">
          {isEditMode ? (
            <>
              <button
                className={`delete-selected-btn${selectedCount === 0 ? ' disabled' : ''}`}
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0}
              >
                <Trash2 size={16} />
                {selectedCount > 0 ? `Delete Selected (${selectedCount})` : 'Delete Selected'}
              </button>
              <button className="done-btn" onClick={handleDone}>
                <Check size={16} /> Done
              </button>
            </>
          ) : (
            <>
              <button className="add-more-btn" onClick={onAddNew}>
                <Plus size={18} /> Add Transaction
              </button>
              <button className="edit-mode-btn" onClick={handleEnterEdit}>
                <Pencil size={15} /> Edit
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ViewTransactionsModal;
