import { useEffect } from 'react';
import { useHomeData } from './use-home-data';
import { getModeGreeting } from './weather-utils';
import { useCommuteMode } from './use-commute-mode';
import { ModeBadge } from './ModeBadge';
import { GuestLanding } from './GuestLanding';
import { MorningBriefing } from './MorningBriefing';
import { WeatherHeroSection } from './WeatherHeroSection';
import { DeparturePrediction } from './DeparturePrediction';
import { RouteRecommendation } from './RouteRecommendation';
import { CommuteSection } from './CommuteSection';
import { AlertSection } from './AlertSection';
import { StatsSection } from './StatsSection';
import { StreakBadge } from './StreakBadge';
import { WeeklyReportCard } from './WeeklyReportCard';
import { MissionQuickCard } from './MissionQuickCard';
import { BriefingSection } from './BriefingSection';
import { PatternInsightsCard } from './PatternInsightsCard';
import { DelayAlertBanner } from './DelayAlertBanner';

export function HomePage(): JSX.Element {
  const data = useHomeData();
  const { mode, toggleMode } = useCommuteMode();

  // Sync commute mode with route type selection
  useEffect(() => {
    if (mode === 'commute') {
      data.setForceRouteType('morning');
    } else if (mode === 'return') {
      data.setForceRouteType('evening');
    } else {
      data.setForceRouteType('auto');
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data.isLoggedIn) return <GuestLanding />;

  if (data.isLoading) {
    return (
      <main className="page home-page">
        <div className="home-header">
          <span className="home-greeting-skeleton skeleton" />
        </div>
        <div className="today-card skeleton-card home-skeleton-card-lg" />
        <div className="today-card skeleton-card home-skeleton-card-sm" />
      </main>
    );
  }

  return (
    <main className="page home-page">
      <a href="#weather-hero" className="skip-link">본문으로 건너뛰기</a>

      {data.loadError && (
        <div className="home-error-notice notice error" role="alert">
          {data.loadError}
          <button
            type="button"
            className="btn btn-sm home-retry-btn"
            onClick={data.retryLoad}
          >
            다시 시도
          </button>
        </div>
      )}

      <header className="home-header">
        <div>
          <h1 className="home-greeting">{getModeGreeting(mode)}</h1>
          {data.userName && <p className="home-user-name">{data.userName}님</p>}
        </div>
        <ModeBadge mode={mode} onToggle={toggleMode} />
      </header>

      {data.streak != null && (
        <StreakBadge streak={data.streak} />
      )}

      <MissionQuickCard />

      <WeeklyReportCard
        report={data.weeklyReport}
        isLoading={data.weeklyReportLoading}
        error={data.weeklyReportError}
        weekOffset={data.weekOffset}
        onWeekChange={data.setWeekOffset}
      />

      {data.activeRoute && (
        <MorningBriefing
          weather={data.weather}
          airQuality={data.airQuality}
          commuteStats={data.commuteStats}
          transitInfos={data.transitInfos}
          routeName={data.activeRoute.name}
        />
      )}

      {data.weather ? (
        <WeatherHeroSection
          weather={data.weather}
          airQuality={data.airQuality}
          airQualityError={data.airQualityError}
          isDefaultLocation={data.isDefaultLocation}
          checklistItems={data.checklistItems}
          checkedItems={data.checkedItems}
          onChecklistToggle={data.handleChecklistToggle}
        />
      ) : data.weatherError ? (
        <section className="weather-hero" aria-label="날씨 오류">
          <p className="muted" role="alert">{data.weatherError}</p>
        </section>
      ) : null}

      <BriefingSection
        weather={data.weather}
        airQualityData={data.airQualityData}
        isLoading={data.weatherLoading}
      />

      {data.departurePrediction && (
        <DeparturePrediction prediction={data.departurePrediction} />
      )}

      <PatternInsightsCard />

      {data.routeRecommendation && data.routeRecommendation.recommendation && !data.routeRecDismissed && (
        <RouteRecommendation
          recommendation={data.routeRecommendation}
          onDismiss={() => {
            data.setRouteRecDismissed(true);
            sessionStorage.setItem('routeRecDismissed', 'true');
          }}
        />
      )}

      {data.activeRoute && <DelayAlertBanner routeId={data.activeRoute.id} />}

      <CommuteSection
        routes={data.routes}
        activeRoute={data.activeRoute}
        forceRouteType={data.forceRouteType}
        onForceRouteTypeChange={data.setForceRouteType}
        transitInfos={data.transitInfos}
        isTransitRefreshing={data.isTransitRefreshing}
        lastTransitUpdate={data.lastTransitUpdate}
        isCommuteStarting={data.isCommuteStarting}
        onStartCommute={data.handleStartCommute}
      />

      <AlertSection nextAlert={data.nextAlert} />

      <StatsSection
        commuteStats={data.commuteStats}
        routes={data.routes}
        activeRouteId={data.activeRoute?.id}
        onNavigateToRoutes={() => data.navigate('/routes')}
      />
    </main>
  );
}
