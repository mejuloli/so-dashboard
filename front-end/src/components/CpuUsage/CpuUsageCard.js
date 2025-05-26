// so-dashboard/front-end/src/components/CpuUsage/CpuUsageCard.js
import React, { useState, useCallback } from 'react';
import Card from '../Card/Card';
import ProgressBar from '../ProgressBar/ProgressBar';
import { mockCpuData } from '../../data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './CpuUsageCard.module.css';
// Descomente se for usar ícones e tiver react-icons instalado
// import { FiCpu } from 'react-icons/fi'; 

// Array de cores DISTINTAS para os cores no gráfico e barras de progresso
// Usando as variáveis CSS definidas em index.css
const CORE_CHART_COLORS = [
    'var(--chart-color-cpu-core1)',
    'var(--chart-color-cpu-core2)',
    'var(--chart-color-cpu-core3)',
    'var(--chart-color-cpu-core4)',
    'var(--chart-color-cpu-core5)',
    'var(--chart-color-cpu-core6)',
    'var(--chart-color-cpu-core7)',
    'var(--chart-color-cpu-core8)',
];

const CpuUsageCard = () => {
    const { overallUsage, cores, history } = mockCpuData;

    // Estado para controlar a visibilidade das linhas no gráfico
    const initialVisibilityState = {
        overall: true, // Visibilidade para a linha "CPU Geral"
        ...cores.reduce((acc, core) => {
            acc[`core${core.id}`] = true; // Visibilidade para cada linha de core
            return acc;
        }, {}),
    };
    const [visibility, setVisibility] = useState(initialVisibilityState);

    // Handler para o clique na legenda
    const handleLegendClick = useCallback((eventPayload) => {
        const { dataKey } = eventPayload;
        // console.log("Legend clicked. DataKey:", dataKey, "Payload:", eventPayload); // Para depuração

        setVisibility(prevVisibility => {
            const newVisibility = { ...prevVisibility, [dataKey]: !prevVisibility[dataKey] };
            // console.log("Previous visibility:", prevVisibility); // Para depuração
            // console.log("New visibility:", newVisibility);       // Para depuração
            return newVisibility;
        });
    }, []); // A dependência vazia [] está correta


    return (
        <Card title="Uso de CPU" /* icon={<FiCpu size={18} />} */ >
            <div className={styles.cpuSection}>
                <div className={styles.labelWithValue}>
                    <span className={styles.labelText}>Geral:</span>
                    <span className={styles.valueText}>{overallUsage.toFixed(1)}%</span>
                </div>
                <ProgressBar
                    value={overallUsage}
                    height="12px"
                    color="var(--text-secondary)"
                />
            </div>

            {cores.map((core, index) => (
                <div key={core.id} className={styles.cpuSection}>
                    <div className={styles.labelWithValue}>
                        <span className={styles.labelText}>{core.name}:</span>
                        <span className={styles.valueText}>{core.usage.toFixed(1)}%</span>
                    </div>
                    <ProgressBar
                        value={core.usage}
                        height="8px"
                        color={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]}
                    />
                </div>
            ))}

            <div className={styles.chartTitle}>Histórico de Uso (%)</div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.75rem" />
                        <YAxis
                            stroke="var(--text-secondary)"
                            fontSize="0.75rem"
                            unit="%"
                            domain={[0, 100]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'rgba(134, 150, 160, 0.08)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            wrapperStyle={{
                                fontSize: "0.8rem",
                                paddingTop: "15px",
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                            iconSize={10}
                            onClick={handleLegendClick}
                        />

                        {/* A renderização condicional (visibility.overall && ...) já cuida de não montar o componente Line.
                A prop 'hide' é uma instrução adicional para o Recharts. */}
                        <Line
                            type="monotone"
                            dataKey="overall"
                            name="CPU Geral"
                            stroke="#FFFFFF"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 0, fill: '#FFFFFF' }}
                            hide={!visibility.overall} // Adicionada propriedade hide
                        />

                        {cores.map((core, index) => (
                            // A renderização condicional (visibility[...] && ...) já cuida de não montar o componente Line.
                            <Line
                                key={`core-line-${core.id}`}
                                type="monotone"
                                dataKey={`core${core.id}`}
                                name={core.name}
                                stroke={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]}
                                strokeWidth={1.5}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: CORE_CHART_COLORS[index % CORE_CHART_COLORS.length] }}
                                hide={!visibility[`core${core.id}`]} // Adicionada propriedade hide
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CpuUsageCard;