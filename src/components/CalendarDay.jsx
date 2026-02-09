import { useRef, useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/dateUtils';
import { LayoutTransitionContext } from '../contexts/LayoutTransitionContext';

const layoutTransition = {
  layout: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] },
};

const pillTransition = {
  layout: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] },
  type: "spring", stiffness: 450, damping: 32,
};

const CalendarDay = ({
  day,
  dateStr,
  dayData,
  isToday,
  isBeforeStart,
  isOtherMonth,
  onClick,
  onLayoutAnimationComplete,
}) => {
  const { layoutMode, isTransitioning } = useContext(LayoutTransitionContext);
  const [maxVisible, setMaxVisible] = useState(layoutMode !== 'default' ? 1 : 3);
  const cellRef = useRef(null);
  const lastHeightRef = useRef(null);
  const rafIdRef = useRef(null);

  const measureAndSetMaxVisible = useCallback((cell) => {
    const { height } = cell.getBoundingClientRect();
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
  }, []);

  // Update maxVisible when layoutMode changes
  useEffect(() => {
    if (layoutMode !== 'default') {
      setMaxVisible(1);
    }
  }, [layoutMode]);

  // ResizeObserver for pill counting (only in default mode, not during transitions)
  useEffect(() => {
    const cell = cellRef.current;
    if (!cell || !dayData?.transactions?.length || layoutMode !== 'default') return;

    const observer = new ResizeObserver((entries) => {
      if (isTransitioning) return;

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        measureAndSetMaxVisible(entries[0].target);
      });
    });

    observer.observe(cell);
    return () => {
      observer.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [dayData?.transactions?.length, layoutMode, isTransitioning, measureAndSetMaxVisible]);

  // Re-measure pills after transition completes
  useEffect(() => {
    if (!isTransitioning && layoutMode === 'default' && cellRef.current && dayData?.transactions?.length) {
      requestAnimationFrame(() => {
        measureAndSetMaxVisible(cellRef.current);
      });
    }
  }, [isTransitioning, layoutMode, measureAndSetMaxVisible, dayData?.transactions?.length]);

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

  return (
    <div
      ref={cellRef}
      className={`calendar-day ${isOtherMonth ? 'other-month' : 'clickable'} ${isToday ? 'today' : ''} ${isBeforeStart ? 'before-start' : ''} layout-${layoutMode}`}
      onClick={isOtherMonth ? undefined : () => onClick(dateStr)}
    >
      <motion.div
        className="day-inner"
        layout="position"
        layoutDependency={layoutMode}
        transition={layoutTransition}
        onLayoutAnimationComplete={onLayoutAnimationComplete}
      >
        <motion.span
          className="day-number"
          layout
          layoutDependency={layoutMode}
          transition={layoutTransition}
        >
          {day}
        </motion.span>

        {dayData && totalCount > 0 && (
          <motion.div
            className="day-transactions"
            layout
            layoutDependency={layoutMode}
            transition={layoutTransition}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {displayTransactions.map((tx, i) => (
                <motion.div
                  key={tx.id || `tx-${i}`}
                  className={`tx-pill ${tx.type}`}
                  layout
                  layoutDependency={layoutMode}
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
                  layout
                  layoutDependency={layoutMode}
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
          </motion.div>
        )}

        {dayData && typeof dayData.balance === 'number' && !isBeforeStart && (
          <motion.div
            className={`balance ${dayData.balance >= 0 ? 'positive' : 'negative'}`}
            layout
            layoutDependency={layoutMode}
            transition={layoutTransition}
          >
            ${formatCurrency(dayData.balance)}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CalendarDay;
