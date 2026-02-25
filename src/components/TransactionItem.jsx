import React from 'react';
import { TrendingUp, TrendingDown, Repeat, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/dateUtils';

const TransactionItem = ({ transaction, onEdit, onDelete }) => {
  const { type, name, amount, recurring, date, balanceAfter } = transaction;

  return (
    <div className="view-tx-item">
      <div className={`tx-icon ${type}`}>
        {type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>

      <div className="tx-body">
        <div className="tx-primary-row">
          <h4 className="tx-name">{name}</h4>
          <span className={`tx-amount-display ${type}`}>
            {type === 'income' ? '+' : '-'}${formatCurrency(amount)}
          </span>
        </div>
        <div className="tx-secondary-row">
          <span className="tx-meta">
            {recurring === 'once' ? 'One-time' : recurring.charAt(0).toUpperCase() + recurring.slice(1)}
            {recurring !== 'once' && <><Repeat size={10} /> from {date}</>}
          </span>
          {typeof balanceAfter === 'number' && (
            <span className={`tx-balance-after ${balanceAfter >= 0 ? 'positive' : 'negative'}`}>
              Bal: ${formatCurrency(balanceAfter)}
            </span>
          )}
        </div>
      </div>

      <div className="tx-actions">
        <button className="edit-btn" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
          <Pencil size={14} />
        </button>
        <button className="delete-btn" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default TransactionItem;
