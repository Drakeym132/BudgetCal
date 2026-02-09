# BudgetCal - Comprehensive Codebase Documentation

**Purpose**: This document provides complete context for new agent sessions to understand the codebase without starting from scratch.

---

## 1. PROJECT OVERVIEW

**BudgetCal** is a React + Electron personal budgeting calendar application that displays transactions and running balances on a monthly calendar grid.

### Tech Stack
- **Frontend**: React 18 + Vite
- **Desktop**: Electron
- **Animation**: Framer Motion (component animations) + GSAP Flip (layout transitions)
- **Styling**: CSS with Container Queries
- **Icons**: Lucide React

### Key Dependencies (package.json)
```json
{
  "framer-motion": "^12.29.2",
  "gsap": "^3.14.2",
  "lucide-react": "^0.563.0"
}
```

---

## 2. PROJECT STRUCTURE

```
BudgetCal/
├── src/
│   ├── main.jsx                 # React entry point with MotionConfig
│   ├── App.jsx                  # Root component (TitleBar + CheckingCalendar)
│   ├── components/
│   │   ├── CheckingCalendar.jsx # Main app orchestrator
│   │   ├── CalendarGrid.jsx     # 6x7 day grid with GSAP Flip animations
│   │   ├── CalendarDay.jsx      # Individual day cell with transaction pills
│   │   ├── ControlsPanel.jsx    # Balance metrics display
│   │   ├── ViewTransactionsModal.jsx
│   │   ├── AddEditTransactionModal.jsx
│   │   ├── UpdateBalanceModal.jsx
│   │   ├── TransactionItem.jsx
│   │   └── TitleBar.jsx         # Electron window controls
│   ├── hooks/
│   │   └── useTransactions.js   # State management (3 hooks)
│   ├── utils/
│   │   ├── dateUtils.js         # Date formatting functions
│   │   ├── transactionUtils.js  # Balance calculations
│   │   └── constants.js         # DAYS, MONTHS arrays
│   └── styles/
│       └── App.css              # All styles (~1800 lines)
├── electron/
│   ├── main.js                  # Electron main process
│   └── preload.cjs              # Electron preload script
└── package.json
```

---

## 3. COMPONENT HIERARCHY

```
App
├── TitleBar (Electron window controls)
└── CheckingCalendar (main orchestrator)
    ├── Header (navigation, actions)
    ├── ControlsPanel (4 metric cards + settings)
    ├── CalendarGrid (42 day cells)
    │   └── CalendarDay × 42
    │       ├── Day number
    │       ├── Transaction pills (motion.div)
    │       └── Balance display
    ├── ViewTransactionsModal
    ├── AddEditTransactionModal
    └── UpdateBalanceModal
```

---

## 4. CUSTOM HOOKS (src/hooks/useTransactions.js)

### useTransactions()
```javascript
// Returns:
{
  transactions: array,           // All transactions
  startingBalance: number,       // Initial balance
  setStartingBalance: fn,        // Update balance
  addTransaction: fn,            // Add new transaction
  updateTransaction: fn,         // Update by ID
  deleteTransaction: fn,         // Delete by ID
  saveStatus: string             // 'idle'|'pending'|'saving'|'saved'|'error'
}
```
- Auto-persists to localStorage (web) or Electron storage
- 5-second debounced saves

### useBalanceCalculations(transactions, startingBalance, currentDate)
```javascript
// Returns:
{
  balances: object,              // { 'YYYY-MM-DD': { balance, transactions } }
  endOfMonthBalance: number,
  balance30Days: number,
  balance60Days: number
}
```

### useModalState()
- Manages modal visibility and form state
- Handles modal transitions with animation flags

---

## 5. THREE LAYOUT MODES

The calendar has three responsive layout modes based on viewport dimensions:

### Detection Logic (CalendarGrid.jsx)
```javascript
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
```

### Mode Layouts

**DEFAULT** (tall screens):
```
┌─────────────────────────┐
│ Day#                    │
├─────────────────────────┤
│ Transaction Pill        │
│ Transaction Pill        │
│ Transaction Pill        │
├─────────────────────────┤
│                 Balance │
└─────────────────────────┘
```
- Vertical stacked pills (up to 4 visible)
- CSS: `grid-template-areas: "number . ." "content content content" ". . balance"`

**COMPACT** (short screens):
```
┌────────────────────────────┐
│ Day# │     │ Pill + Badge  │
├────────────────────────────┤
│      │     │       Balance │
└────────────────────────────┘
```
- 1 pill max, overflow badge
- CSS: `grid-template-areas: "number . content" ". . balance"`

**ULTRAWIDE** (wide + short):
```
┌──────────────────────────────────┐
│ Day# │ Pills (horizontal) │ Balance │
└──────────────────────────────────┘
```
- Single horizontal row
- CSS: `grid-template-areas: "number content balance"`

---

## 6. ANIMATION SYSTEM

### A. Framer Motion (component animations)

**Transaction Pills** (CalendarDay.jsx):
```javascript
const pillTransition = { type: "spring", stiffness: 450, damping: 32 };

<motion.div
  initial={{ opacity: 0, scale: 0.85 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.85 }}
  transition={pillTransition}
>
```

**Calendar Page Flip** (CalendarGrid.jsx):
```javascript
const calendarVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};
```

### B. GSAP Flip (layout mode transitions)

