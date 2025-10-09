import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // componente base de card
import ProgressBar from '../ProgressBar/ProgressBar'; // barra de progresso
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import styles from './CpuUsageCard.module.css'; // estilos css module

// cores para as linhas do gráfico
const CORE_CHART_COLORS = [
    'var(--chart-color-cpu-core1)', 'var(--chart-color-cpu-core2)',
    'var(--chart-color-cpu-core3)', 'var(--chart-color-cpu-core4)',
    'var(--chart-color-cpu-core5)', 'var(--chart-color-cpu-core6)',
    'var(--chart-color-cpu-core7)', 'var(--chart-color-cpu-core8)',
];

// número máximo de pontos no histórico
const MAX_HISTORY_POINTS = 60;

// endpoint da api
const API_URL_CPU = 'http://localhost:5000/api/cpu';
// intervalo de atualização em ms
const FETCH_INTERVAL_MS = 5000;

// componente principal de uso de cpu
const CpuUsageCard = () => {
    // estado da cpu
    const [cpuState, setCpuState] = useState({
        overallUsage: 0,
        overallIdle: 100,
        cores: [],
        history: [],
        numberOfCores: 0,
    });

    // estados auxiliares
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [lineVisibility, setLineVisibility] = useState({});

    // inicializa visibilidade das linhas do gráfico
    useEffect(() => {
        if (cpuState.cores && cpuState.cores.length > 0) {
            const currentVisibility = { ...lineVisibility };
            let changed = false;

            if (!currentVisibility.hasOwnProperty('overall')) {
                currentVisibility.overall = true;
                changed = true;
            }

            cpuState.cores.forEach(core => {
                const key = `core${core.id}`;
                if (!currentVisibility.hasOwnProperty(key)) {
                    currentVisibility[key] = true;
                    changed = true;
                }
            });

            if (changed) setLineVisibility(currentVisibility);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpuState.cores]);

    // busca dados da cpu da api
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(API_URL_CPU);
            if (!response.ok) throw new Error(`erro http: ${response.status}`);
            const data = await response.json();

            setCpuState(prev => {
                const currentTime = new Date().toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });

                const newPoint = { time: currentTime, overall: data.overall_usage_percent || 0 };
                (data.cores || []).forEach(core => {
                    newPoint[`core${core.id}`] = core.usage_percent || 0;
                });

                const updatedHistory = [...prev.history, newPoint].slice(-MAX_HISTORY_POINTS);

                return {
                    overallUsage: data.overall_usage_percent || 0,
                    overallIdle: data.overall_idle_percent || 0,
                    cores: data.cores || [],
                    history: updatedHistory,
                    numberOfCores: data.number_of_cores || 0,
                };
            });

            setFetchError(null);
        } catch (error) {
            console.error('erro ao buscar dados da cpu:', error);
            setFetchError(error.message);
        } finally {
            if (isLoading) setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);

    // atualiza dados periodicamente
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, FETCH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchData]);

    // alterna visibilidade das linhas ao clicar na legenda
    const handleLegendClick = useCallback((legendItem) => {
        const { dataKey } = legendItem;
        setLineVisibility(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    }, []);

    // formata legenda do gráfico
    const legendFormatter = (value, entry) => {
        const { dataKey } = entry;
        const hidden = lineVisibility[dataKey] === false;
        const style = {
            color: hidden ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)',
            textDecoration: hidden ? 'line-through' : 'none',
        };
        return <span style={style}>{value}</span>;
    };

    // renderizações condicionais
    if (isLoading && cpuState.history.length === 0) {
        return (
            <Card title="Uso de CPU">
                <p className={styles.loadingText}>carregando dados da cpu...</p>
            </Card>
        );
    }

    if (fetchError) {
        return (
            <Card title="Uso de CPU">
                <p className={styles.errorText}>erro ao carregar dados: {fetchError}</p>
            </Card>
        );
    }

    // garante visibilidade pronta
    const isReady = Object.keys(lineVisibility).length > 0 &&
        lineVisibility.hasOwnProperty('overall') &&
        (cpuState.cores.length === 0 ||
            cpuState.cores.every(core => lineVisibility.hasOwnProperty(`core${core.id}`)));

    if (!isReady && cpuState.history.length > 0) {
        return (
            <Card title="Uso de CPU">
                <p className={styles.loadingText}>inicializando gráfico de cpu...</p>
            </Card>
        );
    }

    // render principal
    return (
        <Card title="Uso de CPU">
            {/* estatísticas gerais */}
            <div className={styles.cpuOverallStats}>
                <div className={styles.cpuOverallItem}>
                    <span className={styles.overallLabel}>uso cpu:</span>
                    <span className={styles.overallValue}>
                        {(cpuState.overallUsage || 0).toFixed(1)}%
                    </span>
                    <ProgressBar
                        value={cpuState.overallUsage || 0}
                        height="10px"
                        color="var(--chart-color-cpu-core4)"
                    />
                </div>
                <div className={styles.cpuOverallItem}>
                    <span className={styles.overallLabel}>cpu ociosa:</span>
                    <span className={styles.overallValue}>
                        {(cpuState.overallIdle || 0).toFixed(1)}%
                    </span>
                    <ProgressBar
                        value={cpuState.overallIdle || 0}
                        height="10px"
                        color="var(--text-secondary)"
                    />
                </div>
            </div>

            {/* uso por core */}
            {cpuState.cores.map((core, index) => (
                <div key={core.id || `core-${index}`} className={styles.cpuSection}>
                    <div className={styles.labelWithValue}>
                        <span className={styles.labelText}>{core.name || `Core ${core.id}`}:</span>
                        <span className={styles.valueText}>{(core.usage_percent || 0).toFixed(1)}%</span>
                    </div>
                    <ProgressBar
                        value={core.usage_percent || 0}
                        height="8px"
                        color={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]}
                    />
                </div>
            ))}

            {/* gráfico histórico */}
            <div className={styles.chartTitle}>histórico de uso de cpu (%)</div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={cpuState.history} margin={{ top: 5, right: 20, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                        <XAxis
                            dataKey="time"
                            stroke="var(--text-secondary)"
                            fontSize="0.8rem"
                            tick={{ fill: 'var(--text-secondary)' }}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            fontSize="0.8rem"
                            unit="%"
                            domain={[0, 100]}
                            tick={{ fill: 'var(--text-secondary)' }}
                            width={35}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)' }}
                            cursor={{ fill: 'rgba(134,150,160,0.08)' }}
                        />
                        <Legend
                            onClick={handleLegendClick}
                            formatter={legendFormatter}
                            iconType="line"
                            verticalAlign="bottom"
                            wrapperStyle={{ fontSize: '0.8rem', paddingTop: '15px', cursor: 'pointer' }}
                            iconSize={10}
                        />
                        <Line
                            type="monotone"
                            dataKey="overall"
                            name="CPU Geral"
                            stroke="#FFFFFF"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5 }}
                            hide={lineVisibility.overall === false}
                            isAnimationActive={false}
                        />
                        {cpuState.cores.map((core, index) => (
                            <Line
                                key={`core-line-${core.id || index}`}
                                type="monotone"
                                dataKey={`core${core.id}`}
                                name={core.name || `Core ${core.id}`}
                                stroke={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                hide={lineVisibility[`core${core.id}`] === false}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CpuUsageCard;