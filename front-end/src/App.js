// so-dashboard/front-end/src/App.js
import React, { useState } from 'react';
import DashboardLayout from './components/Layout/DashboardLayout';
import CpuUsageCard from './components/CpuUsage/CpuUsageCard';
import MemoryUsageCard from './components/MemoryUsage/MemoryUsageCard';
import ProcessListCard from './components/ProcessList/ProcessListCard';
import ProcessDetailModal from './components/ProcessList/ProcessDetailModal';
import SystemSummaryCards from './components/SystemTotals/TotalSystemMetricsCard'; // Importa o wrapper
// Removido: import ProcessStatusDistributionCard from './components/ProcessStatus/ProcessStatusDistributionCard';
import styles from './App.module.css';

function App() {
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState(null);
  const handleProcessSelect = (process) => { setSelectedProcessForDetail(process); };
  const handleCloseDetailModal = () => { setSelectedProcessForDetail(null); };

  return (
    <DashboardLayout>
      <div className={styles.topCardsContainer}>
        <CpuUsageCard />
        <MemoryUsageCard />
      </div>
      <div className={styles.summaryCardsContainer}> {/* Novo container para os cards de totais */}
        <SystemSummaryCards /> {/* Renderiza os dois cards de totais */}
      </div>
      <ProcessListCard onProcessSelect={handleProcessSelect} />
      <ProcessDetailModal process={selectedProcessForDetail} onClose={handleCloseDetailModal} />
    </DashboardLayout>
  );
}
export default App;