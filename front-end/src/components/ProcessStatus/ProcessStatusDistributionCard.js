// so-dashboard/front-end/src/components/ProcessStatus/ProcessStatusDistributionCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './ProcessStatusDistributionCard.module.css';

const STATUS_COLORS = {
    'Rodando': 'var(--chart-color-cpu-core1)', 'Dormindo': 'var(--chart-color-cpu-core2)',
    'Inativo (Idle)': 'var(--chart-color-cpu-core4)', 'Zumbi': 'var(--chart-color-cpu-core6)',
    'Parado': 'var(--chart-color-cpu-core5)', 'Disco Sleep': 'var(--chart-color-cpu-core7)',
    'Outro': 'var(--text-secondary)',
};

const ProcessStatusDistributionCard = () => {
    const [statusData, setStatusData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/processes');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            const processesData = await response.json();
            const counts = processesData.reduce((acc, proc) => {
                const status = proc.status || 'Outro'; acc[status] = (acc[status] || 0) + 1; return acc;
            }, {});
            const chartData = Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
            setStatusData(chartData); setError(null);
        } catch (e) {
            console.error("Erro status processos:", e); setError(e.message);
        } finally { if (loading) setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    useEffect(() => { fetchData(); const intervalId = setInterval(fetchData, 7000); return () => clearInterval(intervalId); }, [fetchData]);

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent * 100 < 3) return null; // Oculta para fatias muito pequenas
        return (<text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem" fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text>);
    };

    if (loading && statusData.length === 0) return <Card title="Status dos Processos"><p className={styles.loadingText}>Carregando...</p></Card>;
    if (error) return <Card title="Status dos Processos"><p className={styles.errorText}>Erro: {error}</p></Card>;
    if (statusData.length === 0 && !loading) return <Card title="Status dos Processos"><p className={styles.loadingText}>Sem dados de processos.</p></Card>;

    return (
        <Card title="Distribuição de Status dos Processos" >
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={90} innerRadius={45} fill="#8884d8" paddingAngle={2} dataKey="value" nameKey="name">
                            {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || STATUS_COLORS['Outro']} />))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ backgroundColor: 'var(--background-card)', border: `1px solid var(--border-medium)`, borderRadius: '4px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} />
                        <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: "0.85rem", lineHeight: "1.6", color: 'var(--text-secondary)' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};
export default ProcessStatusDistributionCard;