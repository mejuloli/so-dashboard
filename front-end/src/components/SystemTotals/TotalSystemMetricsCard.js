// so-dashboard/front-end/src/components/SystemTotals/TotalSystemMetricsCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão.
// Componentes da biblioteca Recharts para mini-gráficos de linha.
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import styles from './TotalSystemMetricsCard.module.css'; // Estilos CSS Modules.

// Número máximo de pontos de dados a serem mantidos no histórico dos mini-gráficos.
const MAX_HISTORY_POINTS_TOTALS = 30; // 30 pontos com intervalo de 5s = 2.5 minutos de histórico.

// URL do endpoint da API para buscar dados da CPU (que inclui os totais de processos/threads).
const API_URL_CPU = 'http://localhost:5000/api/cpu';
// URL de fallback caso /api/cpu não forneça os totais (menos ideal).
const API_URL_PROCESSES_FALLBACK = 'http://localhost:5000/api/processes';
// Intervalo de atualização dos dados em milissegundos.
const FETCH_INTERVAL_MS = 5000; // 5 segundos.


/**
 * Subcomponente Interno: SingleTotalMetricCardInternal
 * 
 * Renderiza um card individual para uma métrica total do sistema (ex: Total de Processos),
 * exibindo o valor atual da métrica e um mini-gráfico de histórico.
 * Este é um componente de apresentação que recebe os dados já processados.
 * 
 * @param {object} props - As propriedades do componente.
 * @param {string} props.title - O título do card (ex: "Total de Processos").
 * @param {number|string} props.value - O valor atual da métrica a ser exibido.
 * @param {Array<object>} props.dataHistory - Array de objetos para o histórico do mini-gráfico.
 *                                          Ex: [{ time: "10:30:00", value: 150 }, ...]
 * @param {string} props.dataKey - A chave no objeto `dataHistory` que contém o valor da métrica (ex: "value").
 * @param {string} [props.lineColor] - A cor da linha do mini-gráfico (valor CSS).
 * @param {string} [props.unit=''] - A unidade a ser exibida no tooltip do gráfico (ex: "%", " MB").
 * @returns {JSX.Element} O elemento JSX que representa o card da métrica individual.
 */
