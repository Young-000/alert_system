import { useMemo } from 'react';
import type { AdviceChip, AdviceSeverity } from '@infrastructure/api';
import type { WeatherData, AirQualityData } from '@infrastructure/api';
import { getTimeContext } from './build-briefing';

// ─── Types ─────────────────────────────────────────

interface BriefingSectionProps {
  weather: WeatherData | null;
  airQualityData: AirQualityData | null;
  isLoading: boolean;
}

// ─── Advice Engine (client-side) ───────────────────

function buildAdvicesFromData(
  weather: WeatherData | null,
  airQualityData: AirQualityData | null,
): AdviceChip[] {
  const advices: AdviceChip[] = [];

  if (weather) {
    addClothingAdvice(advices, weather);
    addRainAdvice(advices, weather);
    addWindAdvice(advices, weather);
  }

  if (airQualityData) {
    addAirQualityAdvice(advices, airQualityData);
  }

  // Sort: danger > warning > info
  const severityOrder: Record<AdviceSeverity, number> = {
    danger: 0,
    warning: 1,
    info: 2,
  };
  advices.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Limit to 4 chips
  return advices.slice(0, 4);
}

function getEffectiveTemp(weather: WeatherData): number {
  return weather.feelsLike ?? weather.temperature;
}

function addClothingAdvice(advices: AdviceChip[], weather: WeatherData): void {
  const temp = getEffectiveTemp(weather);

  if (temp <= -10) {
    advices.push({ emoji: '\uD83E\uDD76', text: '\uD328\uB529 \uD544\uC218, \uBC29\uD55C\uC6A9\uD488 \uCC59\uAE30\uC138\uC694', severity: 'danger' });
  } else if (temp <= 0) {
    advices.push({ emoji: '\uD83E\uDDE5', text: '\uB450\uAEBC\uC6B4 \uC678\uD22C \uD544\uC218', severity: 'warning' });
  } else if (temp <= 5) {
    advices.push({ emoji: '\uD83E\uDDE5', text: '\uCF54\uD2B8\uB098 \uB450\uAEBC\uC6B4 \uAC89\uC637', severity: 'warning' });
  } else if (temp <= 10) {
    advices.push({ emoji: '\uD83E\uDDF6', text: '\uC790\uCF13 + \uB2C8\uD2B8 \uCD94\uCC9C', severity: 'info' });
  } else if (temp <= 15) {
    advices.push({ emoji: '\uD83D\uDC54', text: '\uAC00\uBCBC\uC6B4 \uAC89\uC637', severity: 'info' });
  } else if (temp <= 20) {
    advices.push({ emoji: '\uD83D\uDC55', text: '\uAE34\uD314 \uB610\uB294 \uC587\uC740 \uAC89\uC637', severity: 'info' });
  } else if (temp <= 25) {
    advices.push({ emoji: '\uD83D\uDC55', text: '\uBC18\uD314 \uAC00\uB2A5, \uC2E4\uB0B4 \uB0C9\uBC29 \uC8FC\uC758', severity: 'info' });
  } else if (temp <= 28) {
    advices.push({ emoji: '\u2600\uFE0F', text: '\uBC18\uD314, \uC218\uBD84 \uC12D\uCDE8', severity: 'info' });
  } else if (temp <= 33) {
    advices.push({ emoji: '\uD83E\uDD75', text: '\uB354\uC704 \uC8FC\uC758, \uC218\uBD84 \uC12D\uCDE8 \uD544\uC218', severity: 'warning' });
  } else {
    advices.push({ emoji: '\uD83D\uDD25', text: '\uD3ED\uC5FC \uACBD\uBCF4, \uC678\uCD9C \uC790\uC81C', severity: 'danger' });
  }

  // Temperature difference advice
  if (weather.forecast) {
    const { maxTemp, minTemp } = weather.forecast;
    const tempDiff = maxTemp - minTemp;
    if (tempDiff >= 10) {
      advices.push({
        emoji: '\uD83C\uDF21\uFE0F',
        text: `\uC77C\uAD50\uCC28 ${Math.round(tempDiff)}\uB3C4, \uAC89\uC637 \uCC59\uAE30\uC138\uC694`,
        severity: 'warning',
      });
    }
  }
}

function addRainAdvice(advices: AdviceChip[], weather: WeatherData): void {
  const condition = weather.condition.toLowerCase();

  if (condition.includes('thunder')) {
    advices.push({ emoji: '\u26C8\uFE0F', text: '\uB1CC\uC6B0 \uC608\uBCF4, \uC678\uCD9C \uC8FC\uC758', severity: 'danger' });
    return;
  }

  if (condition.includes('snow')) {
    advices.push({ emoji: '\u2744\uFE0F', text: '\uB208 \uC608\uBCF4, \uBBF8\uB044\uB7FC \uC8FC\uC758', severity: 'warning' });
    return;
  }

  if (condition.includes('rain') || condition.includes('drizzle')) {
    advices.push({ emoji: '\uD83C\uDF02', text: '\uC6B0\uC0B0 \uCC59\uAE30\uC138\uC694', severity: 'warning' });
    return;
  }

  if (condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) {
    advices.push({ emoji: '\uD83C\uDF2B\uFE0F', text: '\uC2DC\uC57C \uC8FC\uC758, \uC548\uC804 \uC6B4\uC804', severity: 'info' });
    return;
  }

  // Check hourly forecast for rain probability
  if (weather.forecast?.hourlyForecasts) {
    const maxRainProb = Math.max(
      ...weather.forecast.hourlyForecasts.map(h => h.rainProbability),
      0,
    );
    if (maxRainProb >= 60) {
      advices.push({
        emoji: '\uD83C\uDF02',
        text: `\uC6B0\uC0B0 \uD544\uC218 (\uAC15\uC218\uD655\uB960 ${maxRainProb}%)`,
        severity: 'warning',
      });
    } else if (maxRainProb >= 40) {
      advices.push({
        emoji: '\uD83C\uDF02',
        text: '\uC6B0\uC0B0 \uCC59\uAE30\uBA74 \uC88B\uACA0\uC5B4\uC694',
        severity: 'info',
      });
    }
  }
}

