// so-dashboard/front-end/src/components/CpuUsage/CpuUsageCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import ProgressBar from '../ProgressBar/ProgressBar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './CpuUsageCard.module.css';
// import { FiCpu } from 'react-icons/fi'; 

const CORE_CHART_COLORS = [
    'var(--chart-color-cpu-core1)', 'var(--chart-color-cpu-core2)',
    'var(--chart-color-cpu-core3)', 'var(--chart-color-cpu-core4)',
    'var(--chart-color-cpu-core5)', 'var(--chart-color-cpu-core6)',
    'var(--chart-color-cpu-core7)', 'var(--chart-color-cpu-core8)',
];
const MAX_HISTORY_POINTS = 60;

const CpuUsageCard = () => {
    const [cpuState, setCpuState] = useState({
        overallUsage: 0,
        cores: [],
        history: [],
        numberOfCores: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lineVisibility, setLineVisibility] = useState({});

    useEffect(() => {
        if (cpuState.cores && cpuState.cores.length > 0) {
            const newVisibility = { overall: true };
            cpuState.cores.forEach(core => {
                newVisibility[`core${core.id}`] = lineVisibility[`core${core.id}`] !== undefined
                    ? lineVisibility[`core${core.id}`]
                    : true;
            });
            if (JSON.stringify(newVisibility) !== JSON.stringify(lineVisibility)) {
                setLineVisibility(newVisibility);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpuState.cores]);


    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/cpu');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            const data = await response.json();

            setCpuState(prevState => {
                const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const newHistoryPoint = { time: currentTime, overall: data.overall_usage_percent || 0 };

                (data.cores || []).forEach(core => {
                    newHistoryPoint[`core${core.id}`] = core.usage_percent || 0;
                });

                const updatedHistory = [...prevState.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

                return {
                    overallUsage: data.overall_usage_percent || 0,
                    cores: data.cores || [],
                    history: updatedHistory,
                    numberOfCores: data.number_of_cores || 0,
                };
            });
            setError(null);
        } catch (e) {
            console.error("Erro ao buscar dados de CPU:", e);
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

    const handleLegendClick = useCallback((payloadFromLegend) => {
        const { dataKey } = payloadFromLegend;
        setLineVisibility(prevVisibility => ({
            ...prevVisibility,
            [dataKey]: !prevVisibility[dataKey]
        }));
    }, []);

    // Formatador de legenda simplificado, como no MemoryUsageCard
    const legendFormatter = (value, entry) => {
        const { dataKey } = entry;
        const isInvisible = lineVisibility[dataKey] === false;
        return (
            <span style={{
                color: isInvisible ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)',
                textDecoration: isInvisible ? 'line-through' : 'none',
                // O cursor e marginRight são aplicados pelo wrapperStyle da Legend
            }}>
                {value}
            </span>
        );
    };

    if (loading && cpuState.history.length === 0) return <Card title="Uso de CPU"><p className={styles.loadingText}>Carregando dados da CPU...</p></Card>;
    if (error) return <Card title="Uso de CPU"><p className={styles.errorText}>Erro ao carregar: {error}</p></Card>;

    const allVisibilityKeysSet = cpuState.cores.every(core => lineVisibility.hasOwnProperty(`core${core.id}`)) && lineVisibility.hasOwnProperty('overall');
    if (!allVisibilityKeysSet && cpuState.cores.length > 0 && Object.keys(lineVisibility).length > 0) { // Adicionado Object.keys(lineVisibility).length > 0 para evitar loop na primeira renderização
        return <Card title="Uso de CPU"><p className={styles.loadingText}>Inicializando gráfico...</p></Card>;
    }

    return (
        <Card title="Uso de CPU" /* icon={<FiCpu size={18} />} */ >
            <div className={styles.cpuSection}>
                <div className={styles.labelWithValue}>
                    <span className={styles.labelText}>Geral:</span>
                    <span className={styles.valueText}>{(cpuState.overallUsage || 0).toFixed(1)}%</span>
                </div>
                <ProgressBar value={cpuState.overallUsage || 0} height="12px" color="var(--text-secondary)" />
            </div>

            {cpuState.cores.map((core, index) => (
                <div key={core.id} className={styles.cpuSection}>
                    <div className={styles.labelWithValue}>
                        <span className={styles.labelText}>{core.name || `Core ${core.id}`}:</span>
                        <span className={styles.valueText}>{(core.usage_percent || 0).toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={core.usage_percent || 0} height="8px" color={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]} />
                </div>
            ))}

            <div className={styles.chartTitle}>Histórico de Uso (%)</div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                        data={cpuState.history}
                        margin={{
                            top: 5,
                            right: 20,
                            left: -20,
                            bottom: 40
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.8rem" tick={{ fill: 'var(--text-secondary)' }} />
                        <YAxis stroke="var(--text-secondary)" fontSize="0.8rem" unit="%" domain={[0, 100]} tick={{ fill: 'var(--text-secondary)' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--background-card)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)', borderRadius: '4px' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} cursor={{ fill: 'rgba(134,150,160,0.08)' }} />
                        <Legend
                            onClick={handleLegendClick}
                            formatter={legendFormatter} // Usando o formatador simplificado
                            verticalAlign="bottom"
                            wrapperStyle={{ fontSize: "0.8rem", paddingTop: "15px", cursor: 'pointer' }} // cursor aqui
                            iconSize={10}
                            iconType="line" // <<<<<<<<<<<<<< MUDANÇA AQUI para 'line'
                        />

                        <Line type="monotone" dataKey="overall" name="CPU Geral" stroke="#FFFFFF" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#FFFFFF' }} hide={lineVisibility.overall === false} isAnimationActive={false} />
                        {cpuState.cores.map((core, index) => (
                            <Line key={`core-line-${core.id}`} type="monotone" dataKey={`core${core.id}`} name={core.name || `Core ${core.id}`} stroke={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: CORE_CHART_COLORS[index % CORE_CHART_COLORS.length] }} hide={lineVisibility[`core${core.id}`] === false} isAnimationActive={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CpuUsageCard;