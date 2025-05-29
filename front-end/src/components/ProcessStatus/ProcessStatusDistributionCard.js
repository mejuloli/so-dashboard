// so-dashboard/front-end/src/components/ProcessStatus/ProcessStatusDistributionCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão.
// Componentes da biblioteca Recharts para criação de gráficos de pizza.
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from './ProcessStatusDistributionCard.module.css'; // Estilos CSS Modules.

// Cores para cada status de processo no gráfico de pizza.
// É importante que as chaves aqui correspondam exatamente aos valores de status
// que o backend envia (ex: "Rodando", "Dormindo", etc.).
const STATUS_COLORS = {
    'Rodando': 'var(--chart-color-cpu-core1)',        // Ex: Verde
    'Dormindo': 'var(--chart-color-cpu-core2)',       // Ex: Azul
    'Inativo': 'var(--chart-color-cpu-core4)',        // Ex: Cinza claro (para 'Inativo (Idle)')
    'Zumbi': 'var(--chart-color-cpu-core6)',          // Ex: Vermelho/Laranja
    'Parado': 'var(--chart-color-cpu-core5)',         // Ex: Amarelo
    'Disco Sleep': 'var(--chart-color-cpu-core7)',    // Ex: Roxo
    'Outro': 'var(--text-secondary)',                 // Cor para status não mapeados.
    // Adicionar mais mapeamentos de status e cores conforme necessário.
};

// URL do endpoint da API para buscar a lista de processos.
// Este componente reutiliza o mesmo endpoint da lista de processos.
const API_URL_PROCESSES = 'http://localhost:5000/api/processes';
// Intervalo de atualização dos dados. Pode ser diferente do ProcessListCard se desejado.
const FETCH_INTERVAL_MS = 7000; // 7 segundos.

/**
 * Componente ProcessStatusDistributionCard
 * 
 * Exibe um gráfico mostrando a distribuição percentual dos diferentes
 * status dos processos em execução no sistema (ex: Rodando, Dormindo, Zumbi).
 * Os dados são derivados da lista de processos obtida da API.
 */
const ProcessStatusDistributionCard = () => {
    // Estado para armazenar os dados formatados para o gráfico de pizza.
    // Ex: [{ name: 'Rodando', value: 10 }, { name: 'Dormindo', value: 150 }, ...]
    const [statusChartData, setStatusChartData] = useState([]);
    // Estado para controlar o carregamento inicial dos dados.
    const [isLoading, setIsLoading] = useState(true);
    // Estado para armazenar mensagens de erro da busca de dados.
    const [fetchError, setFetchError] = useState(null);

    /**
     * Função para buscar a lista de processos da API e calcular a distribuição de status.
     * Usa useCallback para memoização.
     */
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(API_URL_PROCESSES); // Busca todos os processos.
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            const processesData = await response.json(); // Array de objetos de processo.

            // Calcula a contagem de processos para cada status.
            const statusCounts = processesData.reduce((accumulator, process) => {
                // Usa o campo `status` do objeto processo (que já deve ser uma string legível do backend).
                // Se o status for nulo ou indefinido, classifica como 'Outro'.
                const statusKey = process.status || 'Outro';
                accumulator[statusKey] = (accumulator[statusKey] || 0) + 1; // Incrementa a contagem.
                return accumulator;
            }, {}); // Objeto inicial para o acumulador (ex: { 'Rodando': 0, 'Dormindo': 0 }).

            // Converte o objeto de contagens para o formato de array esperado pelo PieChart.
            // Ex: [{ name: 'Rodando', value: 10 }, { name: 'Dormindo', value: 150 }]
            const chartDataFormatted = Object.keys(statusCounts).map(key => ({
                name: key,             // Nome do status (para legenda e tooltip).
                value: statusCounts[key] // Contagem de processos com esse status (para o tamanho da fatia).
            }));

            setStatusChartData(chartDataFormatted);
            setFetchError(null); // Limpa erros.
        } catch (error) {
            console.error("Erro ao buscar dados para o status dos processos:", error);
            setFetchError(error.message);
        } finally {
            if (isLoading) {
                setIsLoading(false); // Para o indicador de carregamento inicial.
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]); // `isLoading` é a dependência principal.

    /**
     * Efeito para buscar dados na montagem e configurar a busca periódica.
     */
    useEffect(() => {
        fetchData(); // Busca inicial.
        const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS); // Busca periódica.
        return () => clearInterval(intervalId); // Limpeza na desmontagem.
    }, [fetchData]); // `fetchData` é memoizada.

    // --- Constantes e Funções para o Gráfico ---
    const RADIAN = Math.PI / 180; // Constante para converter graus em radianos.

    /**
     * Função para renderizar rótulos customizados dentro das fatias do gráfico de pizza.
     * Exibe o percentual da fatia.
     * @param {object} props - Propriedades fornecidas pelo componente Pie da Recharts.
     * @param {number} props.cx - Coordenada X do centro da pizza.
     * @param {number} props.cy - Coordenada Y do centro da pizza.
     * @param {number} props.midAngle - Ângulo médio da fatia em graus.
     * @param {number} props.innerRadius - Raio interno da fatia (para gráficos de rosca).
     * @param {number} props.outerRadius - Raio externo da fatia.
     * @param {number} props.percent - O valor percentual da fatia (0 a 1).
     * @param {string} props.name - O nome da fatia (status do processo).
     * @returns {JSX.Element|null} Um elemento de texto SVG para o rótulo, ou null se a fatia for muito pequena.
     */
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
        // Calcula a posição do rótulo no meio do caminho entre o raio interno e externo.
        // O fator 0.55 centraliza um pouco mais o texto.
        const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + radius * Math.cos(-midAngle * RADIAN); // Converte ângulo para radianos e calcula X.
        const y = cy + radius * Math.sin(-midAngle * RADIAN); // Converte ângulo para radianos e calcula Y.

        // Oculta o rótulo se a fatia for muito pequena (ex: menos de 3% do total)
        // para evitar sobreposição de texto.
        if (percent * 100 < 3) {
            return null;
        }

        return (
            <text
                x={x}
                y={y}
                fill="white" // Cor do texto do rótulo.
                textAnchor={x > cx ? 'start' : 'end'} // Alinhamento do texto baseado na posição X.
                dominantBaseline="central" // Alinhamento vertical do texto.
                fontSize="0.75rem"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`} {/* Exibe o percentual arredondado. */}
            </text>
        );
    };

    // --- Renderização Condicional ---
    if (isLoading && statusChartData.length === 0) {
        return <Card title="Distribuição de Status dos Processos"><p className={styles.loadingText}>Carregando dados...</p></Card>;
    }
    if (fetchError) {
        return <Card title="Distribuição de Status dos Processos"><p className={styles.errorText}>Erro ao carregar: {fetchError}</p></Card>;
    }
    // Se não estiver carregando e não houver dados (ex: API retornou lista vazia de processos).
    if (statusChartData.length === 0 && !isLoading) {
        return <Card title="Distribuição de Status dos Processos"><p className={styles.loadingText}>Sem dados de processos para exibir.</p></Card>;
    }

    // --- Renderização Principal ---
    return (
        <Card title="Distribuição de Status dos Processos">
            <div className={styles.chartContainer}>
                {/* ResponsiveContainer garante que o gráfico se ajuste ao tamanho do container pai. */}
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        {/* Componente Pie define as fatias do gráfico. */}
                        <Pie
                            data={statusChartData} // Dados para as fatias.
                            cx="50%" // Posição X do centro da pizza (percentual do container).
                            cy="50%" // Posição Y do centro da pizza.
                            labelLine={false} // Não exibe linhas de conexão para os rótulos.
                            label={renderCustomizedLabel} // Usa a função customizada para renderizar rótulos.
                            outerRadius={90} // Raio externo da pizza.
                            innerRadius={45} // Raio interno (cria um gráfico de rosca/donut).
                            fill="#8884d8" // Cor de preenchimento padrão (substituída por <Cell>).
                            paddingAngle={2} // Espaçamento entre as fatias.
                            dataKey="value" // Chave no objeto de dados que representa o valor da fatia.
                            nameKey="name"  // Chave no objeto de dados que representa o nome da fatia.
                        >
                            {/* Mapeia os dados para criar um <Cell> para cada fatia, aplicando cores customizadas. */}
                            {statusChartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    // Usa a cor definida em STATUS_COLORS para o nome do status.
                                    // Se o status não estiver mapeado, usa a cor de 'Outro'.
                                    fill={STATUS_COLORS[entry.name] || STATUS_COLORS['Outro']}
                                />
                            ))}
                        </Pie>
                        {/* Tooltip exibido ao passar o mouse sobre as fatias. */}
                        <Tooltip
                            // Formata o conteúdo do tooltip.
                            formatter={(value, name) => [value, name]} // Ex: [10, "Rodando"]
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                border: `1px solid var(--border-medium)`,
                                borderRadius: '4px',
                                color: 'var(--text-primary)'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)' }}
                        />
                        {/* Legenda do gráfico. */}
                        <Legend
                            iconType="circle" // Formato do ícone na legenda.
                            layout="vertical" // Layout vertical (itens um abaixo do outro).
                            align="right" // Alinhamento da legenda à direita do gráfico.
                            verticalAlign="middle" // Alinhamento vertical no meio.
                            wrapperStyle={{ // Estilos para o container da legenda.
                                fontSize: "0.85rem",
                                lineHeight: "1.6",
                                color: 'var(--text-secondary)'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ProcessStatusDistributionCard;