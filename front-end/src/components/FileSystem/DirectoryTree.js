import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // componente base de card
import styles from './DirectoryTree.module.css'; // estilos css module

// endpoint da api de diretórios
const API_URL_DIRECTORY = 'http://localhost:5000/api/filesystem/directory';

// formata tamanho de arquivo
const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// componente de árvore de diretórios
const DirectoryTree = () => {
  const [currentPath, setCurrentPath] = useState('/'); // caminho atual
  const [contents, setContents] = useState([]); // conteúdo do diretório
  const [isLoading, setIsLoading] = useState(true); // estado de carregamento
  const [fetchError, setFetchError] = useState(null); // erro de busca
  const [sortBy, setSortBy] = useState('name'); // campo de ordenação
  const [sortDir, setSortDir] = useState('asc'); // direção da ordenação

  // ordena o conteúdo da tabela
  const getSortedContents = () => {
    const sorted = [...contents].sort((a, b) => {
      let vA, vB;
      switch (sortBy) {
        case 'size': vA = a.size || 0; vB = b.size || 0; break;
        case 'permissions': vA = a.permissions || ''; vB = b.permissions || ''; break;
        case 'type': vA = a.is_dir ? 0 : 1; vB = b.is_dir ? 0 : 1; break;
        default: vA = a.name.toLowerCase(); vB = b.name.toLowerCase(); break;
      }
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // muda critério de ordenação ao clicar no cabeçalho
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  // busca conteúdo do diretório
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL_DIRECTORY}?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) throw new Error('erro ao buscar diretório');
      const data = await response.json();
      setContents(data.contents || []);
      setFetchError(null);
    } catch (error) {
      setFetchError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  // atualiza conteúdo ao mudar de caminho
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // navega para subdiretório
  const handleNavigate = (dir) => {
    const newPath = currentPath === '/' ? `/${dir}` : `${currentPath}/${dir}`;
    setCurrentPath(newPath);
  };

  // volta um nível
  const handleGoUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    setCurrentPath(newPath === '/' ? '/' : newPath);
  };

  // renderização condicional
  if (isLoading) {
    return (
      <Card title="navegação de diretórios">
        <p className={styles.loadingText}>carregando...</p>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card title="navegação de diretórios">
        <p className={styles.errorText}>erro: {fetchError}</p>
      </Card>
    );
  }

  // render principal
  return (
    <Card title="navegação de diretórios" className={styles.processListCard}>
      <div className={styles.controlsRow}>
        <button
          onClick={handleGoUp}
          disabled={currentPath === '/'}
          className={styles.upButton}
          title="voltar"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'block', margin: 'auto' }} aria-hidden="true">
            <polyline points="12,4 6,9 12,14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className={styles.currentPath} title={currentPath}>{currentPath}</span>
      </div>

      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                nome {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('size')} style={{ cursor: 'pointer' }}>
                tamanho {sortBy === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('permissions')} style={{ cursor: 'pointer' }}>
                permissões {sortBy === 'permissions' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                tipo {sortBy === 'type' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {getSortedContents().map((item, idx) => (
              <tr
                key={idx}
                onDoubleClick={() => item.is_dir && handleNavigate(item.name)}
                className={item.is_dir ? styles.clickableRow : ''}
                tabIndex={item.is_dir ? 0 : undefined}
                title={item.name}
              >
                <td>
                  {item.is_dir ? (
                    <span className={styles.dirLink}>📁 {item.name}</span>
                  ) : (
                    <span>📄 {item.name}</span>
                  )}
                </td>
                <td>{item.size_human || '-'}</td>
                <td>{item.permissions || '-'}</td>
                <td>{item.is_dir ? 'diretório' : 'arquivo'}</td>
              </tr>
            ))}
            {getSortedContents().length === 0 && (
              <tr>
                <td colSpan="4" className={styles.noDataCell}>diretório vazio.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DirectoryTree;
