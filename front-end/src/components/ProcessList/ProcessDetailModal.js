// so-dashboard/front-end/src/components/ProcessList/ProcessDetailModal.js
import React from 'react';
import styles from './ProcessDetailModal.module.css';

const ProcessDetailModal = ({ process, onClose }) => {
    if (!process) return null;

    const formatIsoDate = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return isoString; }
    };

    const formatKbToMbOrGb = (kb, decimals = 1) => {
        if (kb === undefined || kb === null || isNaN(kb)) return 'N/A';
        if (kb === 0) return '0 KB';
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(decimals)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(decimals)} GB`;
    };

    const handleModalContentClick = (e) => { e.stopPropagation(); };

    // o backend envia 'memory_details_kb' e 'threads_detailed_info'
    const memDetails = process.memory_details_kb || {};
    const detailedThreads = process.threads_detailed_info || [];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={`${styles.modalContent} dashboard-card`} onClick={handleModalContentClick}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>{process.name} (PID: {process.pid})</h3>
                    <button onClick={onClose} className={styles.modalCloseButton}>×</button>
                </div>
                <div className={styles.modalBody}>
                    {/* Informações Gerais */}
                    <h4 className={styles.sectionTitle}>Informações Gerais</h4>
                    <div className={styles.detailGrid}>
                        <span className={styles.detailLabel}>Usuário:</span><span>{process.user_name || 'N/A'}</span>
                        <span className={styles.detailLabel}>CPU %:</span><span>{(process.cpu_percent || 0).toFixed(1)}</span>
                        <span className={styles.detailLabel}>Mem. RSS:</span><span>{formatKbToMbOrGb(process.memory_rss_mb * 1024) || 'N/A'}</span> {/* Convertendo MB para KB para a função */}
                        <span className={styles.detailLabel}>Criado em:</span><span>{formatIsoDate(process.create_time_iso)}</span>
                    </div>
                    <div className={styles.fullWidthDetailSectionCompact}>
                        <span className={styles.detailLabelFull}>Comando:</span>
                        <p className={styles.detailValueFullWrappedSmall}>{process.command_line || 'N/A'}</p>
                    </div>

                    {/* Uso de Memória Detalhado */}
                    <h4 className={styles.sectionTitle}>Detalhes de Memória (kB)</h4>
                    <div className={styles.detailGrid}>
                        <span className={styles.detailLabel}>Virtual Total (VmSize):</span><span>{memDetails.vms !== undefined ? memDetails.vms.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Física (VmRSS):</span><span>{memDetails.rss !== undefined ? memDetails.rss.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Pico Virtual (VmPeak):</span><span>{memDetails.vm_peak !== undefined ? memDetails.vm_peak.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Código (VmExe):</span><span>{memDetails.code !== undefined ? memDetails.code.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Heap/Dados (VmData):</span><span>{memDetails.data !== undefined ? memDetails.data.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Pilha (VmStk):</span><span>{memDetails.stack !== undefined ? memDetails.stack.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Bibliotecas (VmLib):</span><span>{memDetails.shared !== undefined ? memDetails.shared.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Swap (VmSwap):</span><span>{memDetails.swap !== undefined ? memDetails.swap.toLocaleString() : 'N/A'}</span>
                        <span className={styles.detailLabel}>Tabelas de Página (VmPTE):</span><span>{memDetails.page_tables !== undefined ? memDetails.page_tables.toLocaleString() : 'N/A'}</span>
                    </div>

                    {/* Threads */}
                    {detailedThreads.length > 0 && (
                        <div className={styles.threadsSection}>
                            <h4 className={styles.sectionTitle}>Threads ({detailedThreads.length})</h4>
                            <div className={styles.threadsTableContainer}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>TID</th>
                                            <th>Nome da Thread</th>
                                            <th>Estado</th>
                                            {/* <th>CPU %</th>  pode ser adicionado também se for pertinente */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailedThreads.map((thread, index) => (
                                            <tr key={thread.id || index}>
                                                <td>{index + 1}</td>
                                                <td>{thread.id}</td>
                                                <td>{thread.name || 'N/A'}</td>
                                                <td>{thread.status || 'N/A'}</td>
                                                {/* <td>{(thread.cpu_percent || 0).toFixed(1)}</td> */}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {process.threads > 0 && detailedThreads.length === 0 && (
                        <div className={styles.threadsSection}>
                            <h4 className={styles.sectionTitle}>Threads</h4>
                            <p className={styles.noThreadsDetailText}>Informações detalhadas das threads não fornecidas pelo backend.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default ProcessDetailModal;