import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import {
  AQI_BADGE,
  FONT_SIZES,
  WIDGET_COLORS,
  WIDGET_PADDING,
  WIDGET_RADIUS,
  getAqiColors,
  getAqiLabel,
} from './widget-theme';

import type { WidgetDataResponse } from '@/types/home';

// ─── Props ───────────────────────────────────────────

type CommuteMediumWidgetProps = {
  data: WidgetDataResponse | null;
  isLoggedIn: boolean;
};

// ─── Logged-out State ────────────────────────────────

function LoggedOutMediumWidget(): React.JSX.Element {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WIDGET_COLORS.background,
        borderRadius: WIDGET_RADIUS,
        padding: WIDGET_PADDING.medium,
        width: 'match_parent',
        height: 'match_parent',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'commute-mate://' }}
    >
      <TextWidget
        text="로그인이 필요합니다"
        style={{
          fontSize: FONT_SIZES.medium.primary,
          color: WIDGET_COLORS.secondaryText,
        }}
      />
      <TextWidget
        text="탭하여 로그인"
        style={{
          fontSize: FONT_SIZES.medium.label,
          color: WIDGET_COLORS.secondaryText,
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}

// ─── Transit Label Builder ───────────────────────────

function buildTransitLabel(data: WidgetDataResponse): string {
  const { transit } = data;

  if (transit.subway) {
    return `\uD83D\uDE87 ${transit.subway.stationName} ${transit.subway.arrivalMinutes}분`;
  }

  if (transit.bus) {
    return `\uD83D\uDE8C ${transit.bus.routeName} ${transit.bus.arrivalMinutes}분`;
  }

  return '경로를 설정하세요';
}

// ─── Main Widget ─────────────────────────────────────

export function CommuteMediumWidget({
  data,
  isLoggedIn,
}: CommuteMediumWidgetProps): React.JSX.Element {
  if (!isLoggedIn) {
    return <LoggedOutMediumWidget />;
  }

  const weather = data?.weather;
  const airQuality = data?.airQuality;
  const nextAlert = data?.nextAlert;

  // Row 1: Weather
  const weatherEmoji = weather?.conditionEmoji ?? '';
  const tempText = weather ? `${weather.temperature}\u00B0C` : '--\u00B0C';
  const feelsLikeText = weather?.feelsLike != null ? `체감 ${weather.feelsLike}\u00B0` : '';

  // Row 1: AQI
  const aqiStatusLevel = airQuality?.statusLevel ?? 'good';
  const aqiColors = getAqiColors(aqiStatusLevel);
  const aqiLabel = airQuality
    ? `${getAqiLabel(airQuality.statusLevel)}(${airQuality.pm10})`
    : null;

  // Row 2: Alert
  const alertText = nextAlert
    ? `\u23F0 ${nextAlert.time} ${nextAlert.label}`
    : '\u23F0 알림 없음';

  // Row 2: Transit
  const transitText = data ? buildTransitLabel(data) : '경로를 설정하세요';

  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: WIDGET_COLORS.background,
        borderRadius: WIDGET_RADIUS,
        padding: WIDGET_PADDING.medium,
        width: 'match_parent',
        height: 'match_parent',
        flexGap: 8,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'commute-mate://' }}
    >
      {/* Row 1: Weather + AQI */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* Weather section */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 6,
          }}
        >
          <TextWidget
            text={weatherEmoji}
            style={{
              fontSize: FONT_SIZES.medium.emoji,
            }}
          />
          <TextWidget
            text={tempText}
            style={{
              fontSize: FONT_SIZES.medium.primary,
              fontWeight: 'bold',
              color: WIDGET_COLORS.primaryText,
            }}
          />
          {feelsLikeText ? (
            <TextWidget
              text={feelsLikeText}
              style={{
                fontSize: FONT_SIZES.medium.secondary,
                color: WIDGET_COLORS.secondaryText,
              }}
            />
          ) : null}
        </FlexWidget>

        {/* AQI section */}
        {aqiLabel ? (
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexGap: 4,
            }}
          >
            <TextWidget
              text="미세먼지"
              style={{
                fontSize: FONT_SIZES.medium.label,
                color: WIDGET_COLORS.secondaryText,
              }}
            />
            <FlexWidget
              style={{
                backgroundColor: aqiColors.background,
                borderRadius: AQI_BADGE.borderRadius,
                paddingHorizontal: AQI_BADGE.paddingHorizontal,
                paddingVertical: AQI_BADGE.paddingVertical,
              }}
            >
              <TextWidget
                text={aqiLabel}
                style={{
                  fontSize: AQI_BADGE.fontSize,
                  fontWeight: 'bold',
                  color: aqiColors.text,
                }}
              />
            </FlexWidget>
          </FlexWidget>
        ) : null}
      </FlexWidget>

      {/* Divider line */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 1,
          backgroundColor: WIDGET_COLORS.divider,
        }}
      />

      {/* Row 2: Alert + Transit */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* Next alert */}
        <TextWidget
          text={alertText}
          style={{
            fontSize: FONT_SIZES.medium.secondary,
            color: WIDGET_COLORS.primaryText,
          }}
        />

        {/* Transit info */}
        <TextWidget
          text={transitText}
          style={{
            fontSize: FONT_SIZES.medium.secondary,
            color: WIDGET_COLORS.secondaryText,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
