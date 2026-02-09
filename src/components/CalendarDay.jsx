import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/dateUtils';

const CalendarDay = ({
  day,
  dateStr,
  dayData,
  isToday,
  isBeforeStart,
  isOtherMonth,
  onClick,
  layoutMode
}) => {
  const [maxVisible, setMaxVisible] = useState(layoutMode !== 'default' ? 1 : 3);
  const cellRef = useRef(null);
  const lastHeightRef = useRef(null);
  const rafIdRef = useRef(null);

  // Update maxVisible when layoutMode changes
  useEffect(() => {
    if (layoutMode !== 'default') {
      setMaxVisible(1);
    }
  }, [layoutMode]);

  // ResizeObserver for pill counting (only in default mode)
  useEffect(() => {
    const cell = cellRef.current;
    if (!cell || !dayData?.transactions?.length) return;

    const observer = new ResizeObserver((entries) => {
      // Skip pill counting in compact/ultrawide modes
      if (layoutMode !== 'default') return;

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const { height } = entries[0].contentRect;
        if (lastHeightRef.current === height) return;
        lastHeightRef.current = height;

        const samplePill = cell.querySelector('.tx-pill');
        const computedPillHeight = samplePill?.offsetHeight || 28;
        const computedStyles = getComputedStyle(cell);
        const gap = parseFloat(computedStyles.gap) || 6;
        const headerHeight = cell.querySelector('.day-number')?.offsetHeight || 28;
        const balanceHeight = cell.querySelector('.balance')?.offsetHeight || 28;

        const available = Math.max(0, height - headerHeight - balanceHeight - gap * 2);
        const possible = Math.floor((available + gap) / (computedPillHeight + gap));
        setMaxVisible(Math.max(1, Math.min(4, possible || 2)));
      });
    });

    observer.observe(cell);
    return () => {
      observer.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [dayData?.transactions?.length, layoutMode]);

  const effectiveMaxVisible = layoutMode !== 'default' ? 1 : maxVisible;
  const allTransactions = dayData?.transactions || [];
  const totalCount = allTransactions.length;
  const hasOverflow = totalCount > effectiveMaxVisible;
  const displayCount = hasOverflow ? Math.max(0, effectiveMaxVisible - 1) : Math.min(totalCount, effectiveMaxVisible);
  const overflowCount = totalCount - displayCount;
  const lastVisibleTx = hasOverflow && effectiveMaxVisible > 0 ? allTransactions[displayCount] : null;

  const displayTransactions = useMemo(() =>
    allTransactions.slice(0, displayCount),
    [allTransactions, displayCount]
  );

  const pillTransition = { type: "spring", stiffness: 450, damping: 32 };

  return (
    <div
      ref={cellRef}
      className={`calendar-day ${isOtherMonth ? 'other-month' : 'clickable'} ${isToday ? 'today' : ''} ${isBeforeStart ? 'before-start' : ''} layout-${layoutMode}`}
      onClick={isOtherMonth ? undefined : () => onClick(dateStr)}
    >
      <div className="day-inner">
        <span className="day-number">{day}</span>

        {dayData && totalCount > 0 && (
          <div className="day-transactions">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayTransactions.map((tx, i) => (
                <motion.div
                  key={tx.id || `tx-${i}`}
                  className={`tx-pill ${tx.type}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
                  transition={pillTransition}
                >
                  <span className="tx-pill-text">{tx.name}</span>
                </motion.div>
              ))}
              {lastVisibleTx && (
                <motion.div
                  key="overflow-pill"
                  className={`tx-pill tx-pill-with-badge ${lastVisibleTx.type}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
                  transition={pillTransition}
                >
                  <span className="tx-pill-text">{lastVisibleTx.name}</span>
                  <motion.span
                    className="tx-overflow-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  >
                    +{overflowCount}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {dayData && typeof dayData.balance === 'number' && !isBeforeStart && (
          <div className={`balance ${dayData.balance >= 0 ? 'positive' : 'negative'}`}>
            ${formatCurrency(dayData.balance)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarDay;
