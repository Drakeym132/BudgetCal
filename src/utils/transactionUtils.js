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
  const endCalc = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startCalc = new Date(
    Math.min(balanceStartDate.getTime(), new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime())
  );
  
  let runningBalance = startingBalance;
  const dailyTransactions = {};

  transactions.forEach(tx => {
    const occurrences = getOccurrences(tx, startCalc, endCalc);
    occurrences.forEach(date => {
      const key = date.toISOString().split('T')[0];
      if (!dailyTransactions[key]) dailyTransactions[key] = [];
      dailyTransactions[key].push(tx);
    });
  });

  for (let d = new Date(startCalc); d <= endCalc; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    const dayTx = dailyTransactions[key] || [];
    // Compare date strings to avoid time component issues
    if (key >= balanceDate) {
      dayTx.forEach(tx => {
        if (tx.type === 'income') {
          runningBalance += parseFloat(tx.amount);
        } else {
          runningBalance -= parseFloat(tx.amount);
        }
      });
      balances[key] = { balance: runningBalance, transactions: dayTx };
    } else {
      balances[key] = { balance: null, transactions: dayTx };
    }
  }
  return balances;
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
