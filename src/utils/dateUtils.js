export const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  return { daysInMonth, startingDay, year, month };
};

export const formatDateKey = (date) => {
  return date.toISOString().split('T')[0];
};

export const createDateFromString = (dateStr) => {
  return new Date(dateStr + 'T12:00:00');
};

export const formatDisplayDate = (dateStr, options = { month: 'long', day: 'numeric', year: 'numeric' }) => {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', options);
};

export const formatCurrency = (amount) => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
