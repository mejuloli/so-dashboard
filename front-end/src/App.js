// so-dashboard/front-end/src/App.js
import React from 'react';
import DashboardLayout from './components/Layout/DashboardLayout';
import CpuUsageCard from './components/CpuUsage/CpuUsageCard';
import MemoryUsageCard from './components/MemoryUsage/MemoryUsageCard';
import ProcessListCard from './components/ProcessList/ProcessListCard';
import styles from './App.module.css'; // Criaremos este arquivo

function App() {
  return (
    <DashboardLayout>
      <div className={styles.topCardsContainer}> {/* Nova div para agrupar CPU e Memória */}
        <CpuUsageCard />
        <MemoryUsageCard />
      </div>
      <ProcessListCard />
      {/* Futuramente, um gráfico relacionado a processos poderia vir aqui */}
    </DashboardLayout>
  );
}

export default App;