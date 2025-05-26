// so-dashboard/front-end/src/components/Layout/DashboardLayout.js
import React from 'react';
import styles from './DashboardLayout.module.css';
// import { RiDashboardLine } from 'react-icons/ri'; // Exemplo de ícone para o logo

const Header = () => (
    <header className={styles.header}>
        <div className={styles.logo}>
            {/* <RiDashboardLine /> */}
            SO-Dashboard
        </div>
        <nav className={styles.nav}>
            {/* Mock data, será dinâmico depois */}
            <span>Intervalo: 5s</span>
        </nav>
    </header>
);

const DashboardLayout = ({ children }) => {
    return (
        <div className={styles.dashboardLayout}>
            <Header />
            <main className={styles.mainContent}>
                {children}
            </main>
            <footer className={styles.footer}>
                Entrega A - Dashboard Visual com Mock Data
            </footer>
        </div>
    );
};

export default DashboardLayout;