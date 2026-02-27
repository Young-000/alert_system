import { useState } from 'react';
import { useAuth } from '@presentation/hooks/useAuth';
import { AuthRequired } from '../../components/AuthRequired';
import { WeeklyTab } from './WeeklyTab';
import { MonthlyTab } from './MonthlyTab';
import { SummaryTab } from './SummaryTab';

type ReportTab = 'weekly' | 'monthly' | 'summary';

const TAB_CONFIG: { key: ReportTab; label: string }[] = [
  { key: 'weekly', label: '이번 주' },
  { key: 'monthly', label: '월간' },
  { key: 'summary', label: '요약' },
];

export function ReportPage(): JSX.Element {
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('weekly');

  if (!isLoggedIn) {
    return (
      <AuthRequired
        pageTitle="리포트"
        icon="📊"
        description="리포트를 확인하려면 로그인이 필요해요"
      />
    );
  }

  return (
    <main className="page report-page">
      <h1 className="report-page-title">리포트</h1>

      {/* Tab Bar */}
      <div className="report-tab-bar" role="tablist" aria-label="리포트 탭">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={`report-tab ${activeTab === key ? 'report-tab--active' : ''}`}
            aria-selected={activeTab === key}
            aria-controls={`report-panel-${key}`}
            id={`report-tab-${key}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div
        id={`report-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`report-tab-${activeTab}`}
      >
        {activeTab === 'weekly' && <WeeklyTab />}
        {activeTab === 'monthly' && <MonthlyTab />}
        {activeTab === 'summary' && <SummaryTab />}
      </div>
    </main>
  );
}
