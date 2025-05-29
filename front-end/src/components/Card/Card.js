// so-dashboard/front-end/src/components/Card/Card.js
import React from 'react';
import styles from './Card.module.css'; // Importa estilos CSS Modules para o componente.

/**
 * Componente Card reutilizável para exibir conteúdo em blocos.
 * 
 * Este componente serve como um container visual padrão para diferentes seções
 * do dashboard, como "Uso de CPU", "Uso de Memória", etc. Ele pode opcionalmente
 * exibir um título e um ícone.
 * 
 * @param {object} props - As propriedades do componente.
 * @param {string} [props.title] - O título a ser exibido no cabeçalho do card. Opcional.
 * @param {React.ReactNode} props.children - O conteúdo a ser renderizado dentro do card. Obrigatório.
 * @param {string} [props.className] - Classes CSS adicionais para customizar o estilo do card. Opcional.
 * @param {React.ReactNode} [props.icon] - Um ícone (geralmente um componente SVG ou de uma biblioteca de ícones)
 *                                        a ser exibido ao lado do título. Opcional.
 * @returns {JSX.Element} O elemento JSX que representa o card.
 */
const Card = ({ title, children, className, icon }) => {
    // Constrói a string de classes CSS para o elemento principal do card.
    // Inclui uma classe base 'dashboard-card' e qualquer classe adicional
    // passada através da prop `className`.
    // O operador `|| ''` garante que se `className` for undefined, não resultará em "undefined" na string de classe.
    const cardClasses = `dashboard-card ${className || ''}`;

    return (
        // Elemento div principal do card com as classes CSS aplicadas.
        <div className={cardClasses}>
            {/* Renderiza o título do card apenas se a prop 'title' for fornecida. */}
            {title && (
                // Cabeçalho do card que contém o ícone (se houver) e o texto do título.
                // A classe 'dashboard-card-title' deve ser definida globalmente ou no App.css,
                // já que não usa `styles.` (CSS Modules), a menos que seja um erro e deva ser `styles.dashboardCardTitle`.
                // Assumindo que 'dashboard-card-title' é uma classe global ou de um CSS pai.
                <h2 className="dashboard-card-title">
                    {/* Renderiza o ícone apenas se a prop 'icon' for fornecida. */}
                    {icon && <span className={styles.cardIcon}>{icon}</span>}
                    {/* Exibe o texto do título. */}
                    {title}
                </h2>
            )}
            {/* Container para o conteúdo principal do card. */}
            {/* Usa a classe `cardContent` definida no arquivo Card.module.css. */}
            <div className={styles.cardContent}>
                {/* Renderiza o conteúdo filho passado para o componente. */}
                {children}
            </div>
        </div>
    );
};

export default Card; // Exporta o componente Card para ser usado em outras partes da aplicação.