import { useState, useMemo, useEffect, useRef } from 'react';
import { calculateBalances, calculateFutureBalance, createEmptyTransaction } from '../utils/transactionUtils';
import { getDaysInMonth } from '../utils/dateUtils';

export const useTransactions = () => {
  const today = new Date();
  const [transactions, setTransactions] = useState([]);
  const [startingBalance, setStartingBalance] = useState(1000);
  const isElectron = typeof window !== 'undefined' && !!window.electronApi;
  const serializedToday = today.toISOString().split('T')[0];
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const latestStateRef = useRef({ transactions: [], startingBalance: 1000 });
  const pendingPayloadRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const STORAGE_KEY = 'budgetcal-data';
  const SAVE_DELAY = 5000;

  const buildPayload = (payloadOverride) => ({
    transactions: payloadOverride?.transactions ?? latestStateRef.current.transactions,
    startingBalance: payloadOverride?.startingBalance ?? latestStateRef.current.startingBalance
  });

  const persistPayload = async (payload) => {
    if (isElectron) {
      return window.electronApi.saveBudgetData(payload);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { success: true };
  };

  useEffect(() => {
    latestStateRef.current = { transactions, startingBalance };
  }, [transactions, startingBalance]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        let data = null;
        if (isElectron) {
          data = await window.electronApi.loadBudgetData();
        } else {
          const stored = localStorage.getItem(STORAGE_KEY);
          data = stored ? JSON.parse(stored) : null;
        }

        if (!isMounted || !data) {
          hasLoadedRef.current = true;
          return;
        }

        setTransactions(data.transactions ?? []);
        setStartingBalance(typeof data.startingBalance === 'number' ? data.startingBalance : 1000);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Unable to read saved budget data', error);
        hasLoadedRef.current = true;
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isElectron, serializedToday]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    const payload = buildPayload({ transactions, startingBalance });
    pendingPayloadRef.current = payload;
    setSaveStatus('pending');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await persistPayload(payload);
        setSaveStatus('saved');
        statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (error) {
        console.error('Unable to save budget data', error);
        setSaveStatus('error');
      }
    }, SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [transactions, startingBalance]);

  useEffect(() => {
    const flush = () => {
      if (!hasLoadedRef.current) return;
      const payload = pendingPayloadRef.current ?? buildPayload();
      try {
        if (isElectron) {
          window.electronApi.saveBudgetData(payload);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
      } catch (error) {
        console.error('Unable to flush budget data', error);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isElectron]);

  const addTransaction = (transaction) => {
    setTransactions(prev => [...prev, { 
      ...transaction, 
      id: Date.now(), 
      amount: parseFloat(transaction.amount) 
    }]);
  };

  const updateTransaction = (id, updatedTransaction) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === id 
        ? { ...updatedTransaction, id, amount: parseFloat(updatedTransaction.amount) }
        : tx
    ));
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return {
    transactions,
    startingBalance,
    setStartingBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveStatus
  };
};

export const useBalanceCalculations = (transactions, startingBalance, currentDate) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const balances = useMemo(() => 
    calculateBalances(transactions, startingBalance, todayStr, currentDate),
    [transactions, startingBalance, todayStr, currentDate]
  );

  const endOfMonthBalance = useMemo(() => {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysUntilEndOfMonth = Math.ceil((lastDay - today) / (1000 * 60 * 60 * 24));
    return calculateFutureBalance(transactions, startingBalance, todayStr, daysUntilEndOfMonth);
  }, [transactions, startingBalance, todayStr]);

  const balance30Days = useMemo(() => 
    calculateFutureBalance(transactions, startingBalance, todayStr, 30),
    [transactions, startingBalance, todayStr]
  );

  const balance60Days = useMemo(() => 
    calculateFutureBalance(transactions, startingBalance, todayStr, 60),
    [transactions, startingBalance, todayStr]
  );

  return {
    balances,
    endOfMonthBalance,
    balance30Days,
    balance60Days
  };
};

export const useModalState = () => {
  const today = new Date();
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isEditingFromView, setIsEditingFromView] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [isReturningToView, setIsReturningToView] = useState(false);
  const [newTransaction, setNewTransaction] = useState(createEmptyTransaction(today.toISOString().split('T')[0]));

  const closeAllModals = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setShowViewModal(false);
      setSelectedDate(null);
      setEditingTransaction(null);
      setIsEditingFromView(false);
      setIsClosing(false);
      setIsGoingBack(false);
      setIsReturningToView(false);
      setNewTransaction(createEmptyTransaction(today.toISOString().split('T')[0]));
    }, 200);
  };

  const returnToViewModal = () => {
    setIsGoingBack(true);
    setTimeout(() => {
      setShowModal(false);
      setEditingTransaction(null);
      setIsEditingFromView(false);
      setIsGoingBack(false);
      setIsReturningToView(true);
      setNewTransaction(createEmptyTransaction(selectedDate || today.toISOString().split('T')[0]));
      setShowViewModal(true);
      setTimeout(() => setIsReturningToView(false), 50);
    }, 200);
  };

  return {
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
  };
};
