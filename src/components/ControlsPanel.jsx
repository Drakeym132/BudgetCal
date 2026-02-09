import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Calendar, RefreshCw } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  })
};

const ControlsPanel = ({ 
  currentBalance,
  onUpdateBalance,
  onAddTransaction,
  onTodayClick,
  onPrevMonth,
  onNextMonth,
  endOfMonthBalance,
  balance30Days,
  balance60Days,
  formatCurrency,
  metricShadowBlur,
  onMetricShadowBlurChange
}) => {
  // Calculate change percentages
  const getChangeIndicator = (value, baseValue) => {
    if (baseValue === 0) return { value: 0, type: 'neutral' };
    const change = ((value - baseValue) / Math.abs(baseValue)) * 100;
    if (Math.abs(change) < 0.1) return { value: 0, type: 'neutral' };
    return {
      value: change.toFixed(1),
      type: change >= 0 ? 'positive' : 'negative'
    };
  };

  const endOfMonthChange = getChangeIndicator(endOfMonthBalance, currentBalance);
  const thirtyDayChange = getChangeIndicator(balance30Days, currentBalance);
  const sixtyDayChange = getChangeIndicator(balance60Days, currentBalance);

  // Calculate difference from current
  const getDifferenceIndicator = (value, baseValue) => {
    const diff = value - baseValue;
    if (Math.abs(diff) < 0.01) return { value: '$0', type: 'neutral' };
    const sign = diff >= 0 ? '+' : '';
    return {
      value: `${sign}$${formatCurrency(Math.abs(diff))}`,
      type: diff >= 0 ? 'positive' : 'negative'
    };
  };

  const endOfMonthDiff = getDifferenceIndicator(endOfMonthBalance, currentBalance);

  const metrics = [
    {
      label: 'Current',
      value: currentBalance,
      cardClass: 'metric-card--current'
    },
    {
      label: 'End of Month',
      value: endOfMonthBalance,
      cardClass: 'metric-card--eom'
    },
    {
      label: '30 Days',
      value: balance30Days,
      cardClass: 'metric-card--30days'
    },
    {
      label: '60 Days',
      value: balance60Days,
      cardClass: 'metric-card--60days'
    }
  ];

  return (
    <div className="controls-panel-modern">
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            className={`metric-card ${metric.cardClass}`}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <span className="metric-label">{metric.label}</span>
            <span className="metric-value">
              ${formatCurrency(metric.value)}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="visual-settings">
        <span className="visual-settings__label">Tile glow</span>
        <input
          className="visual-settings__range"
          type="range"
          min="10"
          max="28"
          step="1"
          value={metricShadowBlur}
          onChange={(event) => onMetricShadowBlurChange(Number(event.target.value))}
          aria-label="Adjust tile glow intensity"
        />
      </div>
    </div>
  );
};

export default ControlsPanel;
