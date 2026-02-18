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

type CommuteSmallWidgetProps = {
  data: WidgetDataResponse | null;
  isLoggedIn: boolean;
};

// ─── Logged-out State ────────────────────────────────

function LoggedOutSmallWidget(): React.JSX.Element {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WIDGET_COLORS.background,
        borderRadius: WIDGET_RADIUS,
        padding: WIDGET_PADDING.small,
        width: 'match_parent',
        height: 'match_parent',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'commute-mate://' }}
    >
      <TextWidget
        text="로그인이 필요합니다"
        style={{
          fontSize: FONT_SIZES.small.primary,
          color: WIDGET_COLORS.secondaryText,
        }}
      />
    </FlexWidget>
  );
}

// ─── Main Widget ─────────────────────────────────────

export function CommuteSmallWidget({
  data,
  isLoggedIn,
}: CommuteSmallWidgetProps): React.JSX.Element {
  if (!isLoggedIn) {
    return <LoggedOutSmallWidget />;
  }

  const weather = data?.weather;
  const airQuality = data?.airQuality;
  const nextAlert = data?.nextAlert;

  const tempText = weather ? `${weather.conditionEmoji} ${weather.temperature}°` : '--°';
  const alertText = nextAlert ? `${nextAlert.time}` : '알림 없음';

  const aqiStatusLevel = airQuality?.statusLevel ?? 'good';
  const aqiColors = getAqiColors(aqiStatusLevel);
  const aqiLabel = airQuality ? getAqiLabel(airQuality.statusLevel) : null;

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: WIDGET_COLORS.background,
        borderRadius: WIDGET_RADIUS,
        padding: WIDGET_PADDING.small,
        width: 'match_parent',
        height: 'match_parent',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'commute-mate://' }}
    >
      {/* Left section: Weather + AQI */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexGap: 8,
        }}
      >
        {/* Weather temperature */}
        <TextWidget
          text={tempText}
          style={{
            fontSize: FONT_SIZES.small.primary,
            fontWeight: 'bold',
            color: WIDGET_COLORS.primaryText,
          }}
        />

        {/* AQI badge */}
        {aqiLabel ? (
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
        ) : null}
      </FlexWidget>

      {/* Divider */}
      <TextWidget
        text="|"
        style={{
          fontSize: FONT_SIZES.small.secondary,
          color: WIDGET_COLORS.divider,
        }}
      />

      {/* Right section: Next alert */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexGap: 4,
        }}
      >
        <TextWidget
          text={nextAlert ? '\u23F0' : ''}
          style={{
            fontSize: FONT_SIZES.small.secondary,
            color: WIDGET_COLORS.secondaryText,
          }}
        />
        <TextWidget
          text={alertText}
          style={{
            fontSize: FONT_SIZES.small.secondary,
            color: WIDGET_COLORS.secondaryText,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
