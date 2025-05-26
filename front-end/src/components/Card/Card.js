// so-dashboard/front-end/src/components/Card/Card.js
import React from 'react';
import styles from './Card.module.css';

const Card = ({ title, children, className, icon }) => {
    return (
        <div className={`dashboard-card ${className || ''}`}>
            {title && (
                // A classe .dashboard-card-title já está no index.css para estilizar o h2
                <h2 className="dashboard-card-title">
                    {icon && <span className={styles.cardIcon}>{icon}</span>}
                    {title}
                </h2>
            )}
            <div className={styles.cardContent}>
                {children}
            </div>
        </div>
    );
};

export default Card;