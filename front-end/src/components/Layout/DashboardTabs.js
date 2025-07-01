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

/**
 * Componente DashboardTabs
 *
 * Exibe as abas "Visão Geral" (dashboard principal) e "Sistema de Arquivos" (filesystem e navegação de diretórios).
 * Mantém o padrão visual do dashboard, com header e cards.
 */
const DashboardTabs = () => {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState(null);

  // O seletor de abas agora é um elemento separado para ser passado ao header
  const tabsHeader = (
    <div className={styles.tabsHeader}>
      <button
        className={selectedTab === 'dashboard' ? styles.activeTab : styles.tab}
        onClick={() => setSelectedTab('dashboard')}
      >
        Visão Geral
      </button>
      <button
        className={selectedTab === 'filesystem' ? styles.activeTab : styles.tab}
        onClick={() => setSelectedTab('filesystem')}
      >
        Sistema de Arquivos
      </button>
    </div>
  );

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
              <ProcessDetailModal process={selectedProcessForDetail} onClose={() => setSelectedProcessForDetail(null)} />
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
