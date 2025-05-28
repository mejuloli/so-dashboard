// so-dashboard/front-end/src/components/MemoryUsage/MemoryUsageCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import ProgressBar from '../ProgressBar/ProgressBar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './MemoryUsageCard.module.css';

const MAX_HISTORY_POINTS = 60;
const formatGb = (gbValue, decimals = 1) => gbValue !== undefined && gbValue !== null && !isNaN(gbValue) ? `${parseFloat(gbValue).toFixed(decimals)} GB` : '0.0 GB';

const MemoryUsageCard = () => {
  const [memoryState, setMemoryState] = useState({
    ram: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0, free_percent: 100 },
    swap: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0, free_percent: 100 },
    history: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lineVisibility, setLineVisibility] = useState({ ramUsedGB: true, swapUsedGB: true });

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/memory');
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      const data = await response.json();
      setMemoryState(prevState => {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const ram = data.ram || prevState.ram;
        const swap = data.swap || prevState.swap;
        if (ram.total_gb > 0 && ram.usage_percent !== undefined && ram.free_percent === undefined) { ram.free_percent = parseFloat((100 - ram.usage_percent).toFixed(1)); }
        else if (ram.free_percent === undefined) { ram.free_percent = (ram.total_gb > 0 && ram.free_gb !== undefined) ? parseFloat((ram.free_gb / ram.total_gb * 100).toFixed(1)) : 0; }
        if (swap.total_gb > 0 && swap.usage_percent !== undefined && swap.free_percent === undefined) { swap.free_percent = parseFloat((100 - swap.usage_percent).toFixed(1)); }
        else if (swap.free_percent === undefined) { swap.free_percent = (swap.total_gb > 0 && swap.free_gb !== undefined) ? parseFloat((swap.free_gb / swap.total_gb * 100).toFixed(1)) : 0; }
        const newHistoryPoint = { time: currentTime, ramUsedGB: ram.used_gb || 0, swapUsedGB: swap.used_gb || 0, };
        const updatedHistory = [...prevState.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);
        return { ram, swap, history: updatedHistory };
      });
      setError(null);
    } catch (e) {
      console.error("Memória Fetch Error:", e); setError(e.message);
    } finally { if (loading) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => { fetchData(); const intervalId = setInterval(fetchData, 5000); return () => clearInterval(intervalId); }, [fetchData]);

  const handleLegendClick = useCallback((payloadFromLegend) => {
    const { dataKey } = payloadFromLegend;
    setLineVisibility(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);

  const legendFormatter = (value, entry) => {
    const { dataKey } = entry;
    const isInvisible = lineVisibility[dataKey] === false;
    return (<span style={{ color: isInvisible ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)', textDecoration: isInvisible ? 'line-through' : 'none', }}> {value} </span>);
  };

  if (loading && memoryState.history.length === 0) return <Card title="Uso de Memória"><p className={styles.loadingText}>Carregando...</p></Card>;
  if (error) return <Card title="Uso de Memória"><p className={styles.errorText}>Erro: {error}</p></Card>;
  const yAxisDomainMax = Math.max(0.1, Math.ceil((memoryState.ram.total_gb || 0) * 1.1), Math.ceil(Math.max(0, ...memoryState.history.map(p => p.ramUsedGB), ...memoryState.history.map(p => p.swapUsedGB)) * 1.1));

  return (
    <Card title="Uso de Memória e Swap">
      <div className={styles.memoryTypeSection}>
        <h3 className={styles.memoryTypeTitle}>RAM</h3>
        <div className={styles.memoryInfoBlock}><div className={styles.memoryValueRow}><span>Usada:</span> <span>{formatGb(memoryState.ram.used_gb)}</span></div><div className={styles.memoryValueRow}><span>Livre:</span> <span>{formatGb(memoryState.ram.free_gb)}</span></div></div>
        <ProgressBar value={memoryState.ram.usage_percent || 0} height="10px" color="var(--accent-color-memory)" />
        <div className={styles.memoryPercentRow}><span>({(memoryState.ram.usage_percent || 0).toFixed(1)}% Usada)</span><span>({(memoryState.ram.free_percent || 0).toFixed(1)}% Livre)</span></div>
        <div className={styles.memoryTotal}>Total: {formatGb(memoryState.ram.total_gb)}</div>
      </div>
      {memoryState.swap && memoryState.swap.total_gb > 0 && (
        <div className={styles.memoryTypeSection}>
          <h3 className={styles.memoryTypeTitle}>Swap</h3>
          <div className={styles.memoryInfoBlock}><div className={styles.memoryValueRow}><span>Usada:</span> <span>{formatGb(memoryState.swap.used_gb)}</span></div><div className={styles.memoryValueRow}><span>Livre:</span> <span>{formatGb(memoryState.swap.free_gb)}</span></div></div>
          <ProgressBar value={memoryState.swap.usage_percent || 0} height="10px" color="var(--chart-color-cpu-core5)" />
          <div className={styles.memoryPercentRow}><span>({(memoryState.swap.usage_percent || 0).toFixed(1)}% Usada)</span><span>({(memoryState.swap.free_percent || 0).toFixed(1)}% Livre)</span></div>
          <div className={styles.memoryTotal}>Total: {formatGb(memoryState.swap.total_gb)}</div>
        </div>
      )}
      <div className={styles.chartTitle}>Histórico de Uso (GB)</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={memoryState.history} margin={{ top: 5, right: 15, left: 15, bottom: 40 }}>
            <defs><linearGradient id="colorRamUsedGrad" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="var(--accent-color-memory)" stopOpacity={0.6} /> <stop offset="95%" stopColor="var(--accent-color-memory)" stopOpacity={0.05} /> </linearGradient><linearGradient id="colorSwapUsedGrad" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="var(--chart-color-cpu-core5)" stopOpacity={0.6} /> <stop offset="95%" stopColor="var(--chart-color-cpu-core5)" stopOpacity={0.05} /> </linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.8rem" tick={{ fill: 'var(--text-secondary)' }} />
            <YAxis stroke="var(--text-secondary)" fontSize="0.8rem" unit=" GB" tick={{ fill: 'var(--text-secondary)' }} domain={[0, yAxisDomainMax]} allowDecimals={true} tickFormatter={(tick) => tick.toFixed(1)} width={45} />
            <Tooltip formatter={(value, name) => [`${parseFloat(value).toFixed(2)} GB`, name]} contentStyle={{ backgroundColor: 'var(--background-card)', border: `1px solid var(--border-medium)`, borderRadius: '4px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} cursor={{ fill: 'rgba(134,150,160,0.08)' }} />
            <Legend onClick={handleLegendClick} formatter={legendFormatter} iconType="line" verticalAlign="bottom" wrapperStyle={{ fontSize: "0.8rem", paddingTop: "15px", cursor: 'pointer' }} iconSize={10} />
            <Area type="monotone" dataKey="ramUsedGB" name="RAM Usada" stroke="var(--accent-color-memory)" fill="url(#colorRamUsedGrad)" strokeWidth={2} activeDot={{ r: 4 }} hide={lineVisibility.ramUsedGB === false} isAnimationActive={false} />
            {memoryState.swap && memoryState.swap.total_gb > 0 && (<Area type="monotone" dataKey="swapUsedGB" name="Swap Usada" stroke="var(--chart-color-cpu-core5)" fill="url(#colorSwapUsedGrad)" strokeWidth={2} activeDot={{ r: 4 }} hide={lineVisibility.swapUsedGB === false} isAnimationActive={false} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
export default MemoryUsageCard;