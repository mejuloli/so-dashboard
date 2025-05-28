// so-dashboard/front-end/src/components/SystemTotals/TotalSystemMetricsCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './TotalSystemMetricsCard.module.css';

const MAX_HISTORY_POINTS_TOTALS = 30;

// Componente reutilizável para cada métrica total com seu gráfico
const SingleTotalMetricCardInternal = ({ title, value, dataHistory, dataKey, lineColor, unit = '' }) => {
    // Encontrar o valor máximo no histórico para definir o domínio do eixo Y
    const yMax = dataHistory.length > 0 ? Math.max(...dataHistory.map(p => p[dataKey] || 0)) : 0;
    const yDomain = [0, Math.max(10, Math.ceil(yMax * 1.1))]; // Pelo menos 10, ou 10% acima do max

    return (
        <Card title={title} className={styles.singleTotalCard}>
            <div className={styles.metricItemStandalone}>
                <span className={styles.metricValue}>{value}</span>
            </div>
            {dataHistory && dataHistory.length > 0 && (
                <div className={styles.miniChartContainer}>
                    <ResponsiveContainer width="100%" height={100}> {/* Aumentada altura do gráfico */}
                        <LineChart data={dataHistory} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}> {/* Ajuste de margens */}
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal={true} vertical={false} />
                            <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.7rem" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(tick) => tick.slice(-5)} /> {/* Mostra apenas HH:MM */}
                            <YAxis
                                stroke={lineColor || 'var(--text-secondary)'}
                                fontSize="0.7rem"
                                tick={{ fill: lineColor || 'var(--text-secondary)' }}
                                domain={yDomain}
                                allowDecimals={false}
                                width={35} // Espaço para os números do eixo Y
                            />
                            <Tooltip
                                formatter={(val) => [`${val}${unit}`, title]}
                                contentStyle={{ backgroundColor: 'var(--background-card)', border: `1px solid var(--border-medium)`, borderRadius: '4px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: lineColor || 'var(--text-primary)' }}
                                labelStyle={{ color: 'var(--text-secondary)' }}
                                cursor={{ stroke: lineColor, strokeWidth: 1, fill: 'transparent' }}
                            />
                            <Line type="monotone" dataKey={dataKey} stroke={lineColor || 'var(--text-primary)'} strokeWidth={2} dot={{ r: 1 }} activeDot={{ r: 3 }} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
};

// Componente Wrapper que busca os dados e renderiza os dois cards de totais
const SystemSummaryWrapper = () => {
    const [totals, setTotals] = useState({ totalProcesses: 0, totalThreads: 0, processHistory: [], threadHistory: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            let currentTotalProcesses = 0; let currentTotalThreads = 0;
            const cpuResponse = await fetch('http://localhost:5000/api/cpu');
            if (cpuResponse.ok) {
                const cpuData = await cpuResponse.json();
                // Assumindo que o backend (controller._update_data_cache) agora coloca os totais em /api/cpu
                if (cpuData.total_processes !== undefined && cpuData.total_threads !== undefined) {
                    currentTotalProcesses = cpuData.total_processes;
                    currentTotalThreads = cpuData.total_threads;
                } else { // Fallback se /api/cpu não tiver os totais
                    const procResponse = await fetch('http://localhost:5000/api/processes');
                    if (!procResponse.ok) throw new Error(`Erro Processos: ${procResponse.statusText}`);
                    const processesData = await procResponse.json();
                    currentTotalProcesses = processesData.length;
                    currentTotalThreads = processesData.reduce((sum, p) => sum + (parseInt(p.threads) || 0), 0);
                }
            } else { /* ... (mesmo fallback de antes) ... */
                const procResponse = await fetch('http://localhost:5000/api/processes');
                if (!procResponse.ok) throw new Error(`Erro Processos: ${procResponse.statusText}`);
                const processesData = await procResponse.json();
                currentTotalProcesses = processesData.length;
                currentTotalThreads = processesData.reduce((sum, p) => sum + (parseInt(p.threads) || 0), 0);
            }

            setTotals(prevState => {
                const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const newProcessHistory = [...prevState.processHistory, { time: currentTime, value: currentTotalProcesses }].slice(-MAX_HISTORY_POINTS_TOTALS);
                const newThreadHistory = [...prevState.threadHistory, { time: currentTime, value: currentTotalThreads }].slice(-MAX_HISTORY_POINTS_TOTALS);
                return { totalProcesses: currentTotalProcesses, totalThreads: currentTotalThreads, processHistory: newProcessHistory, threadHistory: newThreadHistory, };
            });
            setError(null);
        } catch (e) {
            console.error("Erro ao buscar métricas totais:", e); setError(e.message);
        } finally { if (loading) setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    useEffect(() => { fetchData(); const intervalId = setInterval(fetchData, 5000); return () => clearInterval(intervalId); }, [fetchData]);

    if (loading && totals.processHistory.length === 0) {
        return (
            <>
                <Card title="Total de Processos"><p className={styles.loadingText}>Carregando...</p></Card>
                <Card title="Total de Threads"><p className={styles.loadingText}>Carregando...</p></Card>
            </>
        );
    }
    if (error) {
        return (
            <>
                <Card title="Total de Processos"><p className={styles.errorText}>Erro: {error}</p></Card>
                <Card title="Total de Threads"><p className={styles.errorText}>Erro: {error}</p></Card>
            </>
        );
    }

    return (
        <>
            <SingleTotalMetricCardInternal title="Total de Processos" value={totals.totalProcesses} dataHistory={totals.processHistory} dataKey="value" lineColor="var(--chart-color-cpu-core4)" />
            <SingleTotalMetricCardInternal title="Total de Threads" value={totals.totalThreads} dataHistory={totals.threadHistory} dataKey="value" lineColor="var(--chart-color-cpu-core5)" />
        </>
    );
};
export default SystemSummaryWrapper;