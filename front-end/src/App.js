// so-dashboard/front-end/src/App.js
import React, { useState } from 'react';
import DashboardTabs from './components/Layout/DashboardTabs';
import CpuUsageCard from './components/CpuUsage/CpuUsageCard';
import MemoryUsageCard from './components/MemoryUsage/MemoryUsageCard';
import ProcessListCard from './components/ProcessList/ProcessListCard';
import ProcessDetailModal from './components/ProcessList/ProcessDetailModal';
import SystemSummaryCards from './components/SystemTotals/TotalSystemMetricsCard'; // Importa o wrapper
import FileSystemView from './components/FileSystem/FileSystemView';
import DirectoryTree from './components/FileSystem/DirectoryTree';
import styles from './App.module.css';

function App() {
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState(null);
  const handleProcessSelect = (process) => { setSelectedProcessForDetail(process); };
  const handleCloseDetailModal = () => { setSelectedProcessForDetail(null); };

  return (
    <DashboardTabs>
      <div className={styles.topCardsContainer}>
        <CpuUsageCard />
        <MemoryUsageCard />
      </div>
      <div className={styles.summaryCardsContainer}> {/* container para os cards de totais */}
        <SystemSummaryCards /> {/* renderiza os dois cards de totais */}
      </div>
      <ProcessListCard onProcessSelect={handleProcessSelect} />
      <ProcessDetailModal process={selectedProcessForDetail} onClose={handleCloseDetailModal} />
      {/* Projeto B: FileSystem e Navegação de Diretórios */}
      <FileSystemView />
      <DirectoryTree />
    </DashboardTabs>
  );
}

export default App;