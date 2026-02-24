import { useState } from 'react';
import type { WeatherData } from '@infrastructure/api';
import { WeatherIcon, getWeatherAdvice, translateCondition } from './weather-utils';
import type { ChecklistItem } from './weather-utils';
import { useCollapsible } from '@presentation/hooks/use-collapsible';
import { ChevronIcon } from '@presentation/components/icons';

interface WeatherHeroSectionProps {
  weather: WeatherData;
  airQuality: { label: string; className: string };
  airQualityError?: string;
  isDefaultLocation?: boolean;
  checklistItems: ChecklistItem[];
  checkedItems: Set<string>;
  onChecklistToggle: (id: string) => void;
}

export function WeatherHeroSection({
  weather,
  airQuality,
  airQualityError,
  isDefaultLocation = false,
  checklistItems,
  checkedItems,
  onChecklistToggle,
}: WeatherHeroSectionProps): JSX.Element {
  const [showLocationTip, setShowLocationTip] = useState(false);
  const { isExpanded, ariaProps } = useCollapsible({
    storageKey: 'weather',
    defaultExpanded: false,
  });

  const summaryLabel = isExpanded ? '날씨 상세 접기' : '날씨 상세 펼치기';

  return (
    <>
      <section
        id="weather-hero"
        className={`weather-hero ${!isExpanded ? 'weather-hero--collapsed' : ''}`}
        aria-label={`현재 날씨 ${weather.conditionKr || translateCondition(weather.condition)} ${Math.round(weather.temperature)}도`}
      >
        {/* Summary row (always visible, clickable to toggle) */}
        <div
          className="weather-hero-summary"
          {...ariaProps}
          aria-label={summaryLabel}
          aria-controls="weather-detail-content"
        >
          <WeatherIcon condition={weather.condition} size={isExpanded ? 48 : 24} />
          <span className="weather-hero-summary-temp">{Math.round(weather.temperature)}&deg;</span>
          <span className="weather-hero-summary-condition">{weather.conditionKr || translateCondition(weather.condition)}</span>
          {airQuality.label !== '-' && (
            <span className={`aqi-badge ${airQuality.className} weather-hero-summary-aqi`}>
              {airQuality.label}
            </span>
          )}
          {isDefaultLocation && (
            <span className="weather-hero-summary-location">서울</span>
          )}
          <ChevronIcon
            size={16}
            className={`collapsible-chevron ${isExpanded ? 'collapsible-chevron--expanded' : ''}`}
          />
        </div>

        {/* Detail content (only visible when expanded) */}
        <div id="weather-detail-content" className={`collapsible-content ${isExpanded ? 'collapsible-content--expanded' : ''}`}>
          <div className="weather-hero-detail">
            <div className="weather-hero-main">
              <div className="weather-hero-text">
                <span className="weather-temp-value">{Math.round(weather.temperature)}&deg;</span>
                <span className="weather-condition">{weather.conditionKr || translateCondition(weather.condition)}</span>
              </div>
              {isDefaultLocation && (
                <button
                  type="button"
                  className="location-default-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLocationTip(prev => !prev);
                  }}
                  aria-label="위치 권한이 없어 서울 기준 날씨를 표시합니다"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>서울 기준</span>
                </button>
              )}
            </div>

            {isDefaultLocation && showLocationTip && (
              <p className="location-tip" role="status">
                브라우저 설정에서 위치 권한을 허용하면 현재 위치의 날씨를 볼 수 있습니다.
              </p>
            )}

            <div className="weather-hero-details">
              <span>습도 {weather.humidity}%</span>
              {airQuality.label !== '-' ? (
                <span className={`aqi-badge ${airQuality.className}`}>미세먼지 {airQuality.label}</span>
              ) : airQualityError ? (
                <span className="muted" role="alert">{airQualityError}</span>
              ) : null}
            </div>
            <p className="weather-advice">{getWeatherAdvice(weather, airQuality)}</p>
          </div>
        </div>
      </section>

      {checklistItems.length > 0 && (
        <div className={`collapsible-content ${isExpanded ? 'collapsible-content--expanded' : ''}`}>
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
        </div>
      )}
    </>
  );
}
