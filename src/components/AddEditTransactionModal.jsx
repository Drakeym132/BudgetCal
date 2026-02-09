import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDisplayDate } from '../utils/dateUtils';

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

const goBackVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: { opacity: 0, x: -30 },
};

const AddEditTransactionModal = ({ 
  selectedDate,
  editingTransaction,
  isEditingFromView,
  isClosing,
  isGoingBack,
  newTransaction,
  setNewTransaction,
  onClose,
  onBack,
  onSubmit
}) => {
  const getTitle = () => {
    if (editingTransaction) return 'Edit Transaction';
    if (selectedDate) return `Add Transaction for ${formatDisplayDate(selectedDate, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return 'Add Transaction';
  };

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
        variants={isGoingBack ? goBackVariants : modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          {isEditingFromView && (
            <button className="back-btn" onClick={onBack}>
              <ArrowLeft size={18} />
            </button>
          )}
          <h2>{getTitle()}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="type-toggle">
          <button 
            className={`type-btn ${newTransaction.type === 'income' ? 'active income' : ''}`}
            onClick={() => setNewTransaction({...newTransaction, type: 'income'})}
          >
            <TrendingUp size={18} /> Income
          </button>
          <button 
            className={`type-btn ${newTransaction.type === 'expense' ? 'active expense' : ''}`}
            onClick={() => setNewTransaction({...newTransaction, type: 'expense'})}
          >
            <TrendingDown size={18} /> Expense
          </button>
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={newTransaction.name}
            onChange={(e) => setNewTransaction({...newTransaction, name: e.target.value})}
            placeholder="e.g., Paycheck, Rent, Netflix..."
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <select
              value={newTransaction.recurring}
              onChange={(e) => setNewTransaction({...newTransaction, recurring: e.target.value})}
            >
              <option value="once">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={newTransaction.date}
              onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
            />
          </div>
          {newTransaction.recurring !== 'once' && (
            <div className="form-group">
              <label>End Date (optional)</label>
              <input
                type="date"
                value={newTransaction.endDate}
                onChange={(e) => setNewTransaction({...newTransaction, endDate: e.target.value})}
              />
            </div>
          )}
        </div>
        
        <button 
          className={`submit-btn ${newTransaction.type}`}
          onClick={onSubmit}
        >
          <DollarSign size={18} /> {editingTransaction ? 'Save Changes' : `Add ${newTransaction.type === 'income' ? 'Income' : 'Expense'}`}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default AddEditTransactionModal;
