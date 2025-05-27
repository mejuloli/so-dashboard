// so-dashboard/front-end/src/components/SystemTotals/TotalSystemMetricsCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './TotalSystemMetricsCard.module.css';
// import { FiActivity, FiGitMerge } from 'react-icons/fi';

const MAX_HISTORY_POINTS = 30;

const TotalSystemMetricsCard = () => {
    const [metrics, setMetrics] = useState({
        totalProcesses: 0,
        totalThreads: 0,
        history: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Estado de visibilidade para as linhas do gráfico
    const [lineVisibility, setLineVisibility] = useState({
        processes: true,
        threads: true
    });

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/processes');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            const processesData = await response.json();

            const currentTotalProcesses = processesData.length;
            const currentTotalThreads = processesData.reduce((sum, p) => sum + (parseInt(p.threads) || 0), 0);

            setMetrics(prevState => {
                const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const newHistoryPoint = {
                    time: currentTime,
                    processes: currentTotalProcesses,
                    threads: currentTotalThreads,
                };
                const updatedHistory = [...prevState.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);
                return {
                    totalProcesses: currentTotalProcesses,
                    totalThreads: currentTotalThreads,
                    history: updatedHistory,
                };
            });
            setError(null);
        } catch (e) {
            console.error("Erro ao buscar métricas totais do sistema:", e);
            setError(e.message);
        } finally {
            if (loading) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    // Handler para o clique na legenda, usa o dataKey da linha
    const handleLegendClick = useCallback((payloadFromLegend) => {
        const { dataKey } = payloadFromLegend; // dataKey será 'processes' ou 'threads'
        setLineVisibility(prevVisibility => ({
            ...prevVisibility,
            [dataKey]: !prevVisibility[dataKey]
        }));
    }, []);

    // Formatter para o texto da legenda
    const legendFormatter = (value, entry) => {
        const { dataKey } = entry;
        const isInvisible = lineVisibility[dataKey] === false;
        return (
            <span style={{
                color: isInvisible ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)',
                textDecoration: isInvisible ? 'line-through' : 'none',
            }}>
                {value} {/* 'value' é o 'name' da <Line /> */}
            </span>
        );
    };

    if (loading && metrics.history.length === 0) return <Card title="Visão Geral do Sistema"><p className={styles.loadingText}>Carregando...</p></Card>;
    if (error) return <Card title="Visão Geral do Sistema"><p className={styles.errorText}>Erro: {error}</p></Card>;

    return (
        <Card title="Visão Geral do Sistema" className={styles.systemTotalsCard}>
            <div className={styles.metricDisplay}>
                <div className={styles.metricItem}>
                    <span className={styles.metricValue}>{metrics.totalProcesses}</span>
                    <span className={styles.metricLabel}>Total de Processos</span>
                </div>
                <div className={styles.metricItem}>
                    <span className={styles.metricValue}>{metrics.totalThreads}</span>
                    <span className={styles.metricLabel}>Total de Threads</span>
                </div>
            </div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={metrics.history} margin={{ top: 5, right: 20, left: -15, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.7rem" tick={{ fill: 'var(--text-secondary)' }} />
                        <YAxis yAxisId="left" stroke="var(--chart-color-cpu-core4)" fontSize="0.7rem" orientation="left" tick={{ fill: 'var(--chart-color-cpu-core4)' }} allowDecimals={false} />
                        <YAxis yAxisId="right" stroke="var(--chart-color-cpu-core5)" fontSize="0.7rem" orientation="right" tick={{ fill: 'var(--chart-color-cpu-core5)' }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--background-card)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)', borderRadius: '4px', padding: '8px 12px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}
                            cursor={{ fill: 'rgba(134,150,160,0.08)' }}
                            formatter={(value, name) => [value, name]} // name é "Processos" ou "Threads"
                        />
                        <Legend
                            onClick={handleLegendClick}
                            formatter={legendFormatter}
                            verticalAlign="bottom"
                            wrapperStyle={{ fontSize: "0.8rem", paddingTop: "10px", cursor: 'pointer' }}
                            iconType="line"
                            iconSize={10}
                        />

                        {/* As linhas agora usam a prop 'hide' baseada no estado lineVisibility */}
                        <Line
                            yAxisId="left" type="monotone" dataKey="processes" name="Processos"
                            stroke="var(--chart-color-cpu-core4)" strokeWidth={2} dot={false}
                            hide={lineVisibility.processes === false} // <<<<<<<<<<<< ADICIONADO/CORRIGIDO
                            isAnimationActive={false} />
                        <Line
                            yAxisId="right" type="monotone" dataKey="threads" name="Threads"
                            stroke="var(--chart-color-cpu-core5)" strokeWidth={2} dot={false}
                            hide={lineVisibility.threads === false} // <<<<<<<<<<<< ADICIONADO/CORRIGIDO
                            isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default TotalSystemMetricsCard;