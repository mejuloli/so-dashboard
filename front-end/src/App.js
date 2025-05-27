// so-dashboard/front-end/src/App.js
import React, { useState } from 'react'; // Adicionado useState
import DashboardLayout from './components/Layout/DashboardLayout';
import CpuUsageCard from './components/CpuUsage/CpuUsageCard';
import MemoryUsageCard from './components/MemoryUsage/MemoryUsageCard';
import ProcessListCard from './components/ProcessList/ProcessListCard';
import ProcessDetailModal from './components/ProcessList/ProcessDetailModal'; // Importa o novo modal
import styles from './App.module.css';

function App() {
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState(null);

  const handleProcessSelect = (process) => {
    setSelectedProcessForDetail(process);
  };

  const handleCloseDetailModal = () => {
    setSelectedProcessForDetail(null);
  };

  return (
    <DashboardLayout>
      <div className={styles.topCardsContainer}>
        <CpuUsageCard />
        <MemoryUsageCard />
      </div>
      <ProcessListCard onProcessSelect={handleProcessSelect} /> {/* Passa a função de callback */}

      {/* Renderiza o Modal de Detalhes do Processo */}
      <ProcessDetailModal
        process={selectedProcessForDetail}
        onClose={handleCloseDetailModal}
      />
    </DashboardLayout>
  );
}

export default App;