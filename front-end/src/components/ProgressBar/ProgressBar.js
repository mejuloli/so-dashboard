// so-dashboard/front-end/src/components/ProgressBar/ProgressBar.js
import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ value, max = 100, height = '10px', color, showValueText = false }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    let barColor = color; // Usa a cor passada por prop, se houver

    if (!barColor) { // Define cores dinâmicas padrão APENAS se nenhuma cor for passada
        if (percentage > 85) {
            // Usar as variáveis CSS definidas em index.css para consistência
            barColor = 'var(--chart-color-cpu-core6)'; // Ex: Vermelho
        } else if (percentage > 60) {
            barColor = 'var(--chart-color-cpu-core5)'; // Ex: Laranja
        } else {
            barColor = 'var(--chart-color-cpu-core1)'; // Ex: Amarelo-esverdeado
        }
    }

    return (
        <div className={styles.progressBarWrapper}>
            <div className={styles.progressBarContainer} style={{ height }}>
                <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }} // Garante que não passe de 100%
                />
            </div>
            {showValueText && (
                <span className={styles.progressBarValueText}>{value.toFixed(1)}%</span>
            )}
        </div>
    );
};

export default ProgressBar;