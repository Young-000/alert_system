import { useHomeData } from './use-home-data';
import { getGreeting } from './weather-utils';
import { GuestLanding } from './GuestLanding';
import { MorningBriefing } from './MorningBriefing';
import { WeatherHeroSection } from './WeatherHeroSection';
import { DeparturePrediction } from './DeparturePrediction';
import { RouteRecommendation } from './RouteRecommendation';
import { CommuteSection } from './CommuteSection';
import { AlertSection } from './AlertSection';
import { StatsSection } from './StatsSection';

export function HomePage(): JSX.Element {
  const data = useHomeData();

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
        <div className="notice error" role="alert" style={{ margin: '0 1rem 0.75rem' }}>
          {data.loadError}
        </div>
      )}

      <header className="home-header">
        <div>
          <h1 className="home-greeting">{getGreeting()}</h1>
          {data.userName && <p className="home-user-name">{data.userName}님</p>}
        </div>
      </header>

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

      {data.departurePrediction && (
        <DeparturePrediction prediction={data.departurePrediction} />
      )}

      {data.routeRecommendation && data.routeRecommendation.recommendation && !data.routeRecDismissed && (
        <RouteRecommendation
          recommendation={data.routeRecommendation}
          onDismiss={() => {
            data.setRouteRecDismissed(true);
            sessionStorage.setItem('routeRecDismissed', 'true');
          }}
        />
      )}

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