**CalendarGrid.jsx** - Centralized animation for all 42 day cells:
```javascript
import gsap from 'gsap';
import { Flip } from 'gsap/dist/Flip';

gsap.registerPlugin(Flip);

// On resize (throttled every 50ms):
const targets = gridRef.current.querySelectorAll('.day-inner');
flipStateRef.current = Flip.getState(targets);

// After mode change:
useLayoutEffect(() => {
  if (layoutMode !== prevLayoutModeRef.current && flipStateRef.current) {
    requestAnimationFrame(() => {
      Flip.from(flipStateRef.current, {
        duration: 0.35,
        ease: 'back.out(1.2)',
        scale: false,
      });
    });
  }
}, [layoutMode]);
```

---

## 7. CSS ARCHITECTURE (App.css)

### Container Queries
```css
.calendar-day {
  container-type: size;
  container-name: day-cell;
  contain: layout paint style;  /* Performance optimization */
}
```

### CQ Units Used
- `cqw` - container query width
- `cqh` - container query height
- Used extensively in `clamp()` functions for fluid sizing

### Key Performance CSS
```css
.calendar-day {
  contain: layout paint style;  /* Isolates repaints */
}

/* Removed will-change from nested elements - causes compositor layer bloat */
/* Removed transform: translateZ(0) and backface-visibility */
```

---

## 8. PERFORMANCE CONSIDERATIONS

### Problems Encountered
1. **42 independent resize listeners** - Each CalendarDay had its own → Centralized to CalendarGrid
2. **42 parallel GSAP animations** - Each cell animated independently → Single coordinated animation
3. **252+ compositor layers** - `will-change: transform` on 6 elements × 42 cells → Removed
4. **Container query overhead** - 60+ `cqh`/`cqw` calculations per cell during resize → Unavoidable, but optimized with `contain`

### Current Architecture
- **1 resize listener** in CalendarGrid (throttled at 50ms)
- **1 GSAP Flip animation** coordinating all 42 `.day-inner` elements
- **layoutMode prop** passed down to CalendarDay (no internal detection)
- **CSS `contain: layout paint style`** on each cell

---

## 9. KNOWN ISSUES / ONGOING WORK

### Animation Smoothness
The layout mode transitions are functional but could be smoother:
- Container queries cause expensive recalculations during resize
- GSAP Flip captures state before mode change, animates after
- Current config: 0.35s duration, `back.out(1.2)` easing
- Throttled at 50ms to balance responsiveness vs performance

### Potential Improvements
1. Consider replacing some `cqh`/`cqw` with viewport units for less expensive calculations
2. Add `content-visibility: auto` for off-screen optimization (if applicable)
3. Investigate CSS-only transitions as alternative to GSAP for simpler cases

---

## 10. DATA STRUCTURES

### Transaction Object
```javascript
{
  id: number,                    // Date.now() auto-generated
  type: 'income' | 'expense',
  name: string,
  amount: number,
  date: 'YYYY-MM-DD',
  recurring: 'once' | 'weekly' | 'biweekly' | 'monthly',
  endDate: 'YYYY-MM-DD' | ''
}
```

### Balance Entry
```javascript
{
  'YYYY-MM-DD': {
    balance: number | null,      // null if before tracking start
    transactions: Transaction[]
  }
}
```

---

## 11. KEY FILE PATHS

| Purpose | File |
|---------|------|
| Main component | `src/components/CheckingCalendar.jsx` |
| Calendar grid + animations | `src/components/CalendarGrid.jsx` |
| Day cell rendering | `src/components/CalendarDay.jsx` |
| State management | `src/hooks/useTransactions.js` |
| Balance calculations | `src/utils/transactionUtils.js` |
| All CSS styles | `src/styles/App.css` |

---

## 12. COMMANDS

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm run electron:dev # Dev with Electron
npm run electron:prod # Production Electron
```

---

## 13. SESSION CONTEXT (Changes Made)

This session focused on improving layout mode transition animations:

1. **Attempted Framer Motion `layout` prop** - Failed due to grid-template-areas changes
2. **Implemented GSAP Flip** - Works but had performance issues
3. **Centralized to CalendarGrid** - Reduced from 42 animations to 1
4. **Removed `will-change` declarations** - Eliminated 252+ compositor layers
5. **Added `contain: layout paint style`** - Improved repaint isolation
6. **Throttled resize handler** - 50ms minimum between checks
7. **Current state**: Animations work, minor choppiness during rapid resize due to container query overhead

---

## COPY-PASTE SUMMARY FOR NEW SESSIONS

```
BudgetCal is a React+Electron budgeting calendar app.

KEY ARCHITECTURE:
- CalendarGrid.jsx manages layout mode state and GSAP Flip animations
- CalendarDay.jsx receives layoutMode as prop, renders pills with Framer Motion
- Three modes: default (vertical), compact (top-right), ultrawide (horizontal)
- Container queries (cqh/cqw) used extensively for responsive sizing

ANIMATION STACK:
- Framer Motion: Pills enter/exit, modal transitions, page flip
- GSAP Flip: Layout mode transitions (centralized in CalendarGrid)

PERFORMANCE:
- Single resize listener (throttled 50ms) in CalendarGrid
- CSS contain: layout paint style on .calendar-day
- Removed will-change from nested elements

KNOWN ISSUE:
- Container query recalculations cause some lag during resize
- GSAP Flip animations are functional but could be smoother
```
