// so-dashboard/front-end/src/components/ProcessList/ProcessListCard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../Card/Card';
import styles from './ProcessListCard.module.css';
// import { FiList, FiFilter, FiChevronUp, FiChevronDown, FiMaximize, FiMinimize, FiSearch } from 'react-icons/fi'; // Ícones opcionais

const INITIAL_ITEMS_TO_SHOW = 10;
const ITEMS_PER_LOAD_MORE = 10;

const ProcessListCard = () => {
    const [allProcesses, setAllProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_TO_SHOW);
    const [showAll, setShowAll] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'pid', direction: 'ascending' });

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/processes');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            let data = await response.json();

            data = data.map(proc => ({
                ...proc,
                pid: parseInt(proc.pid),
                threads: parseInt(proc.threads),
                cpu_percent: parseFloat(proc.cpu_percent || 0),
                memory_rss_mb: parseFloat(proc.memory_rss_mb || 0),
                name: proc.name || "N/A",
                user_name: proc.user_name || "N/A",
                status: proc.status || "N/A",
            }));

            setAllProcesses(data);
            setError(null);
        } catch (e) {
            console.error("Erro ao buscar lista de processos:", e);
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

    const processedList = useMemo(() => {
        let tempProcesses = [...allProcesses];
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            tempProcesses = tempProcesses.filter(proc =>
                (proc.name && proc.name.toLowerCase().includes(lowerSearchTerm)) ||
                String(proc.pid).includes(searchTerm) ||
                (proc.user_name && proc.user_name.toLowerCase().includes(lowerSearchTerm))
            );
        }
        if (sortConfig.key !== null) {
            tempProcesses.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return tempProcesses;
    }, [allProcesses, searchTerm, sortConfig]);

    const displayedProcesses = useMemo(() => {
        if (showAll) {
            return processedList;
        }
        return processedList.slice(0, visibleCount);
    }, [processedList, visibleCount, showAll]);

    const handleLoadMore = () => {
        setVisibleCount(prevCount => Math.min(prevCount + ITEMS_PER_LOAD_MORE, processedList.length));
    };

    const toggleShowAll = () => {
        const newShowAllState = !showAll;
        setShowAll(newShowAllState);
        if (!newShowAllState) {
            setVisibleCount(INITIAL_ITEMS_TO_SHOW);
        }
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
        // Se não estiver mostrando todos, resetar visibleCount pode ser desejável ao ordenar
        // para sempre começar do topo da lista ordenada.
        // if (!showAll) {
        //     setVisibleCount(INITIAL_ITEMS_TO_SHOW);
        // }
        // No entanto, como a lista `processedList` é reordenada, o `displayedProcesses`
        // já pegará o slice correto com base no `visibleCount` atual.
        // Resetar `visibleCount` aqui faria o usuário perder a quantidade de itens que ele já carregou.
        // Se o desejo é resetar para 10 itens ao ordenar, descomente o if acima.
    };

    const getSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : '';

    const totalProcessesCountSystem = allProcesses.length;
    const totalThreadsCountSystem = allProcesses.reduce((sum, p) => sum + (p.threads || 0), 0);
    const filteredProcessCount = processedList.length;

    if (loading && allProcesses.length === 0) return <Card title="Lista de Processos"><p className={styles.loadingText}>Carregando processos...</p></Card>;
    if (error && allProcesses.length === 0) return <Card title="Lista de Processos"><p className={styles.errorText}>Erro ao carregar: {error}</p></Card>;

    return (
        <Card title="Lista de Processos" className={styles.processListCard} /* icon={<FiList size={18}/>} */>
            <div className={styles.controlsContainer}>
                <div className={styles.filterContainer}>
                    <input type="text" placeholder="Filtrar por PID, Nome, Usuário..." value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!showAll) setVisibleCount(INITIAL_ITEMS_TO_SHOW);
                        }}
                        className={styles.filterInput} />
                </div>
                <div className={styles.viewOptionsContainer}>
                    <button onClick={toggleShowAll} className={styles.actionButton}>
                        {showAll ? "Recolher Lista" : `Mostrar Todos (${filteredProcessCount})`}
                    </button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('pid')}>PID{getSortIndicator('pid')}</th>
                            <th onClick={() => requestSort('name')}>Nome{getSortIndicator('name')}</th>
                            <th onClick={() => requestSort('user_name')}>Usuário{getSortIndicator('user_name')}</th>
                            <th onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
                            <th onClick={() => requestSort('cpu_percent')}>CPU %{getSortIndicator('cpu_percent')}</th>
                            <th onClick={() => requestSort('memory_rss_mb')}>Mem. (MB){getSortIndicator('memory_rss_mb')}</th>
                            <th onClick={() => requestSort('threads')}>Threads{getSortIndicator('threads')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedProcesses.map(proc => (
                            <tr key={proc.pid}>
                                <td>{proc.pid}</td><td>{proc.name}</td><td>{proc.user_name}</td><td>{proc.status}</td>
                                <td>{(proc.cpu_percent || 0).toFixed(1)}</td><td>{(proc.memory_rss_mb || 0).toFixed(1)}</td><td>{proc.threads}</td>
                            </tr>
                        ))}
                        {displayedProcesses.length === 0 && !loading && (<tr><td colSpan="7" className={styles.noDataCell}>Nenhum processo encontrado.</td></tr>)}
                    </tbody>
                </table>
            </div>

            {!showAll && visibleCount < filteredProcessCount && (
                <button onClick={handleLoadMore} className={styles.loadMoreButton}>
                    Ver Mais ({filteredProcessCount - visibleCount > 0 ? filteredProcessCount - visibleCount : 0} restantes)
                </button>
            )}

            <div className={styles.summaryStats}>
                <span>Exibindo: {displayedProcesses.length} de {filteredProcessCount} (Filtrados)</span>
                <span>Total no Sistema: {totalProcessesCountSystem} Processos, {totalThreadsCountSystem} Threads</span>
            </div>
        </Card>
    );
};

export default ProcessListCard;