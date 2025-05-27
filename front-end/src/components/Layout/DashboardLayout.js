// so-dashboard/front-end/src/components/Layout/DashboardLayout.js
import React from 'react';
import styles from './DashboardLayout.module.css';
// import { RiDashboardLine } from 'react-icons/ri'; 

const Header = () => (
    <header className={styles.header}>
        <div className={styles.logo}>
            {/* <RiDashboardLine /> */}
            SO-Dashboard
        </div>
        <nav className={styles.nav}>
            <span>Servidor: JKOGM</span>
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
                Dashboard de Sistema Operacional desenvolvido por Julia Kamilly de Oliveira e Gabriela Morikawa.
            </footer>
        </div>
    );
};

export default DashboardLayout;