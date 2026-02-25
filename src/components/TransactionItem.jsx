import React from 'react';
import { TrendingUp, TrendingDown, Repeat, Pencil } from 'lucide-react';
import { formatCurrency } from '../utils/dateUtils';

const TransactionItem = ({ transaction, isEditMode, isSelected, onToggleSelect, onEdit }) => {
  const { type, name, amount, recurring, date, balanceAfter } = transaction;

  return (
    <div
      className={`view-tx-item${isEditMode ? ' edit-mode' : ' clickable'}${isSelected ? ' selected' : ''}`}
      onClick={isEditMode ? () => onToggleSelect(transaction.id) : () => onEdit(transaction)}
    >
      {isEditMode && (
        <input
          type="checkbox"
          className="tx-checkbox"
          checked={!!isSelected}
          onChange={() => onToggleSelect(transaction.id)}
          onClick={e => e.stopPropagation()}
          aria-label={`Select ${name}`}
        />
      )}

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
            {recurring !== 'once' && <Repeat size={10} />}
            {recurring === 'once' ? 'One-time' : recurring.charAt(0).toUpperCase() + recurring.slice(1)}
          </span>
          {typeof balanceAfter === 'number' && (
            <span className={`tx-balance-after ${balanceAfter >= 0 ? 'positive' : 'negative'}`}>
              Bal: ${formatCurrency(balanceAfter)}
            </span>
          )}
        </div>
      </div>

      {isEditMode && (
        <button
          className="tx-edit-btn"
          onClick={e => { e.stopPropagation(); onEdit(transaction); }}
          aria-label={`Edit ${name}`}
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
};

export default TransactionItem;
