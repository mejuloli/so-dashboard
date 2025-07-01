import React, { useState, useEffect, useCallback } from 'react';
import Card from '../Card/Card'; // Componente base para o cartão visual.
import styles from './DirectoryTree.module.css';

// URL do endpoint da API para buscar conteúdo de diretórios.
const API_URL_DIRECTORY = 'http://localhost:5000/api/filesystem/directory';

/**
 * Função utilitária para formatar tamanho de arquivo.
 * @param {number} bytes - Tamanho em bytes.
 * @returns {string} Tamanho formatado.
 */
const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Componente DirectoryTree
 *
 * Exibe a navegação de diretórios em formato de tabela, permitindo navegar
 * entre pastas e visualizar arquivos e atributos.
 * Os dados são buscados da API backend.
 */
const DirectoryTree = () => {
  // Estado para o caminho atual.
  const [currentPath, setCurrentPath] = useState('/');
  // Estado para o contedo do diretório.
  const [contents, setContents] = useState([]);
  // Estado para carregamento e erro.
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  // Estado para ordenação
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Função para ordenar os itens
  const getSortedContents = () => {
    const sorted = [...contents].sort((a, b) => {
      let vA, vB;
      switch (sortBy) {
        case 'size':
          vA = a.size || 0; vB = b.size || 0; break;
        case 'permissions':
          vA = a.permissions || ''; vB = b.permissions || ''; break;
        case 'type':
          vA = a.is_dir ? 0 : 1; vB = b.is_dir ? 0 : 1; break;
        default:
          vA = a.name.toLowerCase(); vB = b.name.toLowerCase(); break;
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

  /**
   * Função para buscar o conteúdo do diretório da API.
   * Usa useCallback para memoização.
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL_DIRECTORY}?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) throw new Error('Erro ao buscar diretório');
      const data = await response.json();
      setContents(data.contents || []);
      setFetchError(null);
    } catch (error) {
      setFetchError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  // Efeito para buscar dados ao mudar o caminho.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Manipulador para navegar para um subdiretório.
   * @param {string} dir - Nome do diretório.
   */
  const handleNavigate = (dir) => {
    const newPath = currentPath === '/' ? `/${dir}` : `${currentPath}/${dir}`;
    setCurrentPath(newPath);
  };

  /**
   * Manipulador para subir um nível na árvore de diretórios.
   */
  const handleGoUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    setCurrentPath(newPath === '/' ? '/' : newPath);
  };

  // --- Renderização Condicional ---
  if (isLoading) {
    return <Card title="Navegação de Diretórios"><p className={styles.loadingText}>Carregando...</p></Card>;
  }
  if (fetchError) {
    return <Card title="Navegação de Diretórios"><p className={styles.errorText}>Erro: {fetchError}</p></Card>;
  }

  // --- Renderização Principal ---
  return (
    <Card title="Navegação de Diretórios" className={styles.processListCard}>
      <div className={styles.controlsRow}>
        <button onClick={handleGoUp} disabled={currentPath === '/'} className={styles.upButton} title="Voltar">
          <svg width="18" height="18" viewBox="0 0 18 18" style={{display:'block',margin:'auto'}} aria-hidden="true">
            <polyline points="12,4 6,9 12,14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.currentPath} title={currentPath}>{currentPath}</span>
      </div>
      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{cursor:'pointer'}}>Nome {sortBy==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('size')} style={{cursor:'pointer'}}>Tamanho {sortBy==='size' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('permissions')} style={{cursor:'pointer'}}>Permissões {sortBy==='permissions' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th onClick={() => handleSort('type')} style={{cursor:'pointer'}}>Tipo {sortBy==='type' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {getSortedContents().map((item, idx) => (
              <tr key={idx}
                  onDoubleClick={() => item.is_dir && handleNavigate(item.name)}
                  className={item.is_dir ? styles.clickableRow : ''}
                  tabIndex={item.is_dir ? 0 : undefined}
                  title={item.name}
              >
                <td>
                  {item.is_dir ? (
                    <span className={styles.dirLink}>
                      📁 {item.name}
                    </span>
                  ) : (
                    <span>📄 {item.name}</span>
                  )}
                </td>
                <td>{item.size_human || '-'}</td>
                <td>{item.permissions || '-'}</td>
                <td>{item.is_dir ? 'Diretório' : 'Arquivo'}</td>
              </tr>
            ))}
            {getSortedContents().length === 0 && (
              <tr>
                <td colSpan="4" className={styles.noDataCell}>Diretório vazio.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DirectoryTree;
