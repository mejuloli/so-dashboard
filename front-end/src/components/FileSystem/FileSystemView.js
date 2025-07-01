import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão visual.
import styles from './FileSystemView.module.css';

// URL do endpoint da API para buscar informações do filesystem.
const API_URL_FILESYSTEM = 'http://localhost:5000/api/filesystem';

/**
 * Componente FileSystemView
 *
 * Exibe as partições do sistema de arquivos em formato de tabela.
 * Os dados são buscados periodicamente da API backend.
 */
const FileSystemView = () => {
  // Estado para armazenar as partições.
  const [partitions, setPartitions] = useState([]);
  // Estado para controlar o carregamento inicial dos dados.
  const [isLoading, setIsLoading] = useState(true);
  // Estado para armazenar mensagens de erro da busca de dados.
  const [fetchError, setFetchError] = useState(null);
  // Estado para ordenação
  const [sortBy, setSortBy] = useState('mountpoint');
  const [sortDir, setSortDir] = useState('asc');

  /**
   * Função para buscar os dados do filesystem da API.
   * Usa useCallback para memoização.
   */
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(API_URL_FILESYSTEM);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      setPartitions(data);
      setFetchError(null);
    } catch (error) {
      setFetchError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efeito para buscar dados na montagem.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Função para ordenar as partições
  const getSortedPartitions = () => {
    const sorted = [...partitions].sort((a, b) => {
      let vA, vB;
      switch (sortBy) {
        case 'device':
          vA = a.device || ''; vB = b.device || ''; break;
        case 'mountpoint':
          vA = a.mountpoint || ''; vB = b.mountpoint || ''; break;
        case 'type':
          vA = a.type || ''; vB = b.type || ''; break;
        case 'total_gb':
          vA = a.total_gb || 0; vB = b.total_gb || 0; break;
        case 'used_gb':
          vA = a.used_gb || 0; vB = b.used_gb || 0; break;
        case 'free_gb':
          vA = a.free_gb || 0; vB = b.free_gb || 0; break;
        case 'usage_percent':
          vA = a.usage_percent || 0; vB = b.usage_percent || 0; break;
        default:
          vA = a.mountpoint || ''; vB = b.mountpoint || ''; break;
      }
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  // --- Renderização Condicional ---
  if (isLoading) {
    return <Card title="Sistema de Arquivos"><p className={styles.loadingText}>Carregando informações do sistema de arquivos...</p></Card>;
  }
  if (fetchError) {
    return <Card title="Sistema de Arquivos"><p className={styles.errorText}>Erro: {fetchError}</p></Card>;
  }

  // --- Renderização Principal ---
  return (
    <Card title="Partições do Sistema de Arquivos" className={styles.processListCard}>
      <div className={styles.controlsContainer}>
        <span className={styles.summaryStats}>Total de Partições: {partitions.length}</span>
      </div>
      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('device')} style={{cursor:'pointer'}}>Dispositivo {sortBy==='device' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('mountpoint')} style={{cursor:'pointer'}}>Ponto de Montagem {sortBy==='mountpoint' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('type')} style={{cursor:'pointer'}}>Tipo {sortBy==='type' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('total_gb')} style={{cursor:'pointer'}}>Tamanho Total (GB) {sortBy==='total_gb' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('used_gb')} style={{cursor:'pointer'}}>Usado (GB) {sortBy==='used_gb' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('free_gb')} style={{cursor:'pointer'}}>Disponível (GB) {sortBy==='free_gb' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('usage_percent')} style={{cursor:'pointer'}}>Uso (%) {sortBy==='usage_percent' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {getSortedPartitions().map((p, idx) => (
              <tr key={idx}>
                <td>{p.device || '-'}</td>
                <td>{p.mountpoint || '-'}</td>
                <td>{p.type || '-'}</td>
                <td>{p.total_gb !== undefined ? p.total_gb : '-'}</td>
                <td>{p.used_gb !== undefined ? p.used_gb : '-'}</td>
                <td>{p.free_gb !== undefined ? p.free_gb : '-'}</td>
                <td>{p.usage_percent !== undefined ? `${p.usage_percent}%` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default FileSystemView;
