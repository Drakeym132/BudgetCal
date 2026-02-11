import { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/dateUtils';

// Stable animation variants — defined outside component to avoid recreation
const instantVariants = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.06 } }
};

const animatedVariants = {
  initial: { opacity: 0, y: 8 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
      delay: i * 0.03,
    }
  }),
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      type: "tween",
      duration: 0.15,
      ease: [0.25, 0, 0.67, 0]
    }
  }
};

const instantBadgeInitial = { scale: 1, opacity: 1 };
const animatedBadgeInitial = { scale: 0.8, opacity: 0 };
const badgeAnimate = { scale: 1, opacity: 1 };
const instantBadgeTransition = { duration: 0 };
const animatedBadgeTransition = { type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.06 };

// Helper to check if grid is in layout transition (reads CSS class, no React state)
const isGridTransitioning = (cellEl) => {
  if (!cellEl) return false;
  const grid = cellEl.closest('.calendar-body');
  return grid ? grid.classList.contains('is-layout-transitioning') : false;
};

const getFixedMaxVisible = (mode) => {
  if (mode === 'medium') return 2;
  if (mode === 'compact' || mode === 'ultrawide') return 1;
  return null; // default: dynamic via ResizeObserver
};

const CalendarDay = memo(({
  day,
  dateStr,
  dayData,
  isToday,
  isBeforeStart,
  isOtherMonth,
  onClick,
  layoutMode,
}) => {
  const [maxVisible, setMaxVisible] = useState(() => {
    const fixed = getFixedMaxVisible(layoutMode);
    return fixed !== null ? fixed : 3;
  });
  const cellRef = useRef(null);
  const rafIdRef = useRef(null);

  // Reusable pill count calculation from cell dimensions
  const recalcPills = useCallback((cell) => {
    if (!cell) return;
    const inner = cell.querySelector('.day-inner');
    if (!inner) return;
    const height = inner.getBoundingClientRect().height;
    const samplePill = inner.querySelector('.tx-pill');
    const computedPillHeight = samplePill?.offsetHeight || 28;
    const innerStyles = getComputedStyle(inner);
    const gap = parseFloat(innerStyles.rowGap) || parseFloat(innerStyles.gap) || 6;
    const padding = parseFloat(innerStyles.paddingTop) + parseFloat(innerStyles.paddingBottom) || 0;
    const headerHeight = inner.querySelector('.day-number')?.offsetHeight || 28;
    const balanceHeight = inner.querySelector('.balance')?.offsetHeight || 28;

    const available = Math.max(0, height - padding - headerHeight - balanceHeight - gap * 2);
    const possible = Math.floor((available + gap) / (computedPillHeight + gap));
    setMaxVisible(Math.max(1, Math.min(4, possible || 2)));
  }, []);

  // Update maxVisible when layoutMode changes
  useEffect(() => {
    const fixed = getFixedMaxVisible(layoutMode);
    if (fixed !== null) {
      setMaxVisible(fixed);
    } else {
      // Returning to default mode — actively recalculate after layout settles
      requestAnimationFrame(() => recalcPills(cellRef.current));
    }
  }, [layoutMode, recalcPills]);

  // ResizeObserver for pill counting (only in default mode)
  useEffect(() => {
    const cell = cellRef.current;
    if (!cell || !dayData?.transactions?.length || layoutMode !== 'default') return;

    const observer = new ResizeObserver(() => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => recalcPills(cell));
    });

    observer.observe(cell);
    return () => {
      observer.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [dayData?.transactions?.length, layoutMode, recalcPills]);

  const effectiveMaxVisible = layoutMode === 'default' ? maxVisible :
                              layoutMode === 'medium' ? 2 : 1;
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

  // Read transitioning state from CSS class on parent grid (no React re-render needed)
  const transitioning = isGridTransitioning(cellRef.current);
  const pillVariants = transitioning ? instantVariants : animatedVariants;

  // Stable click handler
  const handleClick = useCallback(() => {
    if (!isOtherMonth && onClick) onClick(dateStr);
  }, [isOtherMonth, onClick, dateStr]);

  return (
    <div
      ref={cellRef}
      className={`calendar-day ${isOtherMonth ? 'other-month' : 'clickable'} ${isToday ? 'today' : ''} ${isBeforeStart ? 'before-start' : ''} layout-${layoutMode}`}
      onClick={isOtherMonth ? undefined : handleClick}
    >
      <div className="day-inner">
        <span className="day-number">{day}</span>

        {dayData && totalCount > 0 && (
          <div className="day-transactions">
            <AnimatePresence initial={false}>
              {displayTransactions.map((tx, i) => (
                <motion.div
                  key={tx.id || `tx-${i}`}
                  className={`tx-pill ${tx.type}`}
                  custom={i}
                  variants={pillVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <span className="tx-pill-text">{tx.name}</span>
                </motion.div>
              ))}
              {lastVisibleTx && (
                <motion.div
                  key="overflow-pill"
                  className={`tx-pill tx-pill-with-badge ${lastVisibleTx.type}`}
                  custom={displayCount}
                  variants={pillVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <span className="tx-pill-text">{lastVisibleTx.name}</span>
                  <motion.span
                    className="tx-overflow-badge"
                    initial={transitioning ? instantBadgeInitial : animatedBadgeInitial}
                    animate={badgeAnimate}
                    transition={transitioning ? instantBadgeTransition : animatedBadgeTransition}
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
});

CalendarDay.displayName = 'CalendarDay';

export default CalendarDay;