function addWindAdvice(advices: AdviceChip[], weather: WeatherData): void {
  if (weather.feelsLike !== undefined) {
    const diff = weather.temperature - weather.feelsLike;
    if (diff >= 5) {
      advices.push({
        emoji: '\uD83D\uDCA8',
        text: `\uBC14\uB78C\uC774 \uAC15\uD574 \uCCB4\uAC10 ${Math.round(weather.feelsLike)}\uB3C4`,
        severity: 'warning',
      });
    }
  }
}

function addAirQualityAdvice(advices: AdviceChip[], aq: AirQualityData): void {
  // PM2.5 correction: if PM2.5 > 35, upgrade status
  let effectiveLevel: 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';
  if (aq.pm10 > 150 || (aq.pm10 > 80 && aq.pm25 > 35)) {
    effectiveLevel = 'veryUnhealthy';
  } else if (aq.pm10 > 80 || aq.pm25 > 35) {
    effectiveLevel = 'unhealthy';
  } else if (aq.pm10 > 30) {
    effectiveLevel = 'moderate';
  } else {
    effectiveLevel = 'good';
  }

  switch (effectiveLevel) {
    case 'good':
      advices.push({ emoji: '\uD83D\uDE0A', text: '\uACF5\uAE30 \uC88B\uC74C, \uC0B0\uCC45\uD558\uAE30 \uC88B\uC544\uC694', severity: 'info' });
      break;
    case 'moderate':
      // moderate is not very actionable, skip to keep chip count low
      break;
    case 'unhealthy':
      advices.push({ emoji: '\uD83D\uDE37', text: '\uB9C8\uC2A4\uD06C \uCC29\uC6A9 \uAD8C\uC7A5', severity: 'warning' });
      break;
    case 'veryUnhealthy':
      advices.push({ emoji: '\uD83E\uDD22', text: '\uB9C8\uC2A4\uD06C \uD544\uC218, \uC2E4\uC678\uD65C\uB3D9 \uC790\uC81C', severity: 'danger' });
      break;
  }
}

// ─── Severity Styling ──────────────────────────────

const SEVERITY_STYLES: Record<AdviceSeverity, { background: string; color: string; border: string }> = {
  info: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#1D4ED8',
    border: 'rgba(59, 130, 246, 0.2)',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: '#92400E',
    border: 'rgba(245, 158, 11, 0.2)',
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#991B1B',
    border: 'rgba(239, 68, 68, 0.2)',
  },
};

const SEVERITY_LABELS: Record<AdviceSeverity, string> = {
  info: '\uC815\uBCF4',
  warning: '\uC8FC\uC758',
  danger: '\uC704\uD5D8',
};

// ─── Component ─────────────────────────────────────

export function BriefingSection({
  weather,
  airQualityData,
  isLoading,
}: BriefingSectionProps): JSX.Element | null {
  const timeContext = getTimeContext();
  const contextLabel = timeContext === 'morning'
    ? '\uCD9C\uADFC \uBE0C\uB9AC\uD551'
    : timeContext === 'evening'
      ? '\uD1F4\uADFC \uBE0C\uB9AC\uD551'
      : '\uB0B4\uC77C \uCD9C\uADFC \uBE0C\uB9AC\uD551';

  const advices = useMemo(
    () => buildAdvicesFromData(weather, airQualityData),
    [weather, airQualityData],
  );

  if (isLoading) {
    return (
      <section className="briefing-section" aria-label="\uBE0C\uB9AC\uD551 \uB85C\uB529 \uC911" aria-busy="true">
        <span className="briefing-section-label">{contextLabel}</span>
        <div className="briefing-chips" role="list">
          <div className="briefing-chip-skeleton skeleton" role="listitem" />
          <div className="briefing-chip-skeleton skeleton" role="listitem" />
          <div className="briefing-chip-skeleton skeleton" role="listitem" />
        </div>
      </section>
    );
  }

  if (!weather && !airQualityData) {
    return null;
  }

  if (advices.length === 0) {
    return null;
  }

  return (
    <section
      className="briefing-section"
      aria-label={`${contextLabel} - \uC870\uC5B8 ${advices.length}\uAC1C`}
    >
      <span className="briefing-section-label">{contextLabel}</span>
      <div className="briefing-chips" role="list">
        {advices.map((advice, index) => {
          const style = SEVERITY_STYLES[advice.severity];
          const severityLabel = SEVERITY_LABELS[advice.severity];
          return (
            <div
              key={`${advice.emoji}-${index}`}
              className={`briefing-chip briefing-chip--${advice.severity}`}
              style={{
                background: style.background,
                color: style.color,
                borderColor: style.border,
              }}
              role="listitem"
              aria-label={`${severityLabel}: ${advice.text}`}
            >
              <span className="briefing-chip-emoji" aria-hidden="true">{advice.emoji}</span>
              <span className="briefing-chip-text">{advice.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Export for testing
export { buildAdvicesFromData };
