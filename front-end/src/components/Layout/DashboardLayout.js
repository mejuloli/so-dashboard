import React from 'react';
import styles from './DashboardLayout.module.css'; // estilos css module

// componente de cabeçalho do dashboard
// exibe título, abas e informações de status
const Header = ({ children }) => (
    <header className={styles.header}>
        <div className={styles.logo}>
            so – dashboard
        </div>
        {/* renderiza abas se existirem */}
        {children && <div className={styles.tabsInHeader}>{children}</div>}
        <nav className={styles.nav}>
            <span>servidor: JKOGM</span>
            <span>intervalo: 5s</span>
        </nav>
    </header>
);

// layout principal do dashboard
// define estrutura com header, main e footer
const DashboardLayout = ({ children, headerTabs }) => {
    return (
        <div className={styles.dashboardLayout}>
            {/* cabeçalho com abas */}
            <Header>{headerTabs}</Header>

            {/* conteúdo principal */}
            <main className={styles.mainContent}>
                {children}
            </main>

            {/* rodapé */}
            <footer className={styles.footer}>
                dashboard de sistema operacional desenvolvido por julia kamilly de oliveira e gabriela morikawa.
            </footer>
        </div>
    );
};

export default DashboardLayout;