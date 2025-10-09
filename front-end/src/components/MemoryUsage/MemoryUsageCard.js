// so-dashboard/front-end/src/components/MemoryUsage/MemoryUsageCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // componente base de card
import ProgressBar from '../ProgressBar/ProgressBar'; // barra de progresso
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import styles from './MemoryUsageCard.module.css'; // estilos css module

// máximo de pontos no histórico (5 min com update a cada 5s)
const MAX_HISTORY_POINTS = 60;
// endpoint da api de memória
const API_URL_MEMORY = 'http://localhost:5000/api/memory';
// intervalo de atualização em ms
const FETCH_INTERVAL_MS = 5000;

// formata valor em gb
const formatGb = (gbValue, decimals = 1) => {
  if (gbValue !== undefined && gbValue !== null && !isNaN(gbValue)) {
    return `${parseFloat(gbValue).toFixed(decimals)} GB`;
  }
  return '0.0 GB';
};

// card de uso de memória
const MemoryUsageCard = () => {
  // estado principal
  const [memoryState, setMemoryState] = useState({
    ram: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0, free_percent: 100 },
    swap: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0, free_percent: 100 },
    history: [],
  });

  // estados auxiliares
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [lineVisibility, setLineVisibility] = useState({
    ramUsedGB: true,
    swapUsedGB: true
  });

  // busca dados da api
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(API_URL_MEMORY);
      if (!response.ok) throw new Error(`erro http: ${response.status} - ${response.statusText}`);
      const data = await response.json(); // { ram: {...}, swap: {...} }

      setMemoryState(prev => {
        const currentTime = new Date().toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // usa dados vindos da api ou mantém anteriores
        const ramData = data.ram || prev.ram;
        const swapData = data.swap || prev.swap;

        // fallbacks para free_percent (caso o backend não envie)
        if (ramData.total_gb > 0 && ramData.usage_percent !== undefined && ramData.free_percent === undefined) {
          ramData.free_percent = parseFloat((100 - ramData.usage_percent).toFixed(1));
        } else if (ramData.free_percent === undefined) {
          ramData.free_percent = (ramData.total_gb > 0 && ramData.free_gb !== undefined)
            ? parseFloat(((ramData.free_gb / ramData.total_gb) * 100).toFixed(1))
            : (ramData.total_gb > 0 ? 0 : 100);
        }

        if (swapData.total_gb > 0 && swapData.usage_percent !== undefined && swapData.free_percent === undefined) {
          swapData.free_percent = parseFloat((100 - swapData.usage_percent).toFixed(1));
        } else if (swapData.free_percent === undefined) {
          swapData.free_percent = (swapData.total_gb > 0 && swapData.free_gb !== undefined)
            ? parseFloat(((swapData.free_gb / swapData.total_gb) * 100).toFixed(1))
            : (swapData.total_gb > 0 ? 0 : 100);
        }

        // adiciona ponto ao histórico
        const newHistoryPoint = {
          time: currentTime,
          ramUsedGB: ramData.used_gb || 0,
          swapUsedGB: swapData.used_gb || 0,
        };
        const updatedHistory = [...prev.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

        return { ram: ramData, swap: swapData, history: updatedHistory };
      });

      setFetchError(null);
    } catch (error) {
      console.error('erro ao buscar dados de memória:', error);
      setFetchError(error.message);
    } finally {
      if (isLoading) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // busca inicial + intervalo periódico
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // alterna visibilidade de linhas da legenda
  const handleLegendClick = useCallback((payload) => {
    const { dataKey } = payload;
    setLineVisibility(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);

  // formata a legenda com estilo de oculto/visível
  const legendFormatter = (value, entry) => {
    const { dataKey } = entry;
    const hidden = lineVisibility[dataKey] === false;
    const style = {
      color: hidden ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)',
      textDecoration: hidden ? 'line-through' : 'none',
    };
    return (<span style={style}>{value}</span>);
  };

  // estados de carregamento/erro
  if (isLoading && memoryState.history.length === 0) {
    return <Card title="Uso de Memória"><p className={styles.loadingText}>carregando dados de memória...</p></Card>;
  }
  if (fetchError) {
    return <Card title="Uso de Memória"><p className={styles.errorText}>erro ao carregar dados: {fetchError}</p></Card>;
  }

  // domínio dinâmico do eixo y (garante respiro visual)
  const yAxisDomainMax = Math.max(
    0.1,
    Math.ceil(Math.max(
      (memoryState.ram.total_gb || 0) * 1.1,
      ...(memoryState.history.map(p => p.ramUsedGB || 0)),
      ...(memoryState.history.map(p => p.swapUsedGB || 0))
    ) * 1.1)
  );

  // render principal
  return (
    <Card title="Uso de Memória e Swap">
      {/* bloco ram */}
      <div className={styles.memoryTypeSection}>
        <h3 className={styles.memoryTypeTitle}>ram</h3>
        <div className={styles.memoryInfoBlock}>
          <div className={styles.memoryValueRow}>
            <span>usada:</span> <span>{formatGb(memoryState.ram.used_gb)}</span>
          </div>
          <div className={styles.memoryValueRow}>
            <span>livre:</span> <span>{formatGb(memoryState.ram.free_gb)}</span>
          </div>
        </div>
        <ProgressBar
          value={memoryState.ram.usage_percent || 0}
          height="10px"
          color="var(--accent-color-memory)"
        />
        <div className={styles.memoryPercentRow}>
          <span>({(memoryState.ram.usage_percent || 0).toFixed(1)}% usada)</span>
          <span>({(memoryState.ram.free_percent || 0).toFixed(1)}% livre)</span>
        </div>
        <div className={styles.memoryTotal}>total: {formatGb(memoryState.ram.total_gb)}</div>
      </div>

      {/* bloco swap (somente se existir) */}
      {memoryState.swap && memoryState.swap.total_gb > 0 && (
        <div className={styles.memoryTypeSection}>
          <h3 className={styles.memoryTypeTitle}>swap</h3>
          <div className={styles.memoryInfoBlock}>
            <div className={styles.memoryValueRow}>
              <span>usada:</span> <span>{formatGb(memoryState.swap.used_gb)}</span>
            </div>
            <div className={styles.memoryValueRow}>
              <span>livre:</span> <span>{formatGb(memoryState.swap.free_gb)}</span>
            </div>
          </div>
          <ProgressBar
            value={memoryState.swap.usage_percent || 0}
            height="10px"
            color="var(--chart-color-cpu-core5)"
          />
          <div className={styles.memoryPercentRow}>
            <span>({(memoryState.swap.usage_percent || 0).toFixed(1)}% usada)</span>
            <span>({(memoryState.swap.free_percent || 0).toFixed(1)}% livre)</span>
          </div>
          <div className={styles.memoryTotal}>total: {formatGb(memoryState.swap.total_gb)}</div>
        </div>
      )}

      {/* gráfico histórico */}
      <div className={styles.chartTitle}>histórico de uso (gb)</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={memoryState.history} margin={{ top: 5, right: 15, left: 15, bottom: 40 }}>
            {/* gradientes para as áreas */}
            <defs>
              <linearGradient id="colorRamUsedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-color-memory)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--accent-color-memory)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorSwapUsedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-color-cpu-core5)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--chart-color-cpu-core5)" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize="0.8rem" tick={{ fill: 'var(--text-secondary)' }} />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize="0.8rem"
              unit=" GB"
              tick={{ fill: 'var(--text-secondary)' }}
              domain={[0, yAxisDomainMax]}
              allowDecimals={true}
              tickFormatter={(v) => v.toFixed(1)}
              width={45}
            />
            <Tooltip
              formatter={(value, name) => [`${parseFloat(value).toFixed(2)} GB`, name]}
              contentStyle={{
                backgroundColor: 'var(--background-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '4px',
                color: 'var(--text-primary)'
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
            {/* área ram usada */}
            <Area
              type="monotone"
              dataKey="ramUsedGB"
              name="RAM Usada"
              stroke="var(--accent-color-memory)"
              fill="url(#colorRamUsedGrad)"
              strokeWidth={2}
              activeDot={{ r: 4 }}
              hide={lineVisibility.ramUsedGB === false}
              isAnimationActive={false}
            />
            {/* área swap usada */}
            {memoryState.swap && memoryState.swap.total_gb > 0 && (
              <Area
                type="monotone"
                dataKey="swapUsedGB"
                name="Swap Usada"
                stroke="var(--chart-color-cpu-core5)"
                fill="url(#colorSwapUsedGrad)"
                strokeWidth={2}
                activeDot={{ r: 4 }}
                hide={lineVisibility.swapUsedGB === false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default MemoryUsageCard;
