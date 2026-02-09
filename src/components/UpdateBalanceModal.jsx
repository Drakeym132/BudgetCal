import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, Wallet } from 'lucide-react';

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

const UpdateBalanceModal = ({ 
  isOpen, 
  currentBalance, 
  onClose, 
  onSave,
  isClosing 
}) => {
  const [balance, setBalance] = useState(currentBalance.toString());

  useEffect(() => {
    if (isOpen) {
      setBalance(currentBalance.toString());
    }
  }, [isOpen, currentBalance]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(parseFloat(balance) || 0);
  };

  if (!isOpen) return null;

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
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Update Current Balance</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="balance-display">
            <Wallet size={24} className="balance-display-icon" />
            <div className="balance-display-info">
              <span className="balance-display-label">Current Balance</span>
              <span className={`balance-display-value ${currentBalance >= 0 ? 'positive' : 'negative'}`}>
                ${Math.abs(currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>New Balance</label>
            <div className="amount-input-wrapper">
              <DollarSign size={18} className="amount-input-icon" />
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <p className="form-hint">Enter your current account balance as of today.</p>
          </div>
          
          <button type="submit" className="submit-btn update-balance">
            <DollarSign size={18} /> Save Balance
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default UpdateBalanceModal;
