import React from 'react';
import { motion } from 'framer-motion';

const barVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
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
}) => {
  const metrics = [
    {
      label: 'Current',
      value: currentBalance,
      colorClass: 'metric-item--current'
    },
    {
      label: 'End of Month',
      value: endOfMonthBalance,
      colorClass: 'metric-item--eom'
    },
    {
      label: '30 Days',
      value: balance30Days,
      colorClass: 'metric-item--30days'
    },
    {
      label: '60 Days',
      value: balance60Days,
      colorClass: 'metric-item--60days'
    }
  ];

  return (
    <div className="controls-panel-modern">
      <motion.div
        className="metrics-bar"
        initial="hidden"
        animate="visible"
        variants={barVariants}
      >
        {metrics.map((metric, index) => (
          <React.Fragment key={metric.label}>
            {index > 0 && <div className="metrics-bar__divider" />}
            <div className={`metric-item ${metric.colorClass}`}>
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value">
                ${formatCurrency(metric.value)}
              </span>
            </div>
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

export default ControlsPanel;
