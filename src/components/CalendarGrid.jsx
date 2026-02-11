import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DAYS } from '../utils/constants';
import { getDaysInMonth } from '../utils/dateUtils';
import CalendarDay from './CalendarDay';
import gsap from 'gsap';
import { Flip } from 'gsap/dist/Flip';

gsap.registerPlugin(Flip);

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

  // Centralized layout mode state
  const gridRef = useRef(null);
  const flipStateRef = useRef(null);
  const prevLayoutModeRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [layoutMode, setLayoutMode] = useState(() => {
    const height = window.innerHeight;
    const width = window.innerWidth;
    const isWide = width >= 1340;
    if (isWide && height <= 900) return 'ultrawide';
    if (height <= 980 || (isWide && height <= 980)) return 'compact';
    if (height <= 1120 || (isWide && height <= 1120)) return 'medium';
    return 'default';
  });

  // Single resize listener - throttled for live animations during resize
  useEffect(() => {
    let lastTime = 0;
    let rafId = null;

    const getTargetMode = (prev) => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      const isWide = width >= 1340;

      // 4-tier breakpoints with hysteresis (20px bands)
      const ultrawideThresh = prev === 'ultrawide' ? 920 : 900;
      const compactThresh = (prev === 'compact' || prev === 'ultrawide') ? 1000 : 980;
      const mediumThresh = (prev === 'medium' || prev === 'compact' || prev === 'ultrawide') ? 1140 : 1120;

      if (isWide && height <= ultrawideThresh) return 'ultrawide';
      if (height <= compactThresh || (isWide && height <= compactThresh)) return 'compact';
      if (height <= mediumThresh || (isWide && height <= mediumThresh)) return 'medium';
      return 'default';
    };

    const onResize = () => {
      const now = Date.now();

      // Throttle: only process every 50ms
      if (now - lastTime < 50) {
        // Schedule one final check after throttle period
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => onResize());
        return;
      }
      lastTime = now;

      setLayoutMode((prev) => {
        const newMode = getTargetMode(prev);

        // Only capture flip state if mode is actually changing
        if (newMode !== prev && gridRef.current) {
          const targets = gridRef.current.querySelectorAll('.day-inner');
          if (targets.length > 0) {
            flipStateRef.current = Flip.getState(targets);
          }
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

  // Single animation for the entire grid
  useLayoutEffect(() => {
    if (layoutMode !== prevLayoutModeRef.current && flipStateRef.current) {
      const prev = prevLayoutModeRef.current;
      const isSubtle = (prev === 'default' && layoutMode === 'medium') ||
                       (prev === 'medium' && layoutMode === 'default');
      setIsTransitioning(true);
      requestAnimationFrame(() => {
        Flip.from(flipStateRef.current, {
          duration: isSubtle ? 0.25 : 0.35,
          ease: isSubtle ? 'power2.out' : 'back.out(1.2)',
          scale: false,
          onComplete: () => setIsTransitioning(false),
        });
        flipStateRef.current = null;
      });
    }
    prevLayoutModeRef.current = layoutMode;
  }, [layoutMode]);

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
          layoutMode={layoutMode}
          isTransitioning={isTransitioning}
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
          layoutMode={layoutMode}
          isTransitioning={isTransitioning}
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
          layoutMode={layoutMode}
          isTransitioning={isTransitioning}
        />
      );
    }

    return days;
  };

  return (
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
              {renderDays()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
