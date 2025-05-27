// so-dashboard/front-end/src/App.js
import React, { useState } from 'react';
import DashboardLayout from './components/Layout/DashboardLayout';
import CpuUsageCard from './components/CpuUsage/CpuUsageCard';
import MemoryUsageCard from './components/MemoryUsage/MemoryUsageCard';
import ProcessListCard from './components/ProcessList/ProcessListCard';
import ProcessDetailModal from './components/ProcessList/ProcessDetailModal';
import TotalSystemMetricsCard from './components/SystemTotals/TotalSystemMetricsCard'; // NOVO
import ProcessStatusDistributionCard from './components/ProcessStatus/ProcessStatusDistributionCard'; // NOVO
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
      <div className={styles.midSectionCardsContainer}> {/* Novo container para os gráficos de totais e status */}
        <TotalSystemMetricsCard />
        <ProcessStatusDistributionCard />
      </div>
      <ProcessListCard onProcessSelect={handleProcessSelect} />

      <ProcessDetailModal
        process={selectedProcessForDetail}
        onClose={handleCloseDetailModal}
      />
    </DashboardLayout>
  );
}

export default App;