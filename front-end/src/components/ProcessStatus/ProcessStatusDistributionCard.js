// so-dashboard/front-end/src/components/ProcessStatus/ProcessStatusDistributionCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // card base
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './ProcessStatusDistributionCard.module.css'; // estilos do card

// cores por status (devem casar com os valores do backend)
const STATUS_COLORS = {
    Rodando: 'var(--chart-color-cpu-core1)',
    Dormindo: 'var(--chart-color-cpu-core2)',
    Inativo: 'var(--chart-color-cpu-core4)',
    Zumbi: 'var(--chart-color-cpu-core6)',
    Parado: 'var(--chart-color-cpu-core5)',
    'Disco Sleep': 'var(--chart-color-cpu-core7)',
    Outro: 'var(--text-secondary)',
};

// endpoint e intervalo
const API_URL_PROCESSES = 'http://localhost:5000/api/processes';
const FETCH_INTERVAL_MS = 7000; // 7s

// card: distribuição de status de processos (pizza/rosca)
const ProcessStatusDistributionCard = () => {
    // dados do gráfico
    const [statusChartData, setStatusChartData] = useState([]);
    // estados auxiliares
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // busca processos e agrega por status
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(API_URL_PROCESSES);
            if (!response.ok) throw new Error(`erro http: ${response.status} - ${response.statusText}`);
            const processesData = await response.json();

            // contagem por status (fallback para 'Outro')
            const statusCounts = processesData.reduce((acc, p) => {
                const k = p.status || 'Outro';
                acc[k] = (acc[k] || 0) + 1;
                return acc;
            }, {});

            // formata para o piechart
            const chartDataFormatted = Object.keys(statusCounts).map((name) => ({
                name,
                value: statusCounts[name],
            }));

            setStatusChartData(chartDataFormatted);
            setFetchError(null);
        } catch (err) {
            console.error('erro ao buscar status de processos:', err);
            setFetchError(err.message);
        } finally {
            if (isLoading) setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);

    // carga inicial + atualização periódica
    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, FETCH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchData]);

    // util: rótulo percentual customizado
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent * 100 < 3) return null; // oculta rótulos muito pequenos
        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize="0.75rem"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // estados de carregamento/erro
    if (isLoading && statusChartData.length === 0) {
        return (
            <Card title="Distribuição de Status dos Processos">
                <p className={styles.loadingText}>carregando dados...</p>
            </Card>
        );
    }
    if (fetchError) {
        return (
            <Card title="Distribuição de Status dos Processos">
                <p className={styles.errorText}>erro ao carregar: {fetchError}</p>
            </Card>
        );
    }
    if (statusChartData.length === 0 && !isLoading) {
        return (
            <Card title="Distribuição de Status dos Processos">
                <p className={styles.loadingText}>sem dados de processos para exibir.</p>
            </Card>
        );
    }

    // render principal
    return (
        <Card title="Distribuição de Status dos Processos">
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={90}
                            innerRadius={45}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                        >
                            {statusChartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={STATUS_COLORS[entry.name] || STATUS_COLORS.Outro}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [value, name]}
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                border: '1px solid var(--border-medium)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)' }}
                        />
                        <Legend
                            iconType="circle"
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            wrapperStyle={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ProcessStatusDistributionCard;