const SingleTotalMetricCardInternal = ({ title, value, dataHistory, dataKey, lineColor, unit = '' }) => {
    // Calcula o domínio máximo para o eixo Y do mini-gráfico.
    // Garante que o gráfico tenha espaço para os valores atuais e um pouco mais.
    const yMaxHistory = dataHistory && dataHistory.length > 0
        ? Math.max(...dataHistory.map(p => p[dataKey] || 0))
        : 0;
    // O domínio do eixo Y será de 0 até (pelo menos 10, ou 10% acima do valor máximo no histórico).
    const yAxisDomain = [0, Math.max(10, Math.ceil(yMaxHistory * 1.1))];

    return (
        <Card title={title} className={styles.singleTotalCard}>
            {/* Exibe o valor atual da métrica. */}
            <div className={styles.metricItemStandalone}>
                <span className={styles.metricValue}>{value}</span>
            </div>

            {/* Renderiza o mini-gráfico apenas se houver dados de histórico. */}
            {dataHistory && dataHistory.length > 0 && (
                <div className={styles.miniChartContainer}>
                    <ResponsiveContainer width="100%" height={100}> {/* Altura fixa para o mini-gráfico. */}
                        <LineChart
                            data={dataHistory}
                            margin={{ top: 5, right: 15, left: 15, bottom: 5 }} // Margens ajustadas para mini-gráfico.
                        >
                            {/* Grid cartesiano (apenas linhas horizontais para simplicidade). */}
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={true} vertical={false} />
                            {/* Eixo X (tempo) - formata para mostrar apenas HH:MM. */}
                            <XAxis
                                dataKey="time"
                                stroke="var(--text-secondary)"
                                fontSize="0.7rem"
                                tick={{ fill: 'var(--text-secondary)' }}
                                tickFormatter={(tick) => tick.slice(0, 5)} // Ex: "10:30" de "10:30:45"
                                interval="preserveStartEnd" // Tenta preservar o primeiro e último tick.
                            />
                            {/* Eixo Y (valor da métrica). */}
                            <YAxis
                                stroke={lineColor || 'var(--text-secondary)'}
                                fontSize="0.7rem"
                                tick={{ fill: lineColor || 'var(--text-secondary)' }}
                                domain={yAxisDomain} // Domínio calculado.
                                allowDecimals={false} // Não mostra decimais nos ticks do eixo Y.
                                width={35} // Largura reservada para os rótulos do eixo Y.
                            />
                            {/* Tooltip para o mini-gráfico. */}
                            <Tooltip
                                formatter={(val) => [`${val}${unit}`, title]} // Formata o valor e o nome no tooltip.
                                contentStyle={{
                                    backgroundColor: 'var(--background-card)',
                                    border: `1px solid var(--border-medium)`,
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)'
                                }}
                                itemStyle={{ color: lineColor || 'var(--text-primary)' }}
                                labelStyle={{ color: 'var(--text-secondary)' }}
                                cursor={{ stroke: lineColor || 'var(--border-soft)', strokeWidth: 1, fill: 'transparent' }}
                            />
                            {/* Linha do gráfico. */}
                            <Line
                                type="monotone"
                                dataKey={dataKey} // Chave dos dados para a linha.
                                stroke={lineColor || 'var(--text-primary)'}
                                strokeWidth={2}
                                dot={{ r: 1 }} // Pontos pequenos em cada dado.
                                activeDot={{ r: 3 }} // Ponto maior ao passar o mouse.
                                isAnimationActive={false} // Desativa animações para performance.
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
};


/**
 * Componente Wrapper: SystemSummaryWrapper (Nome original: TotalSystemMetricsCard)
 * 
 * Busca os dados totais do sistema (total de processos e threads) da API
 * e renderiza dois componentes `SingleTotalMetricCardInternal` para exibir essas métricas.
 * Mantém um histórico para cada métrica para os mini-gráficos.
 */
const SystemSummaryWrapper = () => {
    // Estado para armazenar os totais e seus históricos.
    const [systemTotals, setSystemTotals] = useState({
        totalProcesses: 0,          // Contagem atual de processos.
        totalThreads: 0,            // Contagem atual de threads.
        processHistory: [],         // Histórico para o gráfico de total de processos.
        threadHistory: [],          // Histórico para o gráfico de total de threads.
    });
    // Estado para controle de carregamento e erro.
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    /**
     * Função para buscar os dados totais da API.
     * Prioriza buscar de /api/cpu, que já deve conter `total_processes` e `total_threads`
     * (conforme a refatoração do backend).
     * Usa /api/processes como fallback se necessário (menos eficiente).
     * Usa useCallback para memoização.
     */
    const fetchData = useCallback(async () => {
        try {
            let currentTotalProcesses = 0;
            let currentTotalThreads = 0;

            // Tenta buscar os totais do endpoint /api/cpu.
            const cpuApiResponse = await fetch(API_URL_CPU);
            if (cpuApiResponse.ok) {
                const cpuData = await cpuApiResponse.json();
                // Verifica se o backend /api/cpu forneceu os totais.
                if (cpuData.total_processes !== undefined && cpuData.total_threads !== undefined) {
                    currentTotalProcesses = cpuData.total_processes;
                    currentTotalThreads = cpuData.total_threads;
                } else {
                    // Fallback: se /api/cpu não tiver os totais, busca de /api/processes.
                    // Isso é menos ideal, pois busca a lista inteira apenas para as contagens.
                    console.warn("/api/cpu não forneceu totais, usando fallback para /api/processes.");
                    const processesApiResponse = await fetch(API_URL_PROCESSES_FALLBACK);
                    if (!processesApiResponse.ok) {
                        throw new Error(`Erro ao buscar processos (fallback): ${processesApiResponse.statusText}`);
                    }
                    const processesData = await processesApiResponse.json();
                    currentTotalProcesses = processesData.length;
                    currentTotalThreads = processesData.reduce((sum, p) => sum + (parseInt(p.threads, 10) || 0), 0);
                }
            } else {
                // Se /api/cpu falhar, tenta o fallback para /api/processes.
                console.warn(`Falha ao buscar ${API_URL_CPU} (${cpuApiResponse.status}), usando fallback para /api/processes.`);
                const processesApiResponse = await fetch(API_URL_PROCESSES_FALLBACK);
                if (!processesApiResponse.ok) {
                    throw new Error(`Erro ao buscar processos (fallback após falha CPU): ${processesApiResponse.statusText}`);
                }
                const processesData = await processesApiResponse.json();
                currentTotalProcesses = processesData.length;
                currentTotalThreads = processesData.reduce((sum, p) => sum + (parseInt(p.threads, 10) || 0), 0);
            }

            // Atualiza o estado com os novos totais e adiciona ao histórico.
            setSystemTotals(prevState => {
                const currentTime = new Date().toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
                // 'value' é usado como dataKey no SingleTotalMetricCardInternal.
                const newProcessHistoryPoint = { time: currentTime, value: currentTotalProcesses };
                const newThreadHistoryPoint = { time: currentTime, value: currentTotalThreads };

                const updatedProcessHistory = [...prevState.processHistory, newProcessHistoryPoint].slice(-MAX_HISTORY_POINTS_TOTALS);
                const updatedThreadHistory = [...prevState.threadHistory, newThreadHistoryPoint].slice(-MAX_HISTORY_POINTS_TOTALS);

                return {
                    totalProcesses: currentTotalProcesses,
                    totalThreads: currentTotalThreads,
                    processHistory: updatedProcessHistory,
                    threadHistory: updatedThreadHistory,
                };
            });
            setFetchError(null); // Limpa erros.
        } catch (error) {
            console.error("Erro ao buscar métricas totais do sistema:", error);
            setFetchError(error.message);
        } finally {
            if (isLoading) {
                setIsLoading(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]); // Dependência principal é `isLoading`.

    /**
     * Efeito para buscar dados na montagem e configurar a busca periódica.
     */
    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS);
        return () => clearInterval(intervalId); // Limpeza.
    }, [fetchData]); // `fetchData` é memoizada.

    // --- Renderização Condicional ---
    if (isLoading && systemTotals.processHistory.length === 0) {
        // Exibe cards de carregamento individuais se ainda estiver carregando e sem histórico.
        return (
            <>
                <Card title="Total de Processos" className={styles.singleTotalCard}><p className={styles.loadingText}>Carregando...</p></Card>
                <Card title="Total de Threads" className={styles.singleTotalCard}><p className={styles.loadingText}>Carregando...</p></Card>
            </>
        );
    }
    if (fetchError) {
        // Exibe cards de erro individuais.
        return (
            <>
                <Card title="Total de Processos" className={styles.singleTotalCard}><p className={styles.errorText}>Erro: {fetchError}</p></Card>
                <Card title="Total de Threads" className={styles.singleTotalCard}><p className={styles.errorText}>Erro: {fetchError}</p></Card>
            </>
        );
    }

    // --- Renderização Principal ---
    // Renderiza os dois cards de métricas totais usando o subcomponente.
    return (
        <>
            <SingleTotalMetricCardInternal
                title="Total de Processos"
                value={systemTotals.totalProcesses}
                dataHistory={systemTotals.processHistory}
                dataKey="value" // A chave 'value' foi definida ao criar os pontos de histórico.
                lineColor="var(--chart-color-cpu-core4)" // Cor para a linha do gráfico de processos.
            />
            <SingleTotalMetricCardInternal
                title="Total de Threads"
                value={systemTotals.totalThreads}
                dataHistory={systemTotals.threadHistory}
                dataKey="value"
                lineColor="var(--chart-color-cpu-core5)" // Cor para a linha do gráfico de threads.
            />
        </>
    );
};

// Exporta o componente wrapper SystemSummaryWrapper como o default deste arquivo.
export default SystemSummaryWrapper;
// O nome do arquivo é TotalSystemMetricsCard.js, então talvez o nome do componente
// devesse ser TotalSystemMetricsCards (plural) ou SystemSummaryCards.
// Mantive SystemSummaryWrapper conforme a lógica interna.