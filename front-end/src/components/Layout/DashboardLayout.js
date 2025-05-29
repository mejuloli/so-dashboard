// so-dashboard/front-end/src/components/Layout/DashboardLayout.js
import React from 'react';
import styles from './DashboardLayout.module.css'; // Importa os estilos CSS Modules para este layout.

/**
 * Componente Header (Cabeçalho)
 * 
 * Renderiza a seção de cabeçalho do dashboard, contendo o logo/título
 * e informações de navegação ou status (como nome do servidor e intervalo de atualização).
 * 
 * @returns {JSX.Element} O elemento JSX que representa o cabeçalho.
 */
const Header = () => (
    // Elemento header HTML5 com estilos aplicados do DashboardLayout.module.css.
    <header className={styles.header}>
        {/* Div para o logo ou título principal do dashboard. */}
        <div className={styles.logo}>
            SO – Dashboard {/* Texto do título/logo. */}
        </div>
        {/* Seção de informações adicionais no cabeçalho. */}
        <nav className={styles.nav}>
            {/* Informações estáticas ou dinâmicas sobre o sistema monitorado. */}
            {/* Estes valores ("JKOGM", "5s") estão fixos no código. 
            */}
            <span>Servidor: JKOGM</span>
            <span>Intervalo: 5s</span>
        </nav>
    </header>
);

/**
 * Componente DashboardLayout (Layout Principal do Dashboard)
 * 
 * Define a estrutura visual principal da página do dashboard, incluindo
 * o Cabeçalho (Header), a área de Conteúdo Principal (onde os cards são renderizados)
 * e o Rodapé (Footer).
 * 
 * @param {object} props - As propriedades do componente.
 * @param {React.ReactNode} props.children - O conteúdo principal da página do dashboard
 *                                          (geralmente os cards de métricas) que será
 *                                          renderizado dentro da tag <main>. Obrigatório.
 * @returns {JSX.Element} O elemento JSX que representa o layout completo do dashboard.
 */
const DashboardLayout = ({ children }) => {
    return (
        // Div principal que engloba todo o layout do dashboard.
        <div className={styles.dashboardLayout}>
            {/* Renderiza o componente Header definido acima. */}
            <Header />

            {/* Elemento main HTML5 para o conteúdo principal da página. */}
            {/* Os estilos são aplicados a partir de DashboardLayout.module.css. */}
            <main className={styles.mainContent}>
                {/* Renderiza o conteúdo filho passado para o DashboardLayout.
                    É aqui que os diferentes cards (CPU, Memória, Processos) serão exibidos. 
                */}
                {children}
            </main>

            {/* Elemento footer HTML5 para o rodapé da página. */}
            <footer className={styles.footer}>
                {/* Texto do rodapé contendo créditos. */}
                Dashboard de Sistema Operacional desenvolvido por Julia Kamilly de Oliveira e Gabriela Morikawa.
            </footer>
        </div>
    );
};

export default DashboardLayout; // Exporta o componente DashboardLayout para ser usado como layout principal na aplicação.