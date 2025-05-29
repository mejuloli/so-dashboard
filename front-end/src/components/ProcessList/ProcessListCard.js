// so-dashboard/front-end/src/components/ProcessList/ProcessListCard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão.
import styles from './ProcessListCard.module.css'; // Estilos CSS Modules para o componente.

// Constantes para controle de paginação/exibição da lista.
const INITIAL_ITEMS_TO_SHOW = 10; // Número inicial de processos a serem exibidos.
const ITEMS_PER_LOAD_MORE = 10; // Número de processos a serem carregados ao clicar em "Ver Mais".

// URL do endpoint da API para buscar a lista de processos.
const API_URL_PROCESSES = 'http://localhost:5000/api/processes';
// Intervalo de atualização dos dados em milissegundos.
const FETCH_INTERVAL_MS = 5000; // 5 segundos.

/**
 * Componente ProcessListCard
 * 
 * Exibe uma lista de processos do sistema em uma tabela, com funcionalidades
 * de filtragem, ordenação e carregamento progressivo ("Ver Mais").
 * Permite ao usuário selecionar um processo para ver seus detalhes.
 * 
 * @param {object} props - As propriedades do componente.
 * @param {function} props.onProcessSelect - Função callback a ser chamada quando um processo
 *                                          é selecionado (clicado) na lista.
 *                                          Espera-se que esta função receba o objeto completo
 *                                          do processo selecionado como argumento.
 * @returns {JSX.Element} O elemento JSX que representa o card da lista de processos.
 */
const ProcessListCard = ({ onProcessSelect }) => {
    // Estado para armazenar todos os processos buscados da API.
    const [allProcesses, setAllProcesses] = useState([]);
    // Estado para controlar o carregamento inicial dos dados.
    const [isLoading, setIsLoading] = useState(true);
    // Estado para armazenar mensagens de erro da busca de dados.
    const [fetchError, setFetchError] = useState(null);

    // Estado para controlar o número de processos visíveis na lista (para "Ver Mais").
    const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_TO_SHOW);
    // Estado para controlar se todos os processos devem ser mostrados (ignora `visibleCount`).
    const [showAll, setShowAll] = useState(false);
    // Estado para o termo de busca/filtro inserido pelo usuário.
    const [searchTerm, setSearchTerm] = useState('');
    // Estado para a configuração de ordenação da tabela (chave da coluna e direção).
    const [sortConfig, setSortConfig] = useState({ key: 'pid', direction: 'ascending' });

    /**
     * Função para buscar a lista de processos da API.
     * Usa useCallback para memoização.
     */
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(API_URL_PROCESSES); // Não envia 'limit' aqui; busca todos.
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            let data = await response.json(); // Array de objetos de processo.

            // Mapeia os dados recebidos para garantir que os tipos numéricos sejam corretos
            // e que campos opcionais tenham valores padrão.
            // O backend (model.py) já deve estar retornando todos os campos necessários,
            // incluindo `memory_details_kb` e `threads_detailed_info`.
            const processedData = data.map(proc => ({
                ...proc, // Mantém todos os campos recebidos do backend.
                pid: parseInt(proc.pid, 10), // Garante que PID seja um número.
                threads: parseInt(proc.threads, 10) || 0, // Garante que threads seja um número, default 0.
                cpu_percent: parseFloat(proc.cpu_percent || 0), // Garante que cpu_percent seja float, default 0.
                memory_rss_mb: parseFloat(proc.memory_rss_mb || 0), // Garante que memory_rss_mb seja float, default 0.
                // Campos adicionais que o seu backend (model.get_processes) já deve fornecer:
                ppid: parseInt(proc.ppid || 0, 10),
                nice: parseInt(proc.nice || 0, 10),
                priority: parseInt(proc.priority || 0, 10),
                name: proc.name || "N/A",
                user_name: proc.user_name || "N/A", // `user_name` é o esperado pelo modal.
                status: proc.status || "N/A",
                create_time_iso: proc.create_time_iso || null,
                executable_path: proc.executable_path || null,
                command_line: proc.command_line || null,
                memory_details_kb: proc.memory_details_kb || {}, // Objeto com detalhes de memória.
                threads_detailed_info: proc.threads_detailed_info || [], // Array de threads.
            }));

            setAllProcesses(processedData);
            setFetchError(null); // Limpa erros.
        } catch (error) {
            console.error("Erro ao buscar lista de processos:", error);
            setFetchError(error.message);
        } finally {
            if (isLoading) {
                setIsLoading(false); // Para o indicador de carregamento inicial.
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]); // `isLoading` é a dependência principal.

    /**
     * Efeito para buscar dados na montagem e configurar a busca periódica.
     */
    useEffect(() => {
        fetchData(); // Busca inicial.
        const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS); // Busca periódica.
        return () => clearInterval(intervalId); // Limpeza na desmontagem.
    }, [fetchData]); // `fetchData` é memoizada.

    /**
     * Memoiza a lista de processos após aplicar o filtro e a ordenação.
     * `useMemo` evita recálculos desnecessários se as dependências não mudarem.
     */
    const processedAndSortedList = useMemo(() => {
        let tempProcesses = [...allProcesses]; // Cria uma cópia para não modificar o estado original.

        // Aplica o filtro com base no `searchTerm`.
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            tempProcesses = tempProcesses.filter(proc =>
                (proc.name && proc.name.toLowerCase().includes(lowerSearchTerm)) ||
                String(proc.pid).includes(searchTerm) || // Permite buscar por PID como string.
                (proc.user_name && proc.user_name.toLowerCase().includes(lowerSearchTerm))
            );
        }

        // Aplica a ordenação com base em `sortConfig`.
        if (sortConfig.key !== null) {
            tempProcesses.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                // Tratamento para ordenação de strings.
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending'
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                }
                // Tratamento para ordenação de números (ou outros tipos comparáveis).
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0; // Iguais.
            });
        }
        return tempProcesses;
    }, [allProcesses, searchTerm, sortConfig]); // Recalcula se `allProcesses`, `searchTerm` ou `sortConfig` mudarem.

    /**
     * Memoiza a lista de processos que serão efetivamente exibidos na tabela,
     * considerando a paginação ("Ver Mais" ou "Mostrar Todos").
     */
    const displayedProcesses = useMemo(() => {
        if (showAll) {
            return processedAndSortedList; // Se "Mostrar Todos", exibe a lista filtrada/ordenada completa.
        }
        // Caso contrário, exibe apenas o número de itens definido por `visibleCount`.
        return processedAndSortedList.slice(0, visibleCount);
    }, [processedAndSortedList, visibleCount, showAll]);

    /**
     * Manipulador para o botão "Ver Mais".
     * Aumenta o `visibleCount` para mostrar mais processos.
     */
    const handleLoadMore = () => {
        setVisibleCount(prevCount =>
            Math.min(prevCount + ITEMS_PER_LOAD_MORE, processedAndSortedList.length)
        );
    };

    /**
     * Manipulador para o botão "Mostrar Todos" / "Recolher Lista".
     * Alterna o estado `showAll`. Se estiver recolhendo, reseta `visibleCount`.
     */
    const toggleShowAll = () => {
        const newShowAllState = !showAll;
        setShowAll(newShowAllState);
        if (!newShowAllState) { // Se estiver voltando de "Mostrar Todos" para "Recolher".
            setVisibleCount(INITIAL_ITEMS_TO_SHOW); // Reseta para a contagem inicial.
        }
    };

    /**
     * Manipulador para cliques nos cabeçalhos da tabela para ordenação.
     * Define a chave de ordenação e alterna a direção (ascendente/descendente).
     * @param {string} key - A chave da coluna pela qual ordenar (ex: 'pid', 'name').
     */
    const requestSort = (key) => {
        let direction = 'ascending';
        // Se já estiver ordenando pela mesma chave e em ordem ascendente, inverte para descendente.
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    /**
     * Retorna um indicador visual (seta para cima ou para baixo) para a coluna que está sendo ordenada.
     * @param {string} key - A chave da coluna.
     * @returns {string} O caractere de seta ou uma string vazia.
     */
    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return '';
    };

    /**
     * Manipulador para cliques em uma linha da tabela de processos.
     * Chama a prop `onProcessSelect` passando o objeto completo do processo selecionado.
     * O backend (model.get_processes) já deve fornecer todos os detalhes necessários
     * para o modal (incluindo memory_details_kb e threads_detailed_info).
     * @param {object} process - O objeto do processo que foi clicado.
     */
    const handleProcessRowClick = (process) => {
        onProcessSelect(process); // Passa o objeto de processo completo.
    };

    // Contagens para o sumário.
    const totalProcessesInSystem = allProcesses.length; // Total de processos antes de filtrar.
    // const totalThreadsInSystem = allProcesses.reduce((sum, p) => sum + (p.threads || 0), 0); // Já vem do /api/cpu
    const filteredProcessCount = processedAndSortedList.length; // Total após filtro.

    // --- Renderização Condicional ---
    if (isLoading && allProcesses.length === 0) {
        return <Card title="Lista de Processos"><p className={styles.loadingText}>Carregando processos...</p></Card>;
    }
    if (fetchError && allProcesses.length === 0) { // Só mostra erro se a lista estiver vazia.
        return <Card title="Lista de Processos"><p className={styles.errorText}>Erro ao carregar: {fetchError}</p></Card>;
    }

    // --- Renderização Principal ---
    return (
        <Card title="Lista de Processos" className={styles.processListCard}>
            {/* Controles de filtro e visualização */}
            <div className={styles.controlsContainer}>
                <div className={styles.filterContainer}>
                    <input
                        type="text"
                        placeholder="Filtrar por PID, Nome, Usuário..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            // Reseta a contagem visível ao filtrar se não estiver mostrando todos.
                            if (!showAll) setVisibleCount(INITIAL_ITEMS_TO_SHOW);
                        }}
                        className={styles.filterInput}
                        aria-label="Filtrar processos"
                    />
                </div>
                <div className={styles.viewOptionsContainer}>
                    <button onClick={toggleShowAll} className={styles.actionButton}>
                        {showAll ? "Recolher Lista" : `Mostrar Todos (${filteredProcessCount})`}
                    </button>
                </div>
            </div>

            {/* Tabela de Processos */}
            <div className={styles.tableContainer}>
                <table>
                    <thead>
                        <tr>
                            {/* Cabeçalhos de coluna clicáveis para ordenação. */}
                            <th onClick={() => requestSort('pid')} className={styles.colPid}>
                                PID{getSortIndicator('pid')}
                            </th>
                            <th onClick={() => requestSort('user_name')} className={styles.colUser}>
                                Usuário{getSortIndicator('user_name')}
                            </th>
                            <th onClick={() => requestSort('cpu_percent')} className={styles.colCpu}>
                                CPU %{getSortIndicator('cpu_percent')}
                            </th>
                            <th onClick={() => requestSort('memory_rss_mb')} className={styles.colMem}>
                                Mem. (MB){getSortIndicator('memory_rss_mb')}
                            </th>
                            <th onClick={() => requestSort('name')} className={styles.colCmd}>
                                Comando/Nome{getSortIndicator('name')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Mapeia os `displayedProcesses` para linhas da tabela. */}
                        {displayedProcesses.map(proc => (
                            <tr
                                key={proc.pid}
                                onClick={() => handleProcessRowClick(proc)}
                                className={styles.clickableRow} // Estilo para indicar que a linha é clicável.
                                tabIndex={0} // Torna a linha focável para acessibilidade.
                                onKeyPress={(e) => e.key === 'Enter' && handleProcessRowClick(proc)} // Permite seleção com Enter.
                            >
                                <td className={styles.colPid}>{proc.pid}</td>
                                <td className={styles.colUser}>{proc.user_name}</td>
                                <td className={styles.colCpu}>{(proc.cpu_percent || 0).toFixed(1)}</td>
                                <td className={styles.colMem}>{(proc.memory_rss_mb || 0).toFixed(1)}</td>
                                {/* `title` no td para mostrar o comando completo no hover, se for longo. */}
                                <td title={proc.command_line || proc.name} className={styles.colCmd}>
                                    {proc.name}
                                </td>
                            </tr>
                        ))}
                        {/* Mensagem se nenhum processo for encontrado após filtro ou se a lista estiver vazia. */}
                        {displayedProcesses.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan="5" className={styles.noDataCell}>Nenhum processo encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Botão "Ver Mais" e Sumário */}
            {!showAll && visibleCount < filteredProcessCount && (
                <button onClick={handleLoadMore} className={styles.loadMoreButton}>
                    Ver Mais ({Math.max(0, filteredProcessCount - visibleCount)} restantes)
                </button>
            )}
            <div className={styles.summaryStats}>
                <span>Exibindo: {displayedProcesses.length} de {filteredProcessCount} (filtrados)</span>
                <span>Total no Sistema: {totalProcessesInSystem}</span>
            </div>
        </Card>
    );
};

export default ProcessListCard;