import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { DAYS } from '../utils/constants';
import { getDaysInMonth } from '../utils/dateUtils';
import CalendarDay from './CalendarDay';
import { LayoutTransitionContext } from '../contexts/LayoutTransitionContext';

// Animation variants for page-flip effect
const calendarVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const CalendarGrid = ({ currentDate, balances, onDayClick, direction }) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

  // Create a unique key for the current month
  const monthKey = `${year}-${month}`;

  const gridRef = React.useRef(null);

  const [layoutMode, setLayoutMode] = useState(() => {
    const height = window.innerHeight;
    const width = window.innerWidth;
    const shouldCompact = height <= 980 || (width >= 1340 && height <= 1120);
    if (width > 1340 && shouldCompact) return 'ultrawide';
    if (shouldCompact) return 'compact';
    return 'default';
  });

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Single resize listener - throttled for live animations during resize
  useEffect(() => {
    let lastTime = 0;
    let rafId = null;

    const getTargetMode = (prev) => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      const isWide = width >= 1340;
      const compactOn = height <= 1120;
      const compactOff = height >= 1140;
      const shouldCompact = height <= 980 || (isWide && (prev === 'default' ? compactOn : !compactOff));

      if (width > 1340 && shouldCompact) return 'ultrawide';
      if (shouldCompact) return 'compact';
      return 'default';
    };

    const onResize = () => {
      const now = Date.now();

      // Throttle: only process every 50ms
      if (now - lastTime < 50) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => onResize());
        return;
      }
      lastTime = now;

      setLayoutMode((prev) => {
        const newMode = getTargetMode(prev);
        if (newMode !== prev) {
          setIsTransitioning(true);
        }
        return newMode;
      });
    };

    window.addEventListener('resize', onResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleLayoutAnimationComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const ctxValue = useMemo(() => ({
    layoutMode,
    isTransitioning,
  }), [layoutMode, isTransitioning]);

  const renderDays = () => {
    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push(
        <CalendarDay
          key={`prev-${i}`}
          day={day}
          isOtherMonth={true}
        />
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = balances[dateStr];
      const isToday = dateStr === todayStr;
      const isBeforeStart = dateStr < todayStr;

      days.push(
        <CalendarDay
          key={day}
          day={day}
          dateStr={dateStr}
          dayData={dayData}
          isToday={isToday}
          isBeforeStart={isBeforeStart}
          isOtherMonth={false}
          onClick={onDayClick}
          onLayoutAnimationComplete={day === 1 ? handleLayoutAnimationComplete : undefined}
        />
      );
    }

    // Next month days
    const totalCells = days.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <CalendarDay
          key={`next-${i}`}
          day={i}
          isOtherMonth={true}
        />
      );
    }

    return days;
  };

  return (
    <LayoutTransitionContext.Provider value={ctxValue}>
      <div className="calendar-container">
        <div className="calendar-scroll">
          <div className="calendar-headers">
            {DAYS.map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          <div className="calendar-body" ref={gridRef}>
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={monthKey}
                custom={direction}
                variants={calendarVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'tween', duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
                  opacity: { duration: 0.25, ease: 'easeOut' },
                }}
                className="calendar-grid-days"
              >
                <LayoutGroup>
                  {renderDays()}
                </LayoutGroup>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </LayoutTransitionContext.Provider>
  );
};

export default CalendarGrid;
