// so-dashboard/front-end/src/App.js
import React from 'react';
import DashboardLayout from './components/Layout/DashboardLayout';
import CpuUsageCard from './components/CpuUsage/CpuUsageCard';
import MemoryUsageCard from './components/MemoryUsage/MemoryUsageCard';
// import './App.css'; // Se não estiver usando, pode remover a importação e o arquivo

function App() {
  return (
    <DashboardLayout>
      <CpuUsageCard />
      <MemoryUsageCard />
      {/* <ProcessList /> Adicionaremos depois */}
    </DashboardLayout>
  );
}

export default App;