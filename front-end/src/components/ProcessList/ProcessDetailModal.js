// so-dashboard/front-end/src/components/ProcessList/ProcessDetailModal.js
import React from 'react';
import Card from '../Card/Card'; // Reutilizar o Card para o estilo do modal
import styles from './ProcessDetailModal.module.css'; // CSS específico para o modal

const ProcessDetailModal = ({ process, onClose }) => {
    if (!process) return null;

    const formatIsoDate = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return isoString; }
    };

    // Impedir que o clique dentro do modal feche o modal (se o overlay for clicável para fechar)
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}> {/* Overlay para fechar ao clicar fora */}
            <div className={`${styles.modalContent} dashboard-card`} onClick={handleModalContentClick}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>{process.name} (PID: {process.pid})</h3>
                    <button onClick={onClose} className={styles.modalCloseButton}>×</button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.detailGrid}>
                        <span className={styles.detailLabel}>Usuário:</span><span>{process.user_name || 'N/A'}</span>
                        <span className={styles.detailLabel}>Status:</span><span>{process.status || 'N/A'}</span>
                        <span className={styles.detailLabel}>PPID:</span><span>{process.ppid !== undefined ? process.ppid : 'N/A'}</span>
                        <span className={styles.detailLabel}>Nice:</span><span>{process.nice !== undefined ? process.nice : 'N/A'}</span>
                        <span className={styles.detailLabel}>Prioridade:</span><span>{process.priority !== undefined ? process.priority : 'N/A'}</span>
                        <span className={styles.detailLabel}>Threads:</span><span>{process.threads !== undefined ? process.threads : 'N/A'}</span>
                        <span className={styles.detailLabel}>CPU %:</span><span>{(process.cpu_percent || 0).toFixed(1)}</span>
                        <span className={styles.detailLabel}>Mem. RSS:</span><span>{(process.memory_rss_mb || 0).toFixed(1)} MB</span>
                        <span className={styles.detailLabel}>Criado em:</span><span>{formatIsoDate(process.create_time_iso)}</span>
                    </div>

                    <div className={styles.fullWidthDetailSection}>
                        <span className={styles.detailLabelFull}>Executável:</span>
                        <p className={styles.detailValueFullWrapped}>{process.executable_path || 'N/A'}</p>
                    </div>

                    <div className={styles.fullWidthDetailSection}>
                        <span className={styles.detailLabelFull}>Linha de Comando:</span>
                        <p className={styles.detailValueFullWrapped}>{process.command_line || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcessDetailModal;