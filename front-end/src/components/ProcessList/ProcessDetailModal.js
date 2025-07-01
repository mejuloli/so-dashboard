// so-dashboard/front-end/src/components/ProcessList/ProcessDetailModal.js
import React, { useEffect, useState } from 'react';
import styles from './ProcessDetailModal.module.css'; // Estilos CSS Modules para este modal.

/**
 * Componente ProcessDetailModal
 * 
 * Exibe uma janela modal com informações detalhadas sobre um processo específico.
 * Inclui informações gerais, detalhes de uso de memória e uma lista de threads.
 * 
 * @param {object} props - As propriedades do componente.
 * @param {object|null} props.process - O objeto contendo os dados detalhados do processo a ser exibido.
 *                                    Se for `null` ou `undefined`, o modal não é renderizado.
 *                                    Espera-se que este objeto venha do endpoint `/api/process/<pid>`
 *                                    e contenha campos como: pid, name, user_name, cpu_percent,
 *                                    memory_rss_mb, create_time_iso, command_line,
 *                                    memory_details_kb (com vms, rss, vm_peak, code, data, stack, shared, swap, page_tables),
 *                                    threads_detailed_info (array de threads com id, name, status).
 * @param {function} props.onClose - Função callback a ser chamada quando o modal deve ser fechado
 *                                 (ex: clique no botão de fechar ou no overlay).
 * @returns {JSX.Element|null} O elemento JSX que representa o modal, ou `null` se `props.process` não for fornecido.
 */
const ProcessDetailModal = ({ process, onClose }) => {
    const [ioStats, setIoStats] = useState(null);
    const [ioError, setIoError] = useState(null);

    // Efeito para buscar estatísticas de E/S do processo quando o modal é aberto.
    useEffect(() => {
        if (process && process.pid) {
            // Faz a requisição para o endpoint de E/S do processo.
            fetch(`http://localhost:5000/api/process/${process.pid}/io`)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then(setIoStats)
                .catch(() => setIoError('Não foi possível obter dados de E/S para este processo.'));
        } else {
            // Reseta os estados de E/S se não houver um processo válido.
            setIoStats(null);
            setIoError(null);
        }
    }, [process]);

    // Se não houver dados do processo, não renderiza nada (o modal fica oculto).
    if (!process) {
        return null;
    }

    /**
     * Formata uma string de data ISO 8601 para um formato de data e hora local mais legível (pt-BR).
     * @param {string|null|undefined} isoString - A string de data no formato ISO 8601.
     * @returns {string} A data formatada (ex: "28/05/2025 10:13") ou "N/A" se a entrada for inválida.
     */
    const formatIsoDate = (isoString) => {
        if (!isoString) return 'N/A'; // Retorna "N/A" se a string ISO for nula ou vazia.
        try {
            const date = new Date(isoString);
            // Verifica se a data é válida após a conversão.
            if (isNaN(date.getTime())) {
                return 'N/A (Data Inválida)';
            }
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            // Em caso de erro na formatação, retorna a string original ou "N/A".
            console.error("Erro ao formatar data ISO:", isoString, e);
            return isoString || 'N/A';
        }
    };

    /**
     * Formata um valor em Kilobytes (KB) para Megabytes (MB) ou Gigabytes (GB) de forma apropriada.
     * @param {number|undefined|null} kb - O valor em Kilobytes.
     * @param {number} [decimals=1] - O número de casas decimais para a formatação. Padrão é 1.
     * @returns {string} A string formatada (ex: "12.3 MB", "1.2 GB", "500 KB") ou "N/A".
     */
    const formatKbToOptimalUnit = (kb, decimals = 1) => {
        if (kb === undefined || kb === null || isNaN(kb)) return 'N/A';
        if (kb === 0) return '0 KB'; // Caso especial para 0 KB.

        const kbThreshold = 1024; // Limite para mostrar em KB.
        const mbThreshold = 1024 * 1024; // Limite para mostrar em MB (1024 MB = 1 GB).

        if (kb < kbThreshold) { // Menos de 1 MB, mostra em KB.
            return `${kb.toFixed(0)} KB`; // KB geralmente não tem decimais.
        } else if (kb < mbThreshold) { // Menos de 1 GB, mostra em MB.
            const mb = kb / 1024;
            return `${mb.toFixed(decimals)} MB`;
        } else { // 1 GB ou mais, mostra em GB.
            const gb = kb / (1024 * 1024);
            return `${gb.toFixed(decimals)} GB`;
        }
    };

    // Renomeado de `formatKbToMbOrGb` para refletir melhor a funcionalidade.
    // A função `formatKbToMbOrGb` original do seu código foi mantida abaixo para referência
    // caso você precise especificamente dela, mas `formatKbToOptimalUnit` é geralmente mais útil.
    /*
    const formatKbToMbOrGb_original = (kb, decimals = 1) => {
        if (kb === undefined || kb === null || isNaN(kb)) return 'N/A';
        if (kb === 0) return '0 KB';
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(decimals)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(decimals)} GB`;
    };
    */


    /**
     * Impede a propagação do evento de clique do conteúdo do modal para o overlay.
     * Isso evita que o modal seja fechado ao clicar dentro de sua área de conteúdo.
     * @param {React.MouseEvent} e - O evento de clique.
     */
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    // Extrai os detalhes de memória e threads do objeto `process` para facilitar o uso.
    // Usa o operador OR (||) para fornecer um objeto/array vazio como fallback
    // caso esses campos não existam no objeto `process`, evitando erros.
    const memDetails = process.memory_details_kb || {};
    const detailedThreads = process.threads_detailed_info || [];

    // Mapeamento para nomes amigáveis das estatísticas de E/S
    const IO_STATS_LABELS = {
        rchar: 'Bytes Lidos (rchar)',
        wchar: 'Bytes Escritos (wchar)',
        syscr: 'Chamadas de Leitura (syscr)',
        syscw: 'Chamadas de Escrita (syscw)',
        read_bytes: 'Bytes Lidos do Disco',
        write_bytes: 'Bytes Escritos no Disco',
        cancelled_write_bytes: 'Bytes de Escrita Cancelados',
    };

    // --- Renderização do Modal ---
    return (
        // Overlay do modal: cobre a tela inteira e fecha o modal ao ser clicado.
        <div className={styles.modalOverlay} onClick={onClose}>
            {/* Conteúdo do modal: usa classes 'dashboard-card' para estilização base e estilos locais. */}
            {/* O clique no conteúdo é impedido de fechar o modal por `handleModalContentClick`. */}
            <div className={`${styles.modalContent} dashboard-card`} onClick={handleModalContentClick}>
                {/* Cabeçalho do modal com título e botão de fechar. */}
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        Detalhes do Processo {process.name ? `"${process.name}"` : ''} (PID: {process.pid})
                    </h3>
                    <button onClick={onClose} className={styles.modalCloseButton} aria-label="Fechar modal">
                        × {/* Caractere 'times' para o 'X' de fechar. */}
                    </button>
                </div>

                {/* Corpo do modal com as seções de informações. */}
                <div className={styles.modalBody}>
                    {/* --- Seção: Informações Gerais --- */}
                    <h4 className={styles.sectionTitle}>Informações Gerais</h4>
                    <div className={styles.detailGrid}>
                        {/* Cada par de spans representa um rótulo e seu valor. */}
                        <span className={styles.detailLabel}>Usuário:</span>
                        <span>{process.user_name || 'N/A'}</span>

                        <span className={styles.detailLabel}>CPU %:</span>
                        <span>{(process.cpu_percent || 0).toFixed(1)}</span>

                        <span className={styles.detailLabel}>Mem. RSS:</span>
                        {/* `process.memory_rss_mb` vem do backend em MB. Converte para KB para `formatKbToOptimalUnit`. */}
                        <span>{formatKbToOptimalUnit((process.memory_rss_mb || 0) * 1024)}</span>

                        <span className={styles.detailLabel}>Início:</span>
                        <span>{formatIsoDate(process.create_time_iso)}</span>
                    </div>
                    {/* Seção para a linha de comando, que pode ser longa. */}
                    <div className={styles.fullWidthDetailSectionCompact}>
                        <span className={styles.detailLabelFull}>Comando:</span>
                        <p className={styles.detailValueFullWrappedSmall}>{process.command_line || 'N/A'}</p>
                    </div>

                    {/* --- Seção: Detalhes de Memória (em KB) --- */}
                    <h4 className={styles.sectionTitle}>Uso de Memória (em KB)</h4>
                    <div className={styles.detailGrid}>
                        {/* Para cada métrica de memória, exibe o valor formatado ou "N/A". */}
                        {/* Os valores vêm de `memDetails` (que é `process.memory_details_kb`). */}
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

                        {/* Campos adicionais que seu backend pode fornecer (VmLck, VmPin, etc.) */}
                        {memDetails.vm_lck_kb !== undefined && memDetails.vm_lck_kb > 0 && (<>
                            <span className={styles.detailLabel}>Memória Bloqueada (VmLck):</span>
                            <span>{memDetails.vm_lck_kb.toLocaleString()} KB</span>
                        </>)}
                        {memDetails.vm_pin_kb !== undefined && memDetails.vm_pin_kb > 0 && (<>
                            <span className={styles.detailLabel}>Memória Fixada (VmPin):</span>
                            <span>{memDetails.vm_pin_kb.toLocaleString()} KB</span>
                        </>)}
                        {memDetails.vm_hwm_kb !== undefined && memDetails.vm_hwm_kb > 0 && (<>
                            <span className={styles.detailLabel}>Pico de Memória Física (VmHWM):</span>
                            <span>{memDetails.vm_hwm_kb.toLocaleString()} KB</span>
                        </>)}
                        {memDetails.rss_anon_kb !== undefined && memDetails.rss_anon_kb > 0 && (<>
                            <span className={styles.detailLabel}>RSS Anônima:</span>
                            <span>{memDetails.rss_anon_kb.toLocaleString()} KB</span>
                        </>)}
                        {memDetails.rss_file_kb !== undefined && memDetails.rss_file_kb > 0 && (<>
                            <span className={styles.detailLabel}>RSS Mapeada em Arquivo:</span>
                            <span>{memDetails.rss_file_kb.toLocaleString()} KB</span>
                        </>)}
                        {memDetails.rss_shmem_kb !== undefined && memDetails.rss_shmem_kb > 0 && (<>
                            <span className={styles.detailLabel}>RSS Memória Compartilhada:</span>
                            <span>{memDetails.rss_shmem_kb.toLocaleString()} KB</span>
                        </>)}
                    </div>

                    {/* --- Seção: Threads --- */}
                    {/* Renderiza a seção de threads apenas se houver informações de threads. */}
                    {(detailedThreads.length > 0) ? (
                        <div className={styles.threadsSection}>
                            <h4 className={styles.sectionTitle}>Threads ({detailedThreads.length})</h4>
                            {/* Container da tabela com scroll se houver muitas threads. */}
                            <div className={styles.threadsTableContainer}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>TID</th> {/* ID da Thread */}
                                            <th>Nome</th> {/* Nome da Thread */}
                                            <th>Estado</th> {/* Estado da Thread */}
                                            {/* Adicionar mais colunas se necessário, ex: %CPU por thread,
                                                mas isso exigiria dados adicionais do backend. */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Mapeia o array `detailedThreads` para renderizar uma linha para cada thread. */}
                                        {detailedThreads.map((thread, index) => (
                                            // Usa o ID da thread como chave, ou o índice como fallback.
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
                        // Se `detailedThreads` estiver vazio, mas `process.threads` (contagem total)
                        // for maior que 0, exibe uma mensagem indicando que os detalhes não foram fornecidos.
                        // Isso pode acontecer se o backend não conseguir listar as threads individuais.
                        process.threads > 0 && (
                            <div className={styles.threadsSection}>
                                <h4 className={styles.sectionTitle}>Threads ({process.threads})</h4>
                                <p className={styles.noThreadsDetailText}>
                                    Não foi possível obter detalhes das threads individuais.
                                </p>
                            </div>
                        )
                    )}

                    {/* --- Seção: Estatísticas de E/S (Projeto B) --- */}
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
                                <span>Nenhuma estatística de E/S disponível.</span>
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