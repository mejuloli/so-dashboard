// so-dashboard/front-end/src/components/CpuUsage/CpuUsageCard.js
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão.
import ProgressBar from '../ProgressBar/ProgressBar'; // Componente para barras de progresso.
// Componentes da biblioteca Recharts para criação de gráficos.
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import styles from './CpuUsageCard.module.css'; // Estilos CSS Modules para este componente.

// Cores pré-definidas para as linhas dos cores no gráfico.
// Estas cores são definidas como variáveis CSS no arquivo de estilos global.
const CORE_CHART_COLORS = [
    'var(--chart-color-cpu-core1)', 'var(--chart-color-cpu-core2)',
    'var(--chart-color-cpu-core3)', 'var(--chart-color-cpu-core4)',
    'var(--chart-color-cpu-core5)', 'var(--chart-color-cpu-core6)',
    'var(--chart-color-cpu-core7)', 'var(--chart-color-cpu-core8)',
];

// Número máximo de pontos de dados a serem mantidos no histórico do gráfico.
const MAX_HISTORY_POINTS = 60; // 60 pontos com intervalo de 5s = 5 minutos de histórico.

// URL do endpoint da API para buscar dados da CPU.
const API_URL_CPU = 'http://localhost:5000/api/cpu';
// Intervalo de atualização dos dados em milissegundos.
const FETCH_INTERVAL_MS = 5000; // 5 segundos.

/**
 * Componente CpuUsageCard
 * 
 * Exibe informações sobre o uso geral da CPU e o uso individual de cada core,
 * incluindo barras de progresso e um gráfico de histórico de uso.
 * Os dados são buscados periodicamente de uma API backend.
 */
const CpuUsageCard = () => {
    // Estado para armazenar os dados da CPU.
    const [cpuState, setCpuState] = useState({
        overallUsage: 0,        // Percentual de uso geral da CPU.
        overallIdle: 100,       // Percentual de tempo ocioso geral da CPU.
        cores: [],              // Array de objetos, cada um representando um core da CPU.
        // Ex: { id: 0, name: "Core 0", usage_percent: 0 }
        history: [],            // Array de objetos para o histórico do gráfico.
        // Ex: { time: "10:30:00", overall: 25, core0: 10, core1: 15, ... }
        numberOfCores: 0,       // Número total de cores da CPU.
    });

    // Estado para controlar o carregamento inicial dos dados.
    const [isLoading, setIsLoading] = useState(true);
    // Estado para armazenar mensagens de erro da busca de dados.
    const [fetchError, setFetchError] = useState(null);
    // Estado para controlar a visibilidade das linhas no gráfico (clicando na legenda).
    // Ex: { overall: true, core0: true, core1: false, ... }
    const [lineVisibility, setLineVisibility] = useState({});

    /**
     * Efeito para inicializar a visibilidade das linhas do gráfico quando os dados dos cores
     * são carregados pela primeira vez ou quando o número de cores muda.
     * Garante que todas as linhas (geral e por core) tenham um estado de visibilidade inicial (true).
     */
    useEffect(() => {
        // Verifica se os dados dos cores existem e se há pelo menos um core.
        if (cpuState.cores && cpuState.cores.length > 0) {
            // Cria uma cópia do estado de visibilidade atual.
            const currentVisibilityState = { ...lineVisibility };
            let visibilityHasChanged = false; // Flag para indicar se o estado de visibilidade foi alterado.

            // Garante que a linha "overall" (CPU Geral) tenha um estado de visibilidade.
            if (!currentVisibilityState.hasOwnProperty('overall')) {
                currentVisibilityState.overall = true; // Define como visível por padrão.
                visibilityHasChanged = true;
            }

            // Itera sobre cada core para garantir que sua linha correspondente tenha um estado de visibilidade.
            cpuState.cores.forEach(core => {
                const coreDataKey = `core${core.id}`; // Chave de dados usada no gráfico (ex: "core0").
                if (!currentVisibilityState.hasOwnProperty(coreDataKey)) {
                    currentVisibilityState[coreDataKey] = true; // Define como visível por padrão.
                    visibilityHasChanged = true;
                }
            });

            // Se houve alguma alteração no estado de visibilidade, atualiza o estado.
            if (visibilityHasChanged) {
                setLineVisibility(currentVisibilityState);
            }
        }
        // Dependências do efeito: é executado quando `cpuState.cores` ou `lineVisibility` mudam.
        // A dependência em `lineVisibility` aqui pode criar um loop se não for gerenciada com cuidado,
        // mas é necessária para manter a consistência se o estado de visibilidade for alterado externamente.
        // No entanto, a lógica interna com `hasOwnProperty` e `visibilityHasChanged` mitiga o loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [cpuState.cores]);

    /**
     * Função para buscar os dados da CPU da API.
     * Usa useCallback para memoizar a função e evitar recriações desnecessárias
     * em re-renderizações, otimizando o uso em useEffect.
     */
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(API_URL_CPU);
            if (!response.ok) {
                // Se a resposta da API não for bem-sucedida, lança um erro.
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json(); // Converte a resposta para JSON.

            // Atualiza o estado `cpuState` com os novos dados.
            setCpuState(prevState => {
                // Formata a hora atual para o eixo X do gráfico.
                const currentTime = new Date().toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });

                // Cria um novo ponto de dados para o histórico do gráfico.
                const newHistoryPoint = {
                    time: currentTime,
                    overall: data.overall_usage_percent || 0, // Uso geral da CPU.
                };
                // Adiciona o uso de cada core ao ponto de histórico.
                (data.cores || []).forEach(core => {
                    newHistoryPoint[`core${core.id}`] = core.usage_percent || 0;
                });

                // Atualiza o array de histórico, mantendo apenas os últimos MAX_HISTORY_POINTS.
                const updatedHistory = [...prevState.history, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

                // Retorna o novo estado.
                return {
                    overallUsage: data.overall_usage_percent || 0,
                    overallIdle: data.overall_idle_percent || 0, // `overall_idle_percent` do backend
                    cores: data.cores || [],
                    history: updatedHistory,
                    numberOfCores: data.number_of_cores || 0,
                };
            });
            setFetchError(null); // Limpa qualquer erro anterior se a busca for bem-sucedida.
        } catch (error) {
            console.error("Erro ao buscar dados da CPU:", error);
            setFetchError(error.message); // Armazena a mensagem de erro no estado.
        } finally {
            // Define isLoading como false após a primeira tentativa de busca (bem-sucedida ou não).
            if (isLoading) {
                setIsLoading(false);
            }
        }
        // A dependência `isLoading` garante que `setIsLoading(false)` seja chamado corretamente
        // após a primeira busca. A ausência de outras dependências (como cpuState) está correta
        // pois `fetchData` não depende diretamente do valor anterior de `cpuState` para sua lógica principal de busca,
        // e sim usa o `prevState` no `setCpuState` para atualizações baseadas no estado anterior.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]); // Não incluir `cpuState` ou outras variáveis que mudam frequentemente aqui
    // para evitar recriação excessiva da função `fetchData`.

    /**
     * Efeito para buscar dados da CPU na montagem do componente e, em seguida,
     * configurar um intervalo para buscar dados periodicamente.
     * Limpa o intervalo quando o componente é desmontado.
     */
    useEffect(() => {
        fetchData(); // Busca dados imediatamente ao montar o componente.
        const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS); // Configura busca periódica.

        // Função de limpeza: será chamada quando o componente for desmontado.
        return () => clearInterval(intervalId); // Limpa o intervalo para evitar memory leaks.
    }, [fetchData]); // `fetchData` é memoizada com `useCallback`, então este efeito
    // só será re-executado se `fetchData` mudar (o que não deve acontecer frequentemente).

    /**
     * Manipulador de evento para cliques na legenda do gráfico.
     * Alterna a visibilidade da linha correspondente no gráfico.
     * Usa useCallback para memoização.
     * @param {object} payloadFromLegend - Objeto contendo informações sobre o item da legenda clicado,
     *                                     incluindo `dataKey` (ex: "overall", "core0").
     */
    const handleLegendClick = useCallback((payloadFromLegend) => {
        const { dataKey } = payloadFromLegend; // Extrai a chave de dados da linha.
        // Atualiza o estado de visibilidade, invertendo o valor booleano para a dataKey clicada.
        setLineVisibility(prevVisibility => ({
            ...prevVisibility,
            [dataKey]: !prevVisibility[dataKey]
        }));
    }, []); // Sem dependências, pois não usa props ou estado do escopo externo diretamente.

    /**
     * Função para formatar o texto da legenda do gráfico.
     * Aplica estilos para indicar se uma linha está visível ou oculta.
     * @param {string} value - O nome da linha da legenda (ex: "CPU Geral", "Core 0").
     * @param {object} entry - Objeto de entrada da legenda, contendo `dataKey`.
     * @returns {JSX.Element} Um elemento span estilizado para a legenda.
     */
    const legendFormatter = (value, entry) => {
        const { dataKey } = entry;
        // Verifica se a linha correspondente está oculta.
        const isInvisible = lineVisibility[dataKey] === false;
        // Define o estilo do texto da legenda com base na visibilidade.
        const style = {
            color: isInvisible ? 'rgba(134, 150, 160, 0.5)' : 'var(--text-secondary)', // Cor mais clara se oculto.
            textDecoration: isInvisible ? 'line-through' : 'none', // Riscado se oculto.
        };
        return (<span style={style}> {value} </span>);
    };

    // --- Renderização Condicional ---

    // Se estiver carregando e não houver histórico, exibe mensagem de carregamento.
    if (isLoading && cpuState.history.length === 0) {
        return (
            <Card title="Uso de CPU">
                <p className={styles.loadingText}>Carregando dados da CPU...</p>
            </Card>
        );
    }

    // Se houver um erro na busca de dados, exibe mensagem de erro.
    if (fetchError) {
        return (
            <Card title="Uso de CPU">
                <p className={styles.errorText}>Erro ao carregar dados: {fetchError}</p>
            </Card>
        );
    }

    // Verifica se o estado de visibilidade das linhas está pronto para renderizar o gráfico.
    // Isso evita renderizar o gráfico antes que todas as linhas (geral e por core)
    // tenham seu estado de visibilidade inicializado, prevenindo possíveis erros ou
    // comportamento inesperado da biblioteca Recharts.
    const isVisibilityStateReady = Object.keys(lineVisibility).length > 0 &&
        lineVisibility.hasOwnProperty('overall') && // Garante que 'overall' existe.
        (cpuState.cores.length === 0 || // Se não houver cores, não precisa verificar visibilidade deles.
            cpuState.cores.every(core => lineVisibility.hasOwnProperty(`core${core.id}`))); // Todos os cores têm visibilidade.

    // Se o estado de visibilidade ainda não estiver pronto, mas já houver dados no histórico,
    // exibe uma mensagem de inicialização do gráfico.
    if (!isVisibilityStateReady && cpuState.history.length > 0) {
        return (
            <Card title="Uso de CPU">
                <p className={styles.loadingText}>Inicializando gráfico de CPU...</p>
            </Card>
        );
    }

    // --- Renderização Principal do Componente ---
    return (
        <Card title="Uso de CPU">
            {/* Seção de estatísticas gerais da CPU */}
            <div className={styles.cpuOverallStats}>
                <div className={styles.cpuOverallItem}>
                    <span className={styles.overallLabel}>Uso CPU:</span>
                    <span className={styles.overallValue}>
                        {(cpuState.overallUsage || 0).toFixed(1)}%
                    </span>
                    <ProgressBar
                        value={cpuState.overallUsage || 0}
                        height="10px"
                        color="var(--chart-color-cpu-core4)" // Cor específica para a barra de uso.
                    />
                </div>
                <div className={styles.cpuOverallItem}>
                    <span className={styles.overallLabel}>CPU Ociosa:</span>
                    <span className={styles.overallValue}>
                        {(cpuState.overallIdle || 0).toFixed(1)}%
                    </span>
                    <ProgressBar
                        value={cpuState.overallIdle || 0}
                        height="10px"
                        color="var(--text-secondary)" // Cor para a barra de ociosidade.
                    />
                </div>
            </div>

            {/* Seção para exibir o uso de cada core individualmente */}
            {cpuState.cores.map((core, index) => (
                <div key={core.id || `core-${index}`} className={styles.cpuSection}>
                    <div className={styles.labelWithValue}>
                        <span className={styles.labelText}>{core.name || `Core ${core.id}`}:</span>
                        <span className={styles.valueText}>{(core.usage_percent || 0).toFixed(1)}%</span>
                    </div>
                    <ProgressBar
                        value={core.usage_percent || 0}
                        height="8px"
                        // Seleciona uma cor do array CORE_CHART_COLORS, ciclando se houver mais cores que o array.
                        color={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]}
                    />
                </div>
            ))}

            {/* Título para o gráfico de histórico */}
            <div className={styles.chartTitle}>Histórico de Uso de CPU (%)</div>

            {/* Container do gráfico de linhas responsivo */}
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                        data={cpuState.history} // Dados do histórico para o gráfico.
                        margin={{ top: 5, right: 20, left: 20, bottom: 40 }} // Margens do gráfico.
                    >
                        {/* Grid cartesiano para o gráfico. */}
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                        {/* Eixo X (tempo). */}
                        <XAxis
                            dataKey="time"
                            stroke="var(--text-secondary)"
                            fontSize="0.8rem"
                            tick={{ fill: 'var(--text-secondary)' }}
                        />
                        {/* Eixo Y (percentual de uso). */}
                        <YAxis
                            stroke="var(--text-secondary)"
                            fontSize="0.8rem"
                            unit="%"
                            domain={[0, 100]} // Define o domínio do eixo Y de 0 a 100%.
                            tick={{ fill: 'var(--text-secondary)' }}
                            width={35} // Largura reservada para os rótulos do eixo Y.
                        />
                        {/* Tooltip exibido ao passar o mouse sobre o gráfico. */}
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px'
                            }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            labelStyle={{ color: 'var(--text-secondary)' }}
                            cursor={{ fill: 'rgba(134,150,160,0.08)' }} // Estilo do cursor no gráfico.
                        />
                        {/* Legenda do gráfico. */}
                        <Legend
                            onClick={handleLegendClick} // Manipulador para cliques na legenda.
                            formatter={legendFormatter} // Função para formatar o texto da legenda.
                            iconType="line" // Tipo de ícone na legenda.
                            verticalAlign="bottom" // Alinhamento vertical da legenda.
                            wrapperStyle={{ fontSize: "0.8rem", paddingTop: "15px", cursor: 'pointer' }}
                            iconSize={10} // Tamanho do ícone da legenda.
                        />
                        {/* Linha para o uso geral da CPU. */}
                        <Line
                            type="monotone" // Tipo de interpolação da linha.
                            dataKey="overall" // Chave de dados no array `cpuState.history`.
                            name="CPU Geral" // Nome exibido na legenda e tooltip.
                            stroke="#FFFFFF" // Cor da linha (branco).
                            strokeWidth={2.5} // Espessura da linha.
                            dot={false} // Não exibe pontos em cada dado.
                            activeDot={{ r: 5 }} // Estilo do ponto ativo (ao passar o mouse).
                            // `hide` controla a visibilidade da linha com base no estado `lineVisibility`.
                            hide={lineVisibility.overall === false}
                            isAnimationActive={false} // Desativa animações para melhor performance com dados em tempo real.
                        />
                        {/* Gera uma linha para cada core da CPU. */}
                        {cpuState.cores.map((core, index) => (
                            <Line
                                key={`core-line-${core.id || index}`}
                                type="monotone"
                                dataKey={`core${core.id}`} // Chave de dados dinâmica (ex: "core0", "core1").
                                name={core.name || `Core ${core.id}`}
                                stroke={CORE_CHART_COLORS[index % CORE_CHART_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                hide={lineVisibility[`core${core.id}`] === false}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default CpuUsageCard;