import React from 'react';
import { TrendingUp, TrendingDown, Repeat, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/dateUtils';

const TransactionItem = ({ transaction, onEdit, onDelete }) => {
  const { type, name, amount, recurring, date } = transaction;

  return (
    <div className="view-tx-item">
      <div className="tx-info">
        <div className={`tx-icon ${type}`}>
          {type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        </div>
        <div className="tx-details">
          <h4>{name}</h4>
          <span>
            {recurring === 'once' ? 'One-time' : recurring.charAt(0).toUpperCase() + recurring.slice(1)}
            {recurring !== 'once' && <> <Repeat size={10} /> from {date}</>}
          </span>
        </div>
      </div>
      <div className="tx-right">
        <span className={`tx-amount-display ${type}`}>
          {type === 'income' ? '+' : '-'}${formatCurrency(amount)}
        </span>
        <button className="edit-btn" onClick={() => onEdit(transaction)}>
          Edit
        </button>
        <button className="delete-btn" onClick={() => onDelete(transaction.id)}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default TransactionItem;
