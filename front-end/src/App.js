// so-dashboard/front-end/src/App.js
import React from 'react';
import DashboardTabs from './components/Layout/DashboardTabs';
import styles from './App.module.css';

// app principal — apenas encapsula o layout de abas
function App() {
  return (
    <div className={styles.appContainer}>
      <DashboardTabs />
    </div>
  );
}

export default App;
