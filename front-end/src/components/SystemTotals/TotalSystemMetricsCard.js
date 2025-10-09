// so-dashboard/front-end/src/components/SystemTotals/TotalSystemMetricsCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import styles from './TotalSystemMetricsCard.module.css';

// limites e urls da api
const MAX_HISTORY_POINTS_TOTALS = 30;
const API_URL_CPU = 'http://localhost:5000/api/cpu';
const API_URL_PROCESSES_FALLBACK = 'http://localhost:5000/api/processes';
const FETCH_INTERVAL_MS = 5000;

// card individual de métrica (valor + mini-gráfico)
const SingleTotalMetricCardInternal = ({ title, value, dataHistory, dataKey, lineColor, unit = '' }) => {
    const yMaxHistory = dataHistory?.length ? Math.max(...dataHistory.map(p => p[dataKey] || 0)) : 0;
    const yAxisDomain = [0, Math.max(10, Math.ceil(yMaxHistory * 1.1))];

    return (
        <Card title={title} className={styles.singleTotalCard}>
            <div className={styles.metricItemStandalone}>
                <span className={styles.metricValue}>{value}</span>
            </div>

            {dataHistory?.length > 0 && (
                <div className={styles.miniChartContainer}>
                    <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={dataHistory} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" horizontal vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="var(--text-secondary)"
                                fontSize="0.7rem"
                                tick={{ fill: 'var(--text-secondary)' }}
                                tickFormatter={(tick) => tick.slice(0, 5)}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke={lineColor || 'var(--text-secondary)'}
                                fontSize="0.7rem"
                                tick={{ fill: lineColor || 'var(--text-secondary)' }}
                                domain={yAxisDomain}
                                allowDecimals={false}
                                width={35}
                            />
                            <Tooltip
                                formatter={(val) => [`${val}${unit}`, title]}
                                contentStyle={{
                                    backgroundColor: 'var(--background-card)',
                                    border: '1px solid var(--border-medium)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)',
                                }}
                                itemStyle={{ color: lineColor || 'var(--text-primary)' }}
                                labelStyle={{ color: 'var(--text-secondary)' }}
                                cursor={{ stroke: lineColor || 'var(--border-soft)', strokeWidth: 1, fill: 'transparent' }}
                            />
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={lineColor || 'var(--text-primary)'}
                                strokeWidth={2}
                                dot={{ r: 1 }}
                                activeDot={{ r: 3 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
};

// wrapper: busca dados totais e mostra 2 cards (processos e threads)
const SystemSummaryWrapper = () => {
    const [systemTotals, setSystemTotals] = useState({
        totalProcesses: 0,
        totalThreads: 0,
        processHistory: [],
        threadHistory: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // busca dados da api (/api/cpu ou fallback /api/processes)
    const fetchData = useCallback(async () => {
        try {
            let currentTotalProcesses = 0;
            let currentTotalThreads = 0;

            const cpuApiResponse = await fetch(API_URL_CPU);
            if (cpuApiResponse.ok) {
                const cpuData = await cpuApiResponse.json();
                if (cpuData.total_processes !== undefined && cpuData.total_threads !== undefined) {
                    currentTotalProcesses = cpuData.total_processes;
                    currentTotalThreads = cpuData.total_threads;
                } else {
                    console.warn('/api/cpu sem totais, usando fallback /api/processes.');
                    const res = await fetch(API_URL_PROCESSES_FALLBACK);
                    if (!res.ok) throw new Error(`erro ao buscar processos: ${res.statusText}`);
                    const data = await res.json();
                    currentTotalProcesses = data.length;
                    currentTotalThreads = data.reduce((sum, p) => sum + (parseInt(p.threads, 10) || 0), 0);
                }
            } else {
                console.warn(`falha em ${API_URL_CPU}, usando fallback.`);
                const res = await fetch(API_URL_PROCESSES_FALLBACK);
                if (!res.ok) throw new Error(`erro ao buscar processos: ${res.statusText}`);
                const data = await res.json();
                currentTotalProcesses = data.length;
                currentTotalThreads = data.reduce((sum, p) => sum + (parseInt(p.threads, 10) || 0), 0);
            }

            setSystemTotals(prev => {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const newProc = { time: now, value: currentTotalProcesses };
                const newThr = { time: now, value: currentTotalThreads };
                return {
                    totalProcesses: currentTotalProcesses,
                    totalThreads: currentTotalThreads,
                    processHistory: [...prev.processHistory, newProc].slice(-MAX_HISTORY_POINTS_TOTALS),
                    threadHistory: [...prev.threadHistory, newThr].slice(-MAX_HISTORY_POINTS_TOTALS),
                };
            });
            setFetchError(null);
        } catch (err) {
            console.error('erro ao buscar métricas totais:', err);
            setFetchError(err.message);
        } finally {
            if (isLoading) setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);

    // busca inicial + atualização periódica
    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, FETCH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchData]);

    // estados de carregamento/erro
    if (isLoading && systemTotals.processHistory.length === 0) {
        return (
            <>
                <Card title="Total de Processos" className={styles.singleTotalCard}><p className={styles.loadingText}>carregando...</p></Card>
                <Card title="Total de Threads" className={styles.singleTotalCard}><p className={styles.loadingText}>carregando...</p></Card>
            </>
        );
    }
    if (fetchError) {
        return (
            <>
                <Card title="Total de Processos" className={styles.singleTotalCard}><p className={styles.errorText}>erro: {fetchError}</p></Card>
                <Card title="Total de Threads" className={styles.singleTotalCard}><p className={styles.errorText}>erro: {fetchError}</p></Card>
            </>
        );
    }

    // render principal
    return (
        <>
            <SingleTotalMetricCardInternal
                title="Total de Processos"
                value={systemTotals.totalProcesses}
                dataHistory={systemTotals.processHistory}
                dataKey="value"
                lineColor="var(--chart-color-cpu-core4)"
            />
            <SingleTotalMetricCardInternal
                title="Total de Threads"
                value={systemTotals.totalThreads}
                dataHistory={systemTotals.threadHistory}
                dataKey="value"
                lineColor="var(--chart-color-cpu-core5)"
            />
        </>
    );
};

export default SystemSummaryWrapper;
