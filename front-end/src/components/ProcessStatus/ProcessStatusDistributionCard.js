// so-dashboard/front-end/src/components/ProcessStatus/ProcessStatusDistributionCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './ProcessStatusDistributionCard.module.css';
// import { FiPieChart } from 'react-icons/fi';

// VOLTANDO PARA AS CORES ORIGINAIS DEFINIDAS EM index.css
// Essas variáveis já devem estar definidas no seu :root em index.css
const STATUS_PIE_COLORS_ORIGINAL = [
    'var(--chart-color-cpu-core1)', // Amarelo-esverdeado
    'var(--chart-color-cpu-core2)', // Teal
    'var(--chart-color-cpu-core3)', // Rosa
    'var(--chart-color-cpu-core4)', // Azul claro
    'var(--chart-color-cpu-core5)', // Laranja claro
    'var(--chart-color-cpu-core6)', // Vermelho claro
    'var(--chart-color-cpu-core7)', // Roxo claro
    'var(--chart-color-cpu-core8)', // Verde menta claro
    'var(--accent-color-memory)',   // Azul da memória para mais uma opção
    'var(--text-secondary)',        // Cor para status "Outro" ou menos comuns
];


const ProcessStatusDistributionCard = () => {
    const [statusDistribution, setStatusDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Legenda não é interativa para mostrar/ocultar fatias neste componente

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/processes');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            const processesData = await response.json();

            const counts = processesData.reduce((acc, proc) => {
                const status = proc.status || 'Desconhecido';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            // Ordenar por contagem decrescente para que as cores mais proeminentes fiquem nas maiores fatias
            const sortedStatusNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

            const chartData = sortedStatusNames.map((key, index) => ({
                name: key,
                value: counts[key],
                // Atribuir cor do array STATUS_PIE_COLORS_ORIGINAL
                color: STATUS_PIE_COLORS_ORIGINAL[index % STATUS_PIE_COLORS_ORIGINAL.length],
            }));

            setStatusDistribution(chartData);
            setError(null);
        } catch (e) {
            console.error("Erro ao buscar dados de status dos processos:", e);
            setError(e.message);
        } finally {
            if (loading) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 7000);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const legendFormatter = (value, entry) => {
        // 'value' é o nome da série (status)
        return (
            <span style={{ color: 'var(--text-secondary)' }}>
                {value}
            </span>
        );
    };

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
        if (percent * 100 < 3) return null;

        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="var(--text-primary)" textAnchor="middle" dominantBaseline="central" fontSize="0.75rem" fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (loading && statusDistribution.length === 0) return <Card title="Distribuição de Status"><p className={styles.loadingText}>Carregando...</p></Card>;
    if (error) return <Card title="Distribuição de Status"><p className={styles.errorText}>Erro: {error}</p></Card>;
    if (statusDistribution.length === 0 && !loading) return <Card title="Distribuição de Status"><p className={styles.loadingText}>Sem dados de processos.</p></Card>;

    return (
        <Card title="Distribuição de Status dos Processos" /* icon={<FiPieChart/>} */ >
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={90}
                            innerRadius={50}
                            fill="#8884d8"
                            paddingAngle={1}
                            dataKey="value"
                            nameKey="name"
                            isAnimationActive={true}
                        >
                            {statusDistribution.map((entry) => (
                                // A cor agora vem do objeto 'entry' que preparamos
                                <Cell key={`cell-${entry.name}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [`${value} processos`, name]}
                            contentStyle={{ backgroundColor: 'var(--background-card)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)', borderRadius: '4px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)' }}
                        />
                        <Legend
                            formatter={legendFormatter}
                            iconType="line"
                            iconSize={10}
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            wrapperStyle={{ fontSize: "0.85rem", lineHeight: "1.6", paddingLeft: "10px" }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ProcessStatusDistributionCard;