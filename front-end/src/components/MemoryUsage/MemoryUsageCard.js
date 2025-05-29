// so-dashboard/front-end/src/components/MemoryUsage/MemoryUsageCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão.
import ProgressBar from '../ProgressBar/ProgressBar'; // Componente para barras de progresso.
// Componentes da biblioteca Recharts para criação de gráficos de área.
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import styles from './MemoryUsageCard.module.css'; // Estilos CSS Modules para este componente.

// Número máximo de pontos de dados a serem mantidos no histórico do gráfico.
const MAX_HISTORY_POINTS = 60; // 60 pontos com intervalo de 5s = 5 minutos de histórico.
// URL do endpoint da API para buscar dados de memória.
const API_URL_MEMORY = 'http://localhost:5000/api/memory';
// Intervalo de atualização dos dados em milissegundos.
const FETCH_INTERVAL_MS = 5000; // 5 segundos.

/**
 * Função utilitária para formatar um valor em Gigabytes (GB).
 * 
 * @param {number|undefined|null} gbValue - O valor em GB a ser formatado.
 * @param {number} [decimals=1] - O número de casas decimais para a formatação. Padrão é 1.
 * @returns {string} Uma string formatada representando o valor em GB (ex: "4.0 GB"),
 *                   ou "0.0 GB" se o valor for inválido ou não numérico.
 */
const formatGb = (gbValue, decimals = 1) => {
  // Verifica se gbValue é um número válido.
  if (gbValue !== undefined && gbValue !== null && !isNaN(gbValue)) {
    return `${parseFloat(gbValue).toFixed(decimals)} GB`;
  }
  return '0.0 GB'; // Valor padrão para dados inválidos.
};

/**
 * Componente MemoryUsageCard
 * 
 * Exibe informações sobre o uso de memória RAM e Swap do sistema,
 * incluindo valores totais, usados, livres, percentuais e um gráfico de histórico.
 * Os dados são buscados periodicamente de uma API backend.
 */
const MemoryUsageCard = () => {
  // Estado para armazenar os dados de memória.
  const [memoryState, setMemoryState] = useState({
    // Dados da RAM.
    ram: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0, free_percent: 100 },
    // Dados do Swap. Podem não existir se o sistema não tiver swap.
    swap: { total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0, free_percent: 100 },
    // Histórico para o gráfico. Ex: { time: "10:30:00", ramUsedGB: 4.5, swapUsedGB: 0.2 }
    history: [],
  });

  // Estado para controlar o carregamento inicial dos dados.
  const [isLoading, setIsLoading] = useState(true);
  // Estado para armazenar mensagens de erro da busca de dados.
  const [fetchError, setFetchError] = useState(null);
  // Estado para controlar a visibilidade das áreas no gráfico (RAM e Swap).
  const [lineVisibility, setLineVisibility] = useState({
    ramUsedGB: true,  // Linha/área da RAM visível por padrão.
    swapUsedGB: true  // Linha/área do Swap visível por padrão.
  });

  /**
   * Função para buscar os dados de memória da API.
   * Usa useCallback para memoização.
   */
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(API_URL_MEMORY);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json(); // Espera-se que `data` seja { ram: {...}, swap: {...} }

      setMemoryState(prevState => {
        const currentTime = new Date().toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Pega os dados de RAM e Swap da API, ou mantém os anteriores se não vierem.
        const ramData = data.ram || prevState.ram;
        const swapData = data.swap || prevState.swap;

        // Lógica para garantir que `free_percent` seja calculado se não vier da API.
        // (O backend já deve fornecer `usage_percent` e `free_percent` calculados)
        // Esta lógica é um fallback caso o backend não envie `free_percent`.
        if (ramData.total_gb > 0 && ramData.usage_percent !== undefined && ramData.free_percent === undefined) {
          ramData.free_percent = parseFloat((100 - ramData.usage_percent).toFixed(1));
        } else if (ramData.free_percent === undefined) {
          ramData.free_percent = (ramData.total_gb > 0 && ramData.free_gb !== undefined)
            ? parseFloat(((ramData.free_gb / ramData.total_gb) * 100).toFixed(1))
            : (ramData.total_gb > 0 ? 0 : 100); // 100% livre se total=0, senão 0%
        }

        if (swapData.total_gb > 0 && swapData.usage_percent !== undefined && swapData.free_percent === undefined) {
          swapData.free_percent = parseFloat((100 - swapData.usage_percent).toFixed(1));
        } else if (swapData.free_percent === undefined) {
          swapData.free_percent = (swapData.total_gb > 0 && swapData.free_gb !== undefined)
            ? parseFloat(((swapData.free_gb / swapData.total_gb) * 100).toFixed(1))
            : (swapData.total_gb > 0 ? 0 : 100); // 100% livre se total=0, senão 0%
        }

        // Novo ponto para o histórico do gráfico.
        const newHistoryPoint = {
          time: currentTime,
          ramUsedGB: ramData.used_gb || 0,
          swapUsedGB: swapData.used_gb || 0,
        };
        const updatedHistory = [...prevState.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

        return {
          ram: ramData,
          swap: swapData,
          history: updatedHistory
        };
      });
      setFetchError(null); // Limpa erros.
    } catch (error) {
      console.error("Erro ao buscar dados de Memória:", error);
      setFetchError(error.message);
    } finally {
      if (isLoading) {
        setIsLoading(false); // Para o indicador de carregamento inicial.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // `isLoading` é a dependência principal aqui.

  /**
   * Efeito para buscar dados na montagem e configurar a busca periódica.
   */
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS);
    return () => clearInterval(intervalId); // Limpeza do intervalo.
  }, [fetchData]); // `fetchData` é memoizada.

  /**
   * Manipulador para cliques na legenda do gráfico (alterna visibilidade da área).
   * @param {object} payloadFromLegend - Contém `dataKey` da área clicada.
   */
  const handleLegendClick = useCallback((payloadFromLegend) => {
    const { dataKey } = payloadFromLegend;
    setLineVisibility(prevVisibility => ({
      ...prevVisibility,
      [dataKey]: !prevVisibility[dataKey]
    }));
  }, []); // Sem dependências.

  /**
   * Formata o texto da legenda do gráfico.
   * @param {string} value - Nome da área (ex: "RAM Usada").
   * @param {object} entry - Objeto da legenda com `dataKey`.
   * @returns {JSX.Element} Span estilizado para a legenda.
   */
  const legendFormatter = (value, entry) => {
    const { dataKey } = entry;
    const isInvisible = lineVisibility[dataKey] === false;
    const style = {
      color: isInvisible ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)',
      textDecoration: isInvisible ? 'line-through' : 'none',
    };
    return (<span style={style}> {value} </span>);
  };

  // --- Renderização Condicional ---
  if (isLoading && memoryState.history.length === 0) {
    return <Card title="Uso de Memória"><p className={styles.loadingText}>Carregando dados de memória...</p></Card>;
  }
  if (fetchError) {
    return <Card title="Uso de Memória"><p className={styles.errorText}>Erro ao carregar dados: {fetchError}</p></Card>;
  }

  // Calcula o domínio máximo para o eixo Y do gráfico.
  // Garante que o gráfico tenha espaço para os valores atuais e um pouco mais,
  // e que o eixo Y não seja menor que 0.1 GB.
  const yAxisDomainMax = Math.max(
    0.1, // Mínimo de 0.1 GB para o eixo Y.
    // 10% acima do total de RAM, ou 10% acima do pico no histórico (o que for maior).
    Math.ceil(Math.max(
      (memoryState.ram.total_gb || 0) * 1.1,
      ...(memoryState.history.map(p => p.ramUsedGB || 0)),
      ...(memoryState.history.map(p => p.swapUsedGB || 0))
    ) * 1.1)
  );


  // --- Renderização Principal ---
  return (
    <Card title="Uso de Memória e Swap">
      {/* Seção da RAM */}
      <div className={styles.memoryTypeSection}>
        <h3 className={styles.memoryTypeTitle}>RAM</h3>
        <div className={styles.memoryInfoBlock}>
          <div className={styles.memoryValueRow}>
            <span>Usada:</span> <span>{formatGb(memoryState.ram.used_gb)}</span>
          </div>
          <div className={styles.memoryValueRow}>
            <span>Livre:</span> <span>{formatGb(memoryState.ram.free_gb)}</span>
          </div>
        </div>
        <ProgressBar
          value={memoryState.ram.usage_percent || 0}
          height="10px"
          color="var(--accent-color-memory)" // Cor específica para RAM.
        />
        <div className={styles.memoryPercentRow}>
          <span>({(memoryState.ram.usage_percent || 0).toFixed(1)}% Usada)</span>
          <span>({(memoryState.ram.free_percent || 0).toFixed(1)}% Livre)</span>
        </div>
        <div className={styles.memoryTotal}>Total: {formatGb(memoryState.ram.total_gb)}</div>
      </div>

      {/* Seção do Swap (renderizada apenas se houver Swap configurado no sistema) */}
      {memoryState.swap && memoryState.swap.total_gb > 0 && (
        <div className={styles.memoryTypeSection}>
          <h3 className={styles.memoryTypeTitle}>Swap</h3>
          <div className={styles.memoryInfoBlock}>
            <div className={styles.memoryValueRow}>
              <span>Usada:</span> <span>{formatGb(memoryState.swap.used_gb)}</span>
            </div>
            <div className={styles.memoryValueRow}>
              <span>Livre:</span> <span>{formatGb(memoryState.swap.free_gb)}</span>
            </div>
          </div>
          <ProgressBar
            value={memoryState.swap.usage_percent || 0}
            height="10px"
            color="var(--chart-color-cpu-core5)" // Cor diferente para Swap.
          />
          <div className={styles.memoryPercentRow}>
            <span>({(memoryState.swap.usage_percent || 0).toFixed(1)}% Usada)</span>
            <span>({(memoryState.swap.free_percent || 0).toFixed(1)}% Livre)</span>
          </div>
          <div className={styles.memoryTotal}>Total: {formatGb(memoryState.swap.total_gb)}</div>
        </div>
      )}

      {/* Gráfico de Histórico */}
      <div className={styles.chartTitle}>Histórico de Uso (GB)</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={180}> {/* Altura menor para o gráfico de memória */}
          <AreaChart
            data={memoryState.history}
            margin={{ top: 5, right: 15, left: 15, bottom: 40 }}
          >
            {/* Definições de gradientes para as áreas do gráfico. */}
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
              domain={[0, yAxisDomainMax]} // Domínio dinâmico do eixo Y.
              allowDecimals={true}
              tickFormatter={(tickValue) => tickValue.toFixed(1)} // Formata ticks do eixo Y.
              width={45}
            />
            <Tooltip
              formatter={(value, name) => [`${parseFloat(value).toFixed(2)} GB`, name]}
              contentStyle={{ backgroundColor: 'var(--background-card)', border: `1px solid var(--border-medium)`, borderRadius: '4px', color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              labelStyle={{ color: 'var(--text-secondary)' }}
              cursor={{ fill: 'rgba(134,150,160,0.08)' }}
            />
            <Legend
              onClick={handleLegendClick}
              formatter={legendFormatter}
              iconType="line" // Ou "square", "circle" para a legenda.
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: "0.8rem", paddingTop: "15px", cursor: 'pointer' }}
              iconSize={10}
            />
            {/* Área para RAM Usada */}
            <Area
              type="monotone"
              dataKey="ramUsedGB"
              name="RAM Usada"
              stroke="var(--accent-color-memory)"
              fill="url(#colorRamUsedGrad)" // Usa o gradiente definido.
              strokeWidth={2}
              activeDot={{ r: 4 }}
              hide={lineVisibility.ramUsedGB === false}
              isAnimationActive={false}
            />
            {/* Área para Swap Usada (renderizada condicionalmente) */}
            {memoryState.swap && memoryState.swap.total_gb > 0 && (
              <Area
                type="monotone"
                dataKey="swapUsedGB"
                name="Swap Usada"
                stroke="var(--chart-color-cpu-core5)"
                fill="url(#colorSwapUsedGrad)" // Usa o gradiente definido.
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