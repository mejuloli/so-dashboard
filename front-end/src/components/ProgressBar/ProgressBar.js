// so-dashboard/front-end/src/components/ProgressBar/ProgressBar.js
import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ value, max = 100, height = '10px', color, showValueText = false }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    let barColor = color;

    if (!barColor) {
        if (percentage > 85) {
            barColor = 'var(--chart-color-cpu-core6)';
        } else if (percentage > 60) {
            barColor = 'var(--chart-color-cpu-core5)';
        } else {
            barColor = 'var(--chart-color-cpu-core1)';
        }
    }

    return (
        <div className={styles.progressBarWrapper}>
            <div className={styles.progressBarContainer} style={{ height }}>
                <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }}
                />
            </div>
            {showValueText && (
                <span className={styles.progressBarValueText}>{(value || 0).toFixed(1)}%</span>
            )}
        </div>
    );
};

export default ProgressBar;