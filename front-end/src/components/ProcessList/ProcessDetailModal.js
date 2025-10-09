// so-dashboard/front-end/src/components/ProcessList/ProcessDetailModal.js
import React, { useEffect, useState } from 'react';
import styles from './ProcessDetailModal.module.css'; // estilos do modal

// modal com detalhes de um processo (info geral, memória e threads)
const ProcessDetailModal = ({ process, onClose }) => {
    const [ioStats, setIoStats] = useState(null);
    const [ioError, setIoError] = useState(null);

    // busca estatísticas de e/s quando o modal abre
    useEffect(() => {
        if (process && process.pid) {
            fetch(`http://localhost:5000/api/process/${process.pid}/io`)
                .then(res => (res.ok ? res.json() : Promise.reject(res)))
                .then(setIoStats)
                .catch(() => setIoError('Não foi possível obter dados de E/S para este processo.'));
        } else {
            setIoStats(null);
            setIoError(null);
        }
    }, [process]);

    // se não houver processo, não renderiza
    if (!process) return null;

    // formata iso 8601 para pt-br legível
    const formatIsoDate = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return 'N/A (Data Inválida)';
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            console.error('erro ao formatar data iso:', isoString, e);
            return isoString || 'N/A';
        }
    };

    // formata kb para unidade ideal (kb/mb/gb)
    const formatKbToOptimalUnit = (kb, decimals = 1) => {
        if (kb === undefined || kb === null || isNaN(kb)) return 'N/A';
        if (kb === 0) return '0 KB';
        const kbThreshold = 1024;
        const mbThreshold = 1024 * 1024;
        if (kb < kbThreshold) return `${kb.toFixed(0)} KB`;
        if (kb < mbThreshold) return `${(kb / 1024).toFixed(decimals)} MB`;
        return `${(kb / (1024 * 1024)).toFixed(decimals)} GB`;
    };

    // impede clique dentro do modal de fechar o overlay
    const handleModalContentClick = (e) => e.stopPropagation();

    // acessos seguros a campos do processo
    const memDetails = process.memory_details_kb || {};
    const detailedThreads = process.threads_detailed_info || [];

    // rótulos amigáveis para métricas de e/s
    const IO_STATS_LABELS = {
        rchar: 'Bytes Lidos (rchar)',
        wchar: 'Bytes Escritos (wchar)',
        syscr: 'Chamadas de Leitura (syscr)',
        syscw: 'Chamadas de Escrita (syscw)',
        read_bytes: 'Bytes Lidos do Disco',
        write_bytes: 'Bytes Escritos no Disco',
        cancelled_write_bytes: 'Bytes de Escrita Cancelados',
    };

    // render do modal
    return (
        // overlay: fecha ao clicar fora
        <div className={styles.modalOverlay} onClick={onClose}>
            {/* conteúdo do modal */}
            <div className={`${styles.modalContent} dashboard-card`} onClick={handleModalContentClick}>
                {/* cabeçalho */}
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        Detalhes do Processo {process.name ? `"${process.name}"` : ''} (PID: {process.pid})
                    </h3>
                    <button onClick={onClose} className={styles.modalCloseButton} aria-label="fechar modal">
                        ×
                    </button>
                </div>

                {/* corpo */}
                <div className={styles.modalBody}>
                    {/* seção: informações gerais */}
                    <h4 className={styles.sectionTitle}>Informações Gerais</h4>
                    <div className={styles.detailGrid}>
                        <span className={styles.detailLabel}>Usuário:</span>
                        <span>{process.user_name || 'N/A'}</span>

                        <span className={styles.detailLabel}>CPU %:</span>
                        <span>{(process.cpu_percent || 0).toFixed(1)}</span>

                        <span className={styles.detailLabel}>Mem. RSS:</span>
                        {/* memory_rss_mb vem em mb; converte para kb para a função */}
                        <span>{formatKbToOptimalUnit((process.memory_rss_mb || 0) * 1024)}</span>

                        <span className={styles.detailLabel}>Início:</span>
                        <span>{formatIsoDate(process.create_time_iso)}</span>
                    </div>

                    {/* comando completo */}
                    <div className={styles.fullWidthDetailSectionCompact}>
                        <span className={styles.detailLabelFull}>Comando:</span>
                        <p className={styles.detailValueFullWrappedSmall}>{process.command_line || 'N/A'}</p>
                    </div>

                    {/* seção: memória (em kb) */}
                    <h4 className={styles.sectionTitle}>Uso de Memória (em KB)</h4>
                    <div className={styles.detailGrid}>
                        <span className={styles.detailLabel}>Memória Virtual Total (VmSize):</span>
                        <span>{memDetails.vms !== undefined ? memDetails.vms.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Memória Física (VmRSS):</span>
                        <span>{memDetails.rss !== undefined ? memDetails.rss.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Pico de Memória Virtual (VmPeak):</span>
                        <span>{memDetails.vm_peak !== undefined ? memDetails.vm_peak.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Memória do Código (VmExe):</span>
                        <span>{memDetails.code !== undefined ? memDetails.code.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Heap / Dados (VmData):</span>
                        <span>{memDetails.data !== undefined ? memDetails.data.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Pilha (VmStk):</span>
                        <span>{memDetails.stack !== undefined ? memDetails.stack.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Bibliotecas Compartilhadas (VmLib):</span>
                        <span>{memDetails.shared !== undefined ? memDetails.shared.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Memória em Swap (VmSwap):</span>
                        <span>{memDetails.swap !== undefined ? memDetails.swap.toLocaleString() + ' KB' : 'N/A'}</span>

                        <span className={styles.detailLabel}>Tamanho Tabelas de Página (VmPTE):</span>
                        <span>{memDetails.page_tables !== undefined ? memDetails.page_tables.toLocaleString() + ' KB' : 'N/A'}</span>

                        {/* campos opcionais se presentes */}
                        {memDetails.vm_lck_kb !== undefined && memDetails.vm_lck_kb > 0 && (
                            <>
                                <span className={styles.detailLabel}>Memória Bloqueada (VmLck):</span>
                                <span>{memDetails.vm_lck_kb.toLocaleString()} KB</span>
                            </>
                        )}
                        {memDetails.vm_pin_kb !== undefined && memDetails.vm_pin_kb > 0 && (
                            <>
                                <span className={styles.detailLabel}>Memória Fixada (VmPin):</span>
                                <span>{memDetails.vm_pin_kb.toLocaleString()} KB</span>
                            </>
                        )}
                        {memDetails.vm_hwm_kb !== undefined && memDetails.vm_hwm_kb > 0 && (
                            <>
                                <span className={styles.detailLabel}>Pico de Memória Física (VmHWM):</span>
                                <span>{memDetails.vm_hwm_kb.toLocaleString()} KB</span>
                            </>
                        )}
                        {memDetails.rss_anon_kb !== undefined && memDetails.rss_anon_kb > 0 && (
                            <>
                                <span className={styles.detailLabel}>RSS Anônima:</span>
                                <span>{memDetails.rss_anon_kb.toLocaleString()} KB</span>
                            </>
                        )}
                        {memDetails.rss_file_kb !== undefined && memDetails.rss_file_kb > 0 && (
                            <>
                                <span className={styles.detailLabel}>RSS Mapeada em Arquivo:</span>
                                <span>{memDetails.rss_file_kb.toLocaleString()} KB</span>
                            </>
                        )}
                        {memDetails.rss_shmem_kb !== undefined && memDetails.rss_shmem_kb > 0 && (
                            <>
                                <span className={styles.detailLabel}>RSS Memória Compartilhada:</span>
                                <span>{memDetails.rss_shmem_kb.toLocaleString()} KB</span>
                            </>
                        )}
                    </div>

                    {/* seção: threads */}
                    {detailedThreads.length > 0 ? (
                        <div className={styles.threadsSection}>
                            <h4 className={styles.sectionTitle}>Threads ({detailedThreads.length})</h4>
                            <div className={styles.threadsTableContainer}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>TID</th>
                                            <th>Nome</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailedThreads.map((thread, index) => (
                                            <tr key={thread.id || `thread-${index}`}>
                                                <td>{thread.id}</td>
                                                <td>{thread.name || 'N/A'}</td>
                                                <td>{thread.status || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        process.threads > 0 && (
                            <div className={styles.threadsSection}>
                                <h4 className={styles.sectionTitle}>Threads ({process.threads})</h4>
                                <p className={styles.noThreadsDetailText}>
                                    Não foi possível obter detalhes das threads individuais.
                                </p>
                            </div>
                        )
                    )}

                    {/* seção: estatísticas de e/s */}
                    <h4 className={styles.sectionTitle}>Estatísticas de E/S</h4>
                    {ioError && <div className={styles.ioError}>{ioError}</div>}
                    {ioStats && (ioStats.io_stats || ioStats.open_files) ? (
                        <div className={styles.detailGrid}>
                            {ioStats.io_stats && Object.keys(ioStats.io_stats).length > 0 ? (
                                Object.entries(ioStats.io_stats).map(([key, value]) => (
                                    <React.Fragment key={key}>
                                        <span className={styles.detailLabel}>{IO_STATS_LABELS[key] || key}:</span>
                                        <span>{value.toLocaleString()}</span>
                                    </React.Fragment>
                                ))
                            ) : (
                                <span>nenhuma estatística de e/s disponível.</span>
                            )}
                            {ioStats.open_files && ioStats.open_files.length > 0 && (
                                <>
                                    <span className={styles.detailLabel}>Arquivos Abertos:</span>
                                    <span>
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {ioStats.open_files.map((file, idx) => (
                                                <li key={idx}>
                                                    {file.path ? `${file.path} (${file.type})` : file}
                                                </li>
                                            ))}
                                        </ul>
                                    </span>
                                </>
                            )}
                        </div>
                    ) : !ioError ? (
                        <div>Carregando estatísticas de E/S...</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ProcessDetailModal;
