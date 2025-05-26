// so-dashboard/front-end/src/components/MemoryUsage/MemoryUsageCard.js
import React from 'react';
import Card from '../Card/Card';
import ProgressBar from '../ProgressBar/ProgressBar';
import { mockMemoryData } from '../../data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './MemoryUsageCard.module.css';
// import { FiDatabase } from 'react-icons/fi';

// Função para formatar para a unidade mais apropriada (MB ou GB)
const formatBytesToAppropriateUnit = (bytesInMB, decimals = 1) => {
    if (bytesInMB === 0) return '0 MB';
    if (bytesInMB < 1024) {
        return `${bytesInMB.toFixed(decimals)} MB`;
    }
    const bytesInGB = bytesInMB / 1024;
    return `${bytesInGB.toFixed(decimals)} GB`;
};

const MemoryUsageCard = () => {
    const { totalMB, usedMB, history } = mockMemoryData;
    const freeMB = totalMB - usedMB;
    const usedPercentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;

    const chartHistory = history.map(item => ({
        time: item.time,
        usedGB: parseFloat((item.usedMB / 1024).toFixed(2))
    }));

    return (
        <Card title="Uso de Memória" /* icon={<FiDatabase size={18}/>} */>
            <div className={styles.memorySection}>
                <div className={styles.labelWithValue}>
                    <span className={styles.labelText}>Usada:</span>
                    <span className={styles.valueText}>
                        {formatBytesToAppropriateUnit(usedMB)} ({usedPercentage.toFixed(1)}%)
                    </span>
                </div>
                <ProgressBar
                    value={usedPercentage}
                    height="12px"
                    color="var(--accent-color-memory)"
                />
            </div>
            <div className={styles.memoryDetails}>
                <span className={styles.detailItem}>Total: {formatBytesToAppropriateUnit(totalMB)}</span>
                <span className={styles.detailItem}>Livre: {formatBytesToAppropriateUnit(freeMB)}</span>
            </div>

            <div className={styles.chartTitle}>Histórico de Uso (GB)</div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartHistory} margin={{ top: 5, right: 5, left: -25, bottom: 40 }}>
                        <defs>
                            <linearGradient id="colorUsedMem" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent-color-memory)" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="var(--accent-color-memory)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.75rem" />
                        <YAxis
                            stroke="var(--text-secondary)"
                            fontSize="0.75rem"
                            unit=" GB"
                            domain={[0, 'auto']} // ou domain={[0, Math.ceil(totalMB / 1024)]}
                        />
                        <Tooltip
                            formatter={(value, name, props) => [`${value.toFixed(2)} GB`, "Memória Usada"]}
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'rgba(83, 189, 235, 0.08)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            wrapperStyle={{
                                fontSize: "0.8rem",
                                paddingTop: "15px",
                                color: 'var(--text-secondary)'
                            }}
                            iconSize={10}
                        />
                        <Area
                            type="monotone"
                            dataKey="usedGB"
                            name="Memória Usada"
                            stroke="var(--accent-color-memory)"
                            fillOpacity={1}
                            fill="url(#colorUsedMem)"
                            strokeWidth={2}
                            activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent-color-memory)' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default MemoryUsageCard;