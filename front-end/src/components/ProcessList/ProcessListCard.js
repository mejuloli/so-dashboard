// so-dashboard/front-end/src/components/ProcessList/ProcessListCard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../Card/Card'; // componente base de card
import styles from './ProcessListCard.module.css'; // estilos do componente

// paginação da lista
const INITIAL_ITEMS_TO_SHOW = 10; // itens iniciais
const ITEMS_PER_LOAD_MORE = 10; // incremento do "ver mais"

// endpoint da api
const API_URL_PROCESSES = 'http://localhost:5000/api/processes';
// intervalo de atualização
const FETCH_INTERVAL_MS = 5000;

// card da lista de processos (filtro, ordenação, paginação)
const ProcessListCard = ({ onProcessSelect }) => {
    // estados principais
    const [allProcesses, setAllProcesses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // visualização
    const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_TO_SHOW);
    const [showAll, setShowAll] = useState(false);

    // filtro e ordenação
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'pid', direction: 'ascending' });

    // busca dados do backend
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(API_URL_PROCESSES);
            if (!response.ok) throw new Error(`erro http: ${response.status} - ${response.statusText}`);
            const data = await response.json();

            // normaliza tipos e garante defaults
            const processedData = data.map(proc => ({
                ...proc,
                pid: parseInt(proc.pid, 10),
                threads: parseInt(proc.threads, 10) || 0,
                cpu_percent: parseFloat(proc.cpu_percent || 0),
                memory_rss_mb: parseFloat(proc.memory_rss_mb || 0),
                ppid: parseInt(proc.ppid || 0, 10),
                nice: parseInt(proc.nice || 0, 10),
                priority: parseInt(proc.priority || 0, 10),
                name: proc.name || 'N/A',
                user_name: proc.user_name || 'N/A',
                status: proc.status || 'N/A',
                create_time_iso: proc.create_time_iso || null,
                executable_path: proc.executable_path || null,
                command_line: proc.command_line || null,
                memory_details_kb: proc.memory_details_kb || {},
                threads_detailed_info: proc.threads_detailed_info || [],
            }));

            setAllProcesses(processedData);
            setFetchError(null);
        } catch (error) {
            console.error('erro ao buscar lista de processos:', error);
            setFetchError(error.message);
        } finally {
            if (isLoading) setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);

    // carga inicial + atualização periódica
    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, FETCH_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchData]);

    // aplica filtro e ordenação (memoizado)
    const processedAndSortedList = useMemo(() => {
        let temp = [...allProcesses];

        // filtro por nome, pid ou usuário
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            temp = temp.filter(proc =>
                (proc.name && proc.name.toLowerCase().includes(q)) ||
                String(proc.pid).includes(searchTerm) ||
                (proc.user_name && proc.user_name.toLowerCase().includes(q))
            );
        }

        // ordenação genérica (string/num)
        if (sortConfig.key !== null) {
            temp.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending'
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                }
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return temp;
    }, [allProcesses, searchTerm, sortConfig]);

    // fatia a lista conforme paginação/mostrar todos
    const displayedProcesses = useMemo(() => {
        if (showAll) return processedAndSortedList;
        return processedAndSortedList.slice(0, visibleCount);
    }, [processedAndSortedList, visibleCount, showAll]);

    // ações da ui
    const handleLoadMore = () => {
        setVisibleCount(prev => Math.min(prev + ITEMS_PER_LOAD_MORE, processedAndSortedList.length));
    };

    const toggleShowAll = () => {
        const next = !showAll;
        setShowAll(next);
        if (!next) setVisibleCount(INITIAL_ITEMS_TO_SHOW);
    };

    // alterna ordenação ao clicar no cabeçalho
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    // seta visual ↑/↓ na coluna ativa
    const getSortIndicator = (key) => {
        if (sortConfig.key === key) return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        return '';
    };

    // seleciona processo (abre modal no pai)
    const handleProcessRowClick = (process) => onProcessSelect(process);

    // contagens para resumo
    const totalProcessesInSystem = allProcesses.length;
    const filteredProcessCount = processedAndSortedList.length;

    // estados de carregamento/erro
    if (isLoading && allProcesses.length === 0) {
        return (
            <Card title="Lista de Processos">
                <p className={styles.loadingText}>carregando processos...</p>
            </Card>
        );
    }
    if (fetchError && allProcesses.length === 0) {
        return (
            <Card title="Lista de Processos">
                <p className={styles.errorText}>erro ao carregar: {fetchError}</p>
            </Card>
        );
    }

    // render principal
    return (
        <Card title="Lista de Processos" className={styles.processListCard}>
            {/* filtro e ações */}
            <div className={styles.controlsContainer}>
                <div className={styles.filterContainer}>
                    <input
                        type="text"
                        placeholder="filtrar por pid, nome, usuário..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!showAll) setVisibleCount(INITIAL_ITEMS_TO_SHOW);
                        }}
                        className={styles.filterInput}
                        aria-label="filtrar processos"
                    />
                </div>
                <div className={styles.viewOptionsContainer}>
                    <button onClick={toggleShowAll} className={styles.actionButton}>
                        {showAll ? 'recolher lista' : `mostrar todos (${filteredProcessCount})`}
                    </button>
                </div>
            </div>

            {/* tabela de processos */}
            <div className={styles.tableContainer}>
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('pid')} className={styles.colPid}>
                                pid{getSortIndicator('pid')}
                            </th>
                            <th onClick={() => requestSort('user_name')} className={styles.colUser}>
                                usuário{getSortIndicator('user_name')}
                            </th>
                            <th onClick={() => requestSort('cpu_percent')} className={styles.colCpu}>
                                cpu %{getSortIndicator('cpu_percent')}
                            </th>
                            <th onClick={() => requestSort('memory_rss_mb')} className={styles.colMem}>
                                mem. (mb){getSortIndicator('memory_rss_mb')}
                            </th>
                            <th onClick={() => requestSort('name')} className={styles.colCmd}>
                                comando/nome{getSortIndicator('name')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedProcesses.map(proc => (
                            <tr
                                key={proc.pid}
                                onClick={() => handleProcessRowClick(proc)}
                                className={styles.clickableRow}
                                tabIndex={0}
                                onKeyPress={(e) => e.key === 'Enter' && handleProcessRowClick(proc)}
                            >
                                <td className={styles.colPid}>{proc.pid}</td>
                                <td className={styles.colUser}>{proc.user_name}</td>
                                <td className={styles.colCpu}>{(proc.cpu_percent || 0).toFixed(1)}</td>
                                <td className={styles.colMem}>{(proc.memory_rss_mb || 0).toFixed(1)}</td>
                                <td title={proc.command_line || proc.name} className={styles.colCmd}>
                                    {proc.name}
                                </td>
                            </tr>
                        ))}
                        {displayedProcesses.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan="5" className={styles.noDataCell}>nenhum processo encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* botões e resumo */}
            {!showAll && visibleCount < filteredProcessCount && (
                <button onClick={handleLoadMore} className={styles.loadMoreButton}>
                    ver mais ({Math.max(0, filteredProcessCount - visibleCount)} restantes)
                </button>
            )}
            <div className={styles.summaryStats}>
                <span>exibindo: {displayedProcesses.length} de {filteredProcessCount} (filtrados)</span>
                <span>total no sistema: {totalProcessesInSystem}</span>
            </div>
        </Card>
    );
};

export default ProcessListCard;
