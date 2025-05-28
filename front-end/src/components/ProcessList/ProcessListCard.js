// so-dashboard/front-end/src/components/ProcessList/ProcessListCard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../Card/Card';
import ProcessDetailModal from './ProcessDetailModal';
import styles from './ProcessListCard.module.css';

const INITIAL_ITEMS_TO_SHOW = 10;
const ITEMS_PER_LOAD_MORE = 10;

const ProcessListCard = ({ onProcessSelect }) => {
    const [allProcesses, setAllProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_TO_SHOW);
    const [showAll, setShowAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'pid', direction: 'ascending' });

    const fetchData = useCallback(async () => { /* ... (lógica de fetch como antes, garantindo que todos os campos para o modal são parseados) ... */
        try {
            const response = await fetch('http://localhost:5000/api/processes');
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            let data = await response.json();
            data = data.map(proc => ({
                ...proc, pid: parseInt(proc.pid), threads: parseInt(proc.threads),
                cpu_percent: parseFloat(proc.cpu_percent || 0), memory_rss_mb: parseFloat(proc.memory_rss_mb || 0),
                ppid: parseInt(proc.ppid || 0), nice: parseInt(proc.nice || 0), priority: parseInt(proc.priority || 0),
                name: proc.name || "N/A", user_name: proc.user_name || "N/A", status: proc.status || "N/A",
                create_time_iso: proc.create_time_iso || null, executable_path: proc.executable_path || null, command_line: proc.command_line || null,
                memory_details_kb: proc.memory_details_kb || {}, threads_detailed_info: proc.threads_detailed_info || [],
            }));
            setAllProcesses(data); setError(null);
        } catch (e) {
            console.error("Erro processos:", e); setError(e.message);
        } finally { if (loading) setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    useEffect(() => { fetchData(); const intervalId = setInterval(fetchData, 5000); return () => clearInterval(intervalId); }, [fetchData]);

    const processedList = useMemo(() => { /* ... (lógica de filtro e sort como antes) ... */
        let tempProcesses = [...allProcesses];
        if (searchTerm) { const lowerSearchTerm = searchTerm.toLowerCase(); tempProcesses = tempProcesses.filter(proc => (proc.name && proc.name.toLowerCase().includes(lowerSearchTerm)) || String(proc.pid).includes(searchTerm) || (proc.user_name && proc.user_name.toLowerCase().includes(lowerSearchTerm))); }
        if (sortConfig.key !== null) { tempProcesses.sort((a, b) => { const valA = a[sortConfig.key]; const valB = b[sortConfig.key]; if (typeof valA === 'string' && typeof valB === 'string') { return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA); } if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; }); }
        return tempProcesses;
    }, [allProcesses, searchTerm, sortConfig]);

    const displayedProcesses = useMemo(() => { /* ... (lógica de paginação como antes) ... */
        if (showAll) { return processedList; } return processedList.slice(0, visibleCount);
    }, [processedList, visibleCount, showAll]);

    const handleLoadMore = () => { setVisibleCount(prevCount => Math.min(prevCount + ITEMS_PER_LOAD_MORE, processedList.length)); };
    const toggleShowAll = () => { const newShowAllState = !showAll; setShowAll(newShowAllState); if (!newShowAllState) { setVisibleCount(INITIAL_ITEMS_TO_SHOW); } };
    const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } else if (sortConfig.key === key && sortConfig.direction === 'descending') { direction = 'ascending'; } setSortConfig({ key, direction }); };
    const getSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : '';
    const handleProcessRowClick = (process) => { onProcessSelect(process); };

    const totalProcessesCountSystem = allProcesses.length; // Será usado pelo TotalSystemMetricsCard
    // const totalThreadsCountSystem = allProcesses.reduce((sum, p) => sum + (p.threads || 0), 0); // Também para TotalSystemMetricsCard

    const filteredProcessCount = processedList.length;

    if (loading && allProcesses.length === 0) return <Card title="Lista de Processos"><p className={styles.loadingText}>Carregando...</p></Card>;
    if (error && allProcesses.length === 0) return <Card title="Lista de Processos"><p className={styles.errorText}>Erro: {error}</p></Card>;

    return (
        <Card title="Lista de Processos" className={styles.processListCard} >
            <div className={styles.controlsContainer}>
                <div className={styles.filterContainer}> <input type="text" placeholder="Filtrar por PID, Nome, Usuário..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (!showAll) setVisibleCount(INITIAL_ITEMS_TO_SHOW); }} className={styles.filterInput} /> </div>
                <div className={styles.viewOptionsContainer}> <button onClick={toggleShowAll} className={styles.actionButton}> {showAll ? "Recolher Lista" : `Mostrar Todos (${filteredProcessCount})`} </button> </div>
            </div>
            <div className={styles.tableContainer}>
                <table>
                    <thead>
                        <tr> {/* PID, User, CPU (%), Memória (%), CMD */}
                            <th onClick={() => requestSort('pid')} className={styles.colPid}>PID{getSortIndicator('pid')}</th>
                            <th onClick={() => requestSort('user_name')} className={styles.colUser}>User{getSortIndicator('user_name')}</th>
                            <th onClick={() => requestSort('cpu_percent')} className={styles.colCpu}>CPU %{getSortIndicator('cpu_percent')}</th>
                            <th onClick={() => requestSort('memory_rss_mb')} className={styles.colMem}>Mem. (MB){getSortIndicator('memory_rss_mb')}</th>
                            <th onClick={() => requestSort('name')} className={styles.colCmd}>CMD/Nome{getSortIndicator('name')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedProcesses.map(proc => (
                            <tr key={proc.pid} onClick={() => handleProcessRowClick(proc)} className={styles.clickableRow}>
                                <td className={styles.colPid}>{proc.pid}</td>
                                <td className={styles.colUser}>{proc.user_name}</td>
                                <td className={styles.colCpu}>{(proc.cpu_percent || 0).toFixed(1)}</td>
                                <td className={styles.colMem}>{(proc.memory_rss_mb || 0).toFixed(1)}</td>
                                <td title={proc.command_line || proc.name} className={styles.colCmd}>{proc.name}</td>
                            </tr>
                        ))}
                        {displayedProcesses.length === 0 && !loading && (<tr><td colSpan="5" className={styles.noDataCell}>Nenhum processo encontrado.</td></tr>)}
                    </tbody>
                </table>
            </div>
            {!showAll && visibleCount < filteredProcessCount && (<button onClick={handleLoadMore} className={styles.loadMoreButton}> Ver Mais ({filteredProcessCount - visibleCount > 0 ? filteredProcessCount - visibleCount : 0} restantes) </button>)}
            <div className={styles.summaryStats}> <span>Exibindo: {displayedProcesses.length} de {filteredProcessCount}</span> <span>Total Processos (Sistema): {totalProcessesCountSystem}</span> </div>
        </Card>
    );
};
export default ProcessListCard;