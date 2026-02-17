import type { WeatherData } from '@infrastructure/api';
import { WeatherIcon, getWeatherAdvice } from './weather-utils';
import type { ChecklistItem } from './weather-utils';

interface WeatherHeroSectionProps {
  weather: WeatherData;
  airQuality: { label: string; className: string };
  checklistItems: ChecklistItem[];
  checkedItems: Set<string>;
  onChecklistToggle: (id: string) => void;
}

export function WeatherHeroSection({
  weather,
  airQuality,
  checklistItems,
  checkedItems,
  onChecklistToggle,
}: WeatherHeroSectionProps): JSX.Element {
  return (
    <>
      <section id="weather-hero" className="weather-hero" aria-label={`현재 날씨 ${weather.conditionKr || weather.condition} ${Math.round(weather.temperature)}도`}>
        <div className="weather-hero-main">
          <WeatherIcon condition={weather.condition} size={48} />
          <div className="weather-hero-text">
            <span className="weather-temp-value">{Math.round(weather.temperature)}°</span>
            <span className="weather-condition">{weather.conditionKr || weather.condition}</span>
          </div>
        </div>
        <div className="weather-hero-details">
          <span>습도 {weather.humidity}%</span>
          {airQuality.label !== '-' && (
            <span className={`aqi-badge ${airQuality.className}`}>미세먼지 {airQuality.label}</span>
          )}
        </div>
        <p className="weather-advice">{getWeatherAdvice(weather, airQuality)}</p>
      </section>

      {checklistItems.length > 0 && (
        <section className="weather-checklist" aria-label="오늘의 준비물">
          <h3 className="weather-checklist-title">오늘의 준비물</h3>
          <div className="weather-checklist-items">
            {checklistItems.map(item => (
              <button
                key={item.id}
                type="button"
                className={`checklist-chip ${checkedItems.has(item.id) ? 'checked' : ''}`}
                onClick={() => onChecklistToggle(item.id)}
                aria-pressed={checkedItems.has(item.id)}
              >
                <span className="checklist-emoji" aria-hidden="true">{item.emoji}</span>
                <span className="checklist-label">{item.label}</span>
                {checkedItems.has(item.id) && (
                  <span className="checklist-check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
