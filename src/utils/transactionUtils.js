export const getOccurrences = (transaction, startDate, endDate) => {
  const occurrences = [];
  const txDate = new Date(transaction.date + 'T12:00:00');
  const txEndDate = transaction.endDate
    ? new Date(transaction.endDate + 'T12:00:00')
    : new Date(2099, 11, 31);

  if (transaction.recurring === 'once') {
    if (txDate >= startDate && txDate <= endDate) {
      occurrences.push(new Date(txDate));
    }
  } else {
    let current = new Date(txDate);
    while (current <= endDate && current <= txEndDate) {
      if (current >= startDate) {
        occurrences.push(new Date(current));
      }
      if (transaction.recurring === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (transaction.recurring === 'biweekly') {
        current.setDate(current.getDate() + 14);
      } else if (transaction.recurring === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      }
    }
  }
  return occurrences;
};

export const calculateBalances = (transactions, startingBalance, balanceDate, currentDate) => {
  const balances = {};
  const balanceStartDate = new Date(balanceDate + 'T12:00:00');
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Collect all occurrences within a broad range covering both past and future
  const rangeStart = new Date(Math.min(monthStart.getTime(), balanceStartDate.getTime()));
  const rangeEnd = monthEnd;

  const dailyTransactions = {};
  transactions.forEach(tx => {
    const occurrences = getOccurrences(tx, rangeStart, rangeEnd);
    occurrences.forEach(date => {
      const key = date.toISOString().split('T')[0];
      if (!dailyTransactions[key]) dailyTransactions[key] = [];
      dailyTransactions[key].push(tx);
    });
  });

  // --- Forward pass: from balanceDate to end of month ---
  let runningForward = startingBalance;
  for (let d = new Date(balanceStartDate); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const dayTx = dailyTransactions[key] || [];
    dayTx.forEach(tx => {
      runningForward += tx.type === 'income' ? parseFloat(tx.amount) : -parseFloat(tx.amount);
    });
    balances[key] = { balance: runningForward, transactions: dayTx };
  }

  // --- Backward pass: reconstruct past days within the month ---
  // Start from startingBalance = balance at start of balanceDate (= EOD of day before balanceDate).
  // Walk backward: for each day, its EOD balance = current runningBackward,
  // then we undo its transactions to get the balance for the prior day.
  let runningBackward = startingBalance;
  const dayBeforeBalance = new Date(balanceStartDate);
  dayBeforeBalance.setDate(dayBeforeBalance.getDate() - 1);

  for (let d = new Date(dayBeforeBalance); d >= monthStart; d.setDate(d.getDate() - 1)) {
    const key = d.toISOString().split('T')[0];
    const dayTx = dailyTransactions[key] || [];
    // The balance at EOD of this day = runningBackward (before undoing this day's tx)
    balances[key] = { balance: runningBackward, transactions: dayTx };
    // Undo this day's transactions to reconstruct the balance at EOD of the prior day
    dayTx.forEach(tx => {
      runningBackward -= tx.type === 'income' ? parseFloat(tx.amount) : -parseFloat(tx.amount);
    });
  }

  // --- Fill any remaining month days that have no entry (empty days between passes) ---
  let lastKnown = startingBalance;
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    if (balances[key]) {
      if (balances[key].balance !== null) lastKnown = balances[key].balance;
    } else {
      balances[key] = { balance: lastKnown, transactions: [] };
    }
  }

  return balances;
};

/**
 * Returns transactions for a given day with a `balanceAfter` field appended to each,
 * representing the account balance immediately after that transaction is applied.
 */
export const getRunningBalancesForDay = (transactions, startingBalance, balanceDate, dateStr, allTransactions) => {
  // Calculate balance at the END of the previous day
  const balanceStartDate = new Date(balanceDate + 'T12:00:00');
  const targetDate = new Date(dateStr + 'T12:00:00');
  const dayBefore = new Date(targetDate);
  dayBefore.setDate(dayBefore.getDate() - 1);

  let balanceBeforeDay = startingBalance;
  if (dateStr > balanceDate) {
    for (let d = new Date(balanceStartDate); d < targetDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      const dayTx = getOccurrences_local(allTransactions, d);
      dayTx.forEach(tx => {
        balanceBeforeDay += tx.type === 'income'
          ? parseFloat(tx.amount)
          : -parseFloat(tx.amount);
      });
    }
  }

  // Now walk through today's transactions in order
  let running = balanceBeforeDay;
  return transactions.map(tx => {
    running += tx.type === 'income' ? parseFloat(tx.amount) : -parseFloat(tx.amount);
    return { ...tx, balanceAfter: running };
  });
};

// Internal helper used by getRunningBalancesForDay
const getOccurrences_local = (transactions, dateObj) => {
  const result = [];
  transactions.forEach(tx => {
    const occ = getOccurrences(tx, dateObj, dateObj);
    if (occ.length > 0) result.push(tx);
  });
  return result;
};

export const calculateFutureBalance = (transactions, startingBalance, balanceDate, daysOut) => {
  const today = new Date();
  const balanceStartDate = new Date(balanceDate + 'T12:00:00');
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysOut);

  let runningBalance = startingBalance;
  const dailyTransactions = {};

  transactions.forEach(tx => {
    const occurrences = getOccurrences(tx, balanceStartDate, targetDate);
    occurrences.forEach(date => {
      const key = date.toISOString().split('T')[0];
      if (!dailyTransactions[key]) dailyTransactions[key] = [];
      dailyTransactions[key].push(tx);
    });
  });

  for (let d = new Date(balanceStartDate); d <= targetDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const dayTx = dailyTransactions[key] || [];
    dayTx.forEach(tx => {
      if (tx.type === 'income') {
        runningBalance += parseFloat(tx.amount);
      } else {
        runningBalance -= parseFloat(tx.amount);
      }
    });
  }
  return runningBalance;
};

export const getTransactionsForDate = (transactions, dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  const result = [];
  transactions.forEach(tx => {
    const occurrences = getOccurrences(tx, date, date);
    if (occurrences.length > 0) {
      result.push(tx);
    }
  });
  return result;
};

export const createEmptyTransaction = (date) => ({
  type: 'expense',
  name: '',
  amount: '',
  date: date,
  recurring: 'once',
  endDate: ''
});
