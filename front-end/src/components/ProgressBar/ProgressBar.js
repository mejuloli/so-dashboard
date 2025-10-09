// so-dashboard/front-end/src/components/ProgressBar/ProgressBar.js
import React from 'react';
import styles from './ProgressBar.module.css'; // estilos do componente

// componente de barra de progresso
// mostra visualmente um valor percentual ou relativo a um máximo
const ProgressBar = ({ value, max = 100, height = '10px', color, showValueText = false }) => {
    // calcula a porcentagem (clamp entre 0 e 100)
    const rawPercentage = max > 0 ? (value / max) * 100 : 0;
    const displayPercentage = Math.min(Math.max(rawPercentage, 0), 100);

    // define cor da barra (usa prop ou calcula dinamicamente)
    let barFillColor = color;
    if (!barFillColor) {
        if (displayPercentage > 85) barFillColor = 'var(--chart-color-cpu-core6)'; // uso alto
        else if (displayPercentage > 60) barFillColor = 'var(--chart-color-cpu-core5)'; // uso médio
        else barFillColor = 'var(--chart-color-cpu-core1)'; // uso normal
    }

    // render principal
    return (
        <div className={styles.progressBarWrapper}>
            {/* container da barra */}
            <div className={styles.progressBarContainer} style={{ height }}>
                {/* preenchimento proporcional ao valor */}
                <div
                    className={styles.progressBarFill}
                    style={{
                        width: `${displayPercentage}%`,
                        backgroundColor: barFillColor,
                    }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-label={`progresso: ${value} de ${max}`}
                />
            </div>

            {/* texto opcional com percentual */}
            {showValueText && (
                <span className={styles.progressBarValueText}>
                    {`${((value || 0) / max * 100).toFixed(1)}%`}
                </span>
            )}
        </div>
    );
};

export default ProgressBar;
