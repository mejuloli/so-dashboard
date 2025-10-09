import React from 'react';
import styles from './Card.module.css'; // importa estilos do card

// componente de card reutilizável
// exibe conteúdo em blocos com título, ícone e corpo
const Card = ({ title, children, className, icon }) => {
    // monta classes css principais
    const cardClasses = `dashboard-card ${className || ''}`;

    return (
        // container principal do card
        <div className={cardClasses}>
            {/* exibe o título se existir */}
            {title && (
                // cabeçalho com título e ícone opcional
                <h2 className="dashboard-card-title">
                    {/* ícone opcional */}
                    {icon && <span className={styles.cardIcon}>{icon}</span>}
                    {/* texto do título */}
                    {title}
                </h2>
            )}
            {/* conteúdo principal do card */}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
};

export default Card; // exporta o componente