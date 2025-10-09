import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import styles from './DashboardTabs.module.css';
import CpuUsageCard from '../CpuUsage/CpuUsageCard';
import MemoryUsageCard from '../MemoryUsage/MemoryUsageCard';
import ProcessListCard from '../ProcessList/ProcessListCard';
import ProcessDetailModal from '../ProcessList/ProcessDetailModal';
import SystemSummaryCards from '../SystemTotals/TotalSystemMetricsCard';
import FileSystemView from '../FileSystem/FileSystemView';
import DirectoryTree from '../FileSystem/DirectoryTree';

// componente principal das abas do dashboard
// alterna entre visão geral e sistema de arquivos
const DashboardTabs = () => {
  const [selectedTab, setSelectedTab] = useState('dashboard'); // aba ativa
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState(null); // processo selecionado

  // seletor de abas exibido no header
  const tabsHeader = (
    <div className={styles.tabsHeader}>
      <button
        className={selectedTab === 'dashboard' ? styles.activeTab : styles.tab}
        onClick={() => setSelectedTab('dashboard')}
      >
        visão geral
      </button>
      <button
        className={selectedTab === 'filesystem' ? styles.activeTab : styles.tab}
        onClick={() => setSelectedTab('filesystem')}
      >
        sistema de arquivos
      </button>
    </div>
  );

  // render principal do layout com abas
  return (
    <DashboardLayout headerTabs={tabsHeader}>
      <div className={styles.dashboardTabsContainer}>
        <div className={styles.tabsContent}>
          {selectedTab === 'dashboard' && (
            <>
              <div className={styles.topCardsContainer}>
                <CpuUsageCard />
                <MemoryUsageCard />
              </div>
              <div className={styles.summaryCardsContainer}>
                <SystemSummaryCards />
              </div>
              <ProcessListCard onProcessSelect={setSelectedProcessForDetail} />
              <ProcessDetailModal
                process={selectedProcessForDetail}
                onClose={() => setSelectedProcessForDetail(null)}
              />
            </>
          )}

          {selectedTab === 'filesystem' && (
            <>
              <FileSystemView />
              <DirectoryTree />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTabs;
