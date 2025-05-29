// so-dashboard/front-end/src/components/ProgressBar/ProgressBar.js
import React from 'react';
import styles from './ProgressBar.module.css'; // Importa os estilos CSS Modules para este componente.

/**
 * Componente ProgressBar (Barra de Progresso)
 * 
 * Renderiza uma barra de progresso visual para representar um valor percentual ou
 * um valor em relação a um máximo. Pode opcionalmente exibir o valor textual.
 * A cor da barra pode ser definida explicitamente ou será determinada dinamicamente
 * com base no valor percentual se nenhuma cor for fornecida.
 * 
 * @param {object} props - As propriedades do componente.
 * @param {number} props.value - O valor atual a ser representado pela barra. Obrigatório.
 * @param {number} [props.max=100] - O valor máximo que `props.value` pode atingir.
 *                                   Usado para calcular a porcentagem. Padrão é 100.
 * @param {string} [props.height='10px'] - A altura da barra de progresso (ex: '10px', '0.5rem').
 *                                        Padrão é '10px'.
 * @param {string} [props.color] - A cor de preenchimento da barra de progresso.
 *                                 Pode ser um valor CSS de cor (ex: '#FF0000', 'blue', 'var(--minha-cor)').
 *                                 Se não fornecida, a cor será determinada dinamicamente. Opcional.
 * @param {boolean} [props.showValueText=false] - Se `true`, exibe o valor percentual como texto
 *                                                ao lado da barra. Padrão é `false`.
 * @returns {JSX.Element} O elemento JSX que representa a barra de progresso.
 */
const ProgressBar = ({ value, max = 100, height = '10px', color, showValueText = false }) => {
    // Calcula a porcentagem do valor em relação ao máximo.
    // Garante que não haja divisão por zero se `max` for 0 ou negativo.
    // O valor percentual é limitado entre 0 e 100 para a largura da barra.
    const rawPercentage = max > 0 ? (value / max) * 100 : 0;
    const displayPercentage = Math.min(Math.max(rawPercentage, 0), 100); // Clamped entre 0 e 100.

    // Determina a cor da barra de progresso.
    let barFillColor = color; // Usa a cor fornecida se existir.

    // Se nenhuma cor for fornecida via props, determina a cor dinamicamente
    // com base no valor percentual.
    if (!barFillColor) {
        if (displayPercentage > 85) {
            barFillColor = 'var(--chart-color-cpu-core6)'; // Cor para uso muito alto (ex: vermelho).
        } else if (displayPercentage > 60) {
            barFillColor = 'var(--chart-color-cpu-core5)'; // Cor para uso moderado/alto (ex: laranja/amarelo).
        } else {
            barFillColor = 'var(--chart-color-cpu-core1)'; // Cor para uso normal/baixo (ex: verde/azul).
        }
        // Nota: As variáveis CSS (--chart-color-cpu-coreX) devem estar definidas globalmente.
    }

    // --- Renderização do Componente ---
    return (
        // Wrapper principal para a barra de progresso e o texto opcional.
        // Permite alinhar a barra e o texto se `showValueText` for true.
        <div className={styles.progressBarWrapper}>
            {/* Container da barra de progresso. Sua altura é definida pela prop `height`. */}
            <div className={styles.progressBarContainer} style={{ height: height }}>
                {/* Elemento de preenchimento da barra. Sua largura é a porcentagem calculada
                    e sua cor de fundo é `barFillColor`. */}
                <div
                    className={styles.progressBarFill}
                    style={{
                        width: `${displayPercentage}%`,
                        backgroundColor: barFillColor
                    }}
                    role="progressbar" // Atributo de acessibilidade.
                    aria-valuenow={value} // Valor atual.
                    aria-valuemin={0} // Valor mínimo (assumido como 0).
                    aria-valuemax={max} // Valor máximo.
                    aria-label={`Progresso: ${value} de ${max}`} // Rótulo para leitores de tela.
                />
            </div>
            {/* Renderiza o texto do valor percentual apenas se `showValueText` for true. */}
            {showValueText && (
                <span className={styles.progressBarValueText}>
                    {/* Exibe o valor percentual bruto (não o 'clamped' displayPercentage) 
                        com uma casa decimal. (value || 0) trata o caso de `value` ser undefined/null.
                        Se você quiser mostrar `displayPercentage` aqui, substitua `(value || 0) / max * 100`.
                        A sua lógica original era `(value || 0).toFixed(1)}%`, o que implica que `value`
                        já é um percentual. Vou manter a lógica original de exibir `value` diretamente.
                        Se `value` é o valor bruto e `max` é 100, então `(value || 0).toFixed(1)}%` é o percentual.
                        Se `value` é, por exemplo, 80 e `max` é 200, então o percentual seria 40%.
                        Assumindo que `value` é o valor que representa o progresso e `max` é o total,
                        o texto deveria ser o percentual calculado.
                    */}
                    {`${((value || 0) / max * 100).toFixed(1)}%`} {/* Exibe o percentual calculado */}
                    {/* Ou, se 'value' já é o percentual que você quer mostrar:
                    {`${(value || 0).toFixed(1)}%`}
                    Vou manter a lógica de calcular o percentual para o texto para consistência com a barra.
                    */}
                </span>
            )}
        </div>
    );
};

export default ProgressBar;