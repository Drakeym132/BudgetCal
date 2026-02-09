import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Calendar, RefreshCw } from 'lucide-react';
import { useTransactions, useBalanceCalculations, useModalState } from '../hooks/useTransactions';
import { getDaysInMonth, formatCurrency } from '../utils/dateUtils';
import { MONTHS } from '../utils/constants';
import { getTransactionsForDate, createEmptyTransaction } from '../utils/transactionUtils';
import ControlsPanel from './ControlsPanel';
import CalendarGrid from './CalendarGrid';
import ViewTransactionsModal from './ViewTransactionsModal';
import AddEditTransactionModal from './AddEditTransactionModal';
import UpdateBalanceModal from './UpdateBalanceModal';
import '../styles/App.css';

const CheckingCalendar = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [isBalanceModalClosing, setIsBalanceModalClosing] = useState(false);
  const [metricShadowBlur, setMetricShadowBlur] = useState(() => {
    const saved = window.localStorage.getItem('metricShadowBlur');
    const parsed = saved ? Number(saved) : 18;
    return Number.isFinite(parsed) ? parsed : 18;
  });
  
  const {
    transactions,
    startingBalance,
    setStartingBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveStatus
  } = useTransactions();

  const {
    showModal,
    setShowModal,
    showViewModal,
    setShowViewModal,
    selectedDate,
    setSelectedDate,
    editingTransaction,
    setEditingTransaction,
    isEditingFromView,
    setIsEditingFromView,
    isClosing,
    isGoingBack,
    isReturningToView,
    newTransaction,
    setNewTransaction,
    closeAllModals,
    returnToViewModal
  } = useModalState();

  const {
    balances,
    endOfMonthBalance,
    balance30Days,
    balance60Days
  } = useBalanceCalculations(transactions, startingBalance, currentDate);

  const { year, month } = getDaysInMonth(currentDate);

  // Modal handlers
  const openModalForDate = (dateStr) => {
    const dayTransactions = getTransactionsForDate(transactions, dateStr);
    setSelectedDate(dateStr);
    
    if (dayTransactions.length > 0) {
      setShowViewModal(true);
    } else {
      setNewTransaction(createEmptyTransaction(dateStr));
      setShowModal(true);
    }
  };

  const openModal = () => {
    setSelectedDate(null);
    setEditingTransaction(null);
    setNewTransaction(createEmptyTransaction(today.toISOString().split('T')[0]));
    setShowModal(true);
  };

  const openAddFromView = () => {
    setShowViewModal(false);
    setIsEditingFromView(true);
    setNewTransaction(createEmptyTransaction(selectedDate));
    setShowModal(true);
  };

  const startEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setNewTransaction({
      type: tx.type,
      name: tx.name,
      amount: tx.amount.toString(),
      date: tx.date,
      recurring: tx.recurring,
      endDate: tx.endDate || ''
    });
    setIsEditingFromView(true);
    setShowViewModal(false);
    setShowModal(true);
  };

  const handleAddTransaction = () => {
    if (newTransaction.name && newTransaction.amount) {
      if (editingTransaction) {
        updateTransaction(editingTransaction.id, newTransaction);
        setEditingTransaction(null);
      } else {
        addTransaction(newTransaction);
      }
      
      if (isEditingFromView) {
        returnToViewModal();
        return;
      }
      
      setNewTransaction(createEmptyTransaction(today.toISOString().split('T')[0]));
      setSelectedDate(null);
      setShowModal(false);
      setIsEditingFromView(false);
    }
  };

  const goToToday = () => {
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonth = currentDate.getTime();
    const targetMonth = todayMonth.getTime();
    
    if (targetMonth > currentMonth) {
      setDirection(1);
    } else if (targetMonth < currentMonth) {
      setDirection(-1);
    }
    setCurrentDate(todayMonth);
  };

  const goToPrevMonth = () => {
    setDirection(-1);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const openBalanceModal = () => {
    setShowBalanceModal(true);
  };

  const closeBalanceModal = () => {
    setIsBalanceModalClosing(true);
    setTimeout(() => {
      setShowBalanceModal(false);
      setIsBalanceModalClosing(false);
    }, 200);
  };

  const handleSaveBalance = (newBalance) => {
    setStartingBalance(newBalance);
    closeBalanceModal();
  };

  const currentDateTransactions = selectedDate 
    ? getTransactionsForDate(transactions, selectedDate) 
    : [];

  useEffect(() => {
    window.localStorage.setItem('metricShadowBlur', String(metricShadowBlur));
  }, [metricShadowBlur]);

  return (
    <div className="app-container" style={{ '--metric-shadow-blur': `${metricShadowBlur}px` }}>
      <div className="header-card-modern">
        <div className="header-top">
            <div className="header-title-row">
              <div className="header-title-section">
                <h1 className="header-title">{MONTHS[month]} {year}</h1>
                <div className="title-accent-row">
                  <div className={`title-dash${saveStatus === 'pending' || saveStatus === 'saving' ? ' is-saving' : ''}`}></div>
                  <div className="save-indicator-modern" aria-live="polite">
                    {saveStatus === 'pending' || saveStatus === 'saving' ? 'Saving...' : ''}
                    {saveStatus === 'saved' ? 'Saved' : ''}
                    {saveStatus === 'error' ? 'Save failed' : ''}
                  </div>
                </div>
              </div>
            
            <div className="header-actions-row">
              <div className="nav-buttons">
                <button className="nav-btn-modern" onClick={goToPrevMonth} aria-label="Previous month">
                  <ChevronLeft size={20} />
                </button>
                <button className="nav-btn-modern" onClick={goToNextMonth} aria-label="Next month">
                  <ChevronRight size={20} />
                </button>
              </div>
              <button className="action-btn action-btn--tertiary" onClick={goToToday}>
                <Calendar size={18} /> <span>Today</span>
              </button>
              <button className="action-btn action-btn--secondary" onClick={openBalanceModal}>
                <RefreshCw size={18} /> <span>Update Balance</span>
              </button>
              <button className="action-btn action-btn--primary" onClick={openModal}>
                <Plus size={18} /> <span>Add Transaction</span>
              </button>
            </div>
          </div>
          
          <ControlsPanel
            currentBalance={startingBalance}
            onUpdateBalance={openBalanceModal}
            onAddTransaction={openModal}
            onTodayClick={goToToday}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            endOfMonthBalance={endOfMonthBalance}
            balance30Days={balance30Days}
            balance60Days={balance60Days}
            formatCurrency={formatCurrency}
            metricShadowBlur={metricShadowBlur}
            onMetricShadowBlurChange={setMetricShadowBlur}
          />
        </div>
      </div>

      <div className="main-content">
        <CalendarGrid
          currentDate={currentDate}
          balances={balances}
          onDayClick={openModalForDate}
          direction={direction}
        />
      </div>
      
      <AnimatePresence>
        {showViewModal && selectedDate && (
          <ViewTransactionsModal
            selectedDate={selectedDate}
            transactions={currentDateTransactions}
            isClosing={isClosing}
            isReturningToView={isReturningToView}
            onClose={closeAllModals}
            onEdit={startEditTransaction}
            onDelete={deleteTransaction}
            onAddNew={openAddFromView}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showModal && (
          <AddEditTransactionModal
            selectedDate={selectedDate}
            editingTransaction={editingTransaction}
            isEditingFromView={isEditingFromView}
            isClosing={isClosing}
            isGoingBack={isGoingBack}
            newTransaction={newTransaction}
            setNewTransaction={setNewTransaction}
            onClose={closeAllModals}
            onBack={returnToViewModal}
            onSubmit={handleAddTransaction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBalanceModal && (
          <UpdateBalanceModal
            isOpen={showBalanceModal}
            currentBalance={startingBalance}
            onClose={closeBalanceModal}
            onSave={handleSaveBalance}
            isClosing={isBalanceModalClosing}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckingCalendar;
