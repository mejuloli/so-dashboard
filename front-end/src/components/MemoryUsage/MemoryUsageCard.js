// so-dashboard/front-end/src/components/MemoryUsage/MemoryUsageCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card';
import ProgressBar from '../ProgressBar/ProgressBar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './MemoryUsageCard.module.css';
// import { FiDatabase } from 'react-icons/fi';

const MAX_HISTORY_POINTS = 60;

const formatGb = (gbValue, decimals = 1) => {
    if (gbValue === undefined || gbValue === null || isNaN(gbValue)) return '0.0 GB';
    return `${parseFloat(gbValue).toFixed(decimals)} GB`;
};

const MemoryUsageCard = () => {
  const [memoryState, setMemoryState] = useState({
    ram: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 },
    swap: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 },
    history: [], 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // O estado de visibilidade deve usar os dataKeys das Areas como chaves
  const [lineVisibility, setLineVisibility] = useState({ 
    ramUsedGB: true, // Corresponde ao dataKey da Area de RAM
    swapUsedGB: true // Corresponde ao dataKey da Area de Swap
  });


  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/memory');
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      const data = await response.json(); 

      setMemoryState(prevState => {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const ramData = data.ram || { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 };
        const swapData = data.swap || { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 };

        const newHistoryPoint = {
          time: currentTime,
          ramUsedGB: parseFloat((ramData.used_gb || 0).toFixed(2)),
          swapUsedGB: parseFloat((swapData.used_gb || 0).toFixed(2)),
        };

        const updatedHistory = [...prevState.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

        return {
          ram: ramData,
          swap: swapData,
          history: updatedHistory,
        };
      });
      setError(null);
    } catch (e) {
      console.error("Erro ao buscar dados de memória:", e);
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
  
  // handleLegendClick agora usa o dataKey diretamente
  const handleLegendClick = useCallback((payloadFromLegend) => {
    const { dataKey } = payloadFromLegend; // dataKey será 'ramUsedGB' ou 'swapUsedGB'
    setLineVisibility(prev => ({ 
        ...prev, 
        [dataKey]: !prev[dataKey] // Alterna a visibilidade para o dataKey específico
    }));
  }, []);


  // legendFormatter para estilizar o texto da legenda
  const legendFormatter = (value, entry) => {
    const { dataKey } = entry; // dataKey da linha/área
    const isInvisible = lineVisibility[dataKey] === false; // Verifica nosso estado de visibilidade

    return (
      <span style={{
        color: isInvisible ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)',
        textDecoration: isInvisible ? 'line-through' : 'none',
        // cursor é aplicado no wrapperStyle da Legend
      }}>
        {value} {/* 'value' aqui é o 'name' da <Area /> (ex: "RAM Usada") */}
      </span>
    );
  };

  if (loading && memoryState.history.length === 0) return <Card title="Uso de Memória"><p className={styles.loadingText}>Carregando dados de memória...</p></Card>;
  if (error) return <Card title="Uso de Memória"><p className={styles.errorText}>Erro ao carregar: {error}</p></Card>;

  const yAxisDomainMax = Math.max(
    0.1, 
    Math.ceil((memoryState.ram.total_gb || 0) * 1.1), 
    Math.ceil(Math.max(0, ...memoryState.history.map(p => p.ramUsedGB), ...memoryState.history.map(p => p.swapUsedGB)) * 1.1) 
  );


  return (
    <Card title="Uso de Memória" /* icon={<FiDatabase size={18}/>} */>
      <div className={styles.memoryTypeSection}>
        <h3 className={styles.memoryTypeTitle}>RAM</h3>
        <div className={styles.memorySection}>
          <div className={styles.labelWithValue}>
            <span className={styles.labelText}>Usada:</span>
            <span className={styles.valueText}> {formatGb(memoryState.ram.used_gb)} ({(memoryState.ram.usage_percent || 0).toFixed(1)}%) </span>
          </div>
          <ProgressBar value={memoryState.ram.usage_percent || 0} height="12px" color="var(--accent-color-memory)" />
        </div>
        <div className={styles.memoryDetails}>
          <span className={styles.detailItem}>Total: {formatGb(memoryState.ram.total_gb)}</span>
          <span className={styles.detailItem}>Livre: {formatGb(memoryState.ram.free_gb)}</span>
        </div>
      </div>

      {memoryState.swap && memoryState.swap.total_gb > 0 && (
        <div className={styles.memoryTypeSection}>
          <h3 className={styles.memoryTypeTitle}>Swap</h3>
          <div className={styles.memorySection}>
            <div className={styles.labelWithValue}>
              <span className={styles.labelText}>Usada:</span>
              <span className={styles.valueText}> {formatGb(memoryState.swap.used_gb)} ({(memoryState.swap.usage_percent || 0).toFixed(1)}%) </span>
            </div>
            <ProgressBar value={memoryState.swap.usage_percent || 0} height="12px" color="var(--chart-color-cpu-core5)" />
          </div>
          <div className={styles.memoryDetails}>
            <span className={styles.detailItem}>Total: {formatGb(memoryState.swap.total_gb)}</span>
            <span className={styles.detailItem}>Livre: {formatGb(memoryState.swap.free_gb)}</span>
          </div>
        </div>
      )}

      <div className={styles.chartTitle}>Histórico de Uso (GB)</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={memoryState.history} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}> {/* Ajustada margem esquerda */}
            <defs>
              <linearGradient id="colorRamUsedGrad" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="var(--accent-color-memory)" stopOpacity={0.6} /> <stop offset="95%" stopColor="var(--accent-color-memory)" stopOpacity={0.05} /> </linearGradient>
              <linearGradient id="colorSwapUsedGrad" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="var(--chart-color-cpu-core5)" stopOpacity={0.6} /> <stop offset="95%" stopColor="var(--chart-color-cpu-core5)" stopOpacity={0.05} /> </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.8rem" tick={{ fill: 'var(--text-secondary)' }} />
            <YAxis stroke="var(--text-secondary)" fontSize="0.8rem" unit=" GB" tick={{ fill: 'var(--text-secondary)' }} domain={[0, yAxisDomainMax]} allowDecimals={true} tickFormatter={(tick) => tick.toFixed(1)} width={45} /> {/* Adicionado width para eixo Y */}
            <Tooltip
              formatter={(value, name, props) => { 
                const formattedValue = `${parseFloat(value).toFixed(2)} GB`;
                return [formattedValue, name]; // 'name' vem da prop 'name' da <Area/>
              }}
              contentStyle={{ backgroundColor: 'var(--background-card)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)', borderRadius: '4px' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              labelStyle={{ color: 'var(--text-secondary)' }}
              cursor={{ fill: 'rgba(134,150,160,0.08)' }}
            />
            <Legend 
              onClick={handleLegendClick} 
              formatter={legendFormatter} // Nosso formatador de texto
              verticalAlign="bottom" 
              wrapperStyle={{ fontSize: "0.8rem", paddingTop: "15px", cursor: 'pointer' }} 
              iconSize={10}
              iconType="line" // Define o ícone como uma linha
            />

            {/* As Areas agora usam o estado de lineVisibility com seus dataKeys */}
            <Area 
                type="monotone" 
                dataKey="ramUsedGB" // Esta é a chave usada por handleLegendClick e lineVisibility
                name="RAM Usada"   // Este é o 'value' passado para legendFormatter e 'name' para Tooltip
                stroke="var(--accent-color-memory)" 
                fillOpacity={1} 
                fill="url(#colorRamUsedGrad)" 
                strokeWidth={2.5} 
                activeDot={{ r: 5, strokeWidth: 1, stroke: 'var(--text-primary)', fill: 'var(--accent-color-memory)' }} 
                hide={lineVisibility.ramUsedGB === false} // Controla a visibilidade
                isAnimationActive={false} />
            
            {memoryState.swap && memoryState.swap.total_gb > 0 && (
              <Area 
                type="monotone" 
                dataKey="swapUsedGB" // Esta é a chave usada por handleLegendClick e lineVisibility
                name="Swap Usada"    // Este é o 'value' passado para legendFormatter e 'name' para Tooltip
                stroke="var(--chart-color-cpu-core5)" 
                fillOpacity={1} 
                fill="url(#colorSwapUsedGrad)" 
                strokeWidth={2.5} 
                activeDot={{ r: 5, strokeWidth: 1, stroke: 'var(--text-primary)', fill: 'var(--chart-color-cpu-core5)' }} 
                hide={lineVisibility.swapUsedGB === false} // Controla a visibilidade
                isAnimationActive={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default MemoryUsageCard;