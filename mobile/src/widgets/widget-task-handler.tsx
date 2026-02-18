import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { CommuteSmallWidget } from './CommuteSmallWidget';
import { CommuteMediumWidget } from './CommuteMediumWidget';
import { WIDGET_COLORS, WIDGET_RADIUS, WIDGET_PADDING, FONT_SIZES } from './widget-theme';

import type { WidgetDataResponse } from '@/types/home';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

// ─── Constants ───────────────────────────────────────

const WIDGET_NAMES = {
  CommuteSmall: 'CommuteSmall',
  CommuteMedium: 'CommuteMedium',
} as const;

// ─── SharedPreferences Data Reader ───────────────────

/**
 * Reads cached widget data from SharedPreferences via the native module.
 * The native module writes to SharedPreferences; we can read it via
 * the same native module (it runs in the same app process).
 *
 * For the task handler, we use NativeModules directly since the handler
 * runs as a headless JS task in the same app process.
 */
async function readWidgetData(): Promise<{
  data: WidgetDataResponse | null;
  isLoggedIn: boolean;
}> {
  try {
    // Import the native module bridge to read SharedPreferences.
    // The widget task handler runs in the app's JS context,
    // so it shares the same SharedPreferences.
    const { NativeModules } = await import('react-native');
    const nativeModule = NativeModules.WidgetDataSync;

    if (!nativeModule?.getWidgetData) {
      // If getWidgetData is not available, we rely on the data
      // being passed through SharedPreferences at the OS level.
      // The react-native-android-widget library doesn't provide
      // direct SharedPreferences access, so we use cached data.
      return { data: null, isLoggedIn: false };
    }

    const jsonString: string | null = await nativeModule.getWidgetData();
    if (!jsonString) {
      return { data: null, isLoggedIn: false };
    }

    const parsed = JSON.parse(jsonString) as WidgetDataResponse;
    return { data: parsed, isLoggedIn: true };
  } catch {
    return { data: null, isLoggedIn: false };
  }
}

/**
 * Reads widget data from SharedPreferences using the react-native
 * SharedPreferences API available in the headless JS context.
 */
async function getWidgetDataFromPrefs(): Promise<{
  data: WidgetDataResponse | null;
  isLoggedIn: boolean;
}> {
  try {
    // Use the Expo module to read the cached data
    const { requireNativeModule } = await import('expo-modules-core');
    const widgetDataSync = requireNativeModule('WidgetDataSync');

    // The syncWidgetData function writes JSON to SharedPreferences.
    // We attempt to read it back. If the module doesn't expose a getter,
    // the data will be null and we show a placeholder.
    // Note: The initial data write happens in the app foreground via
    // widget-sync.service.ts, and the task handler reads the persisted data.
    return await readWidgetData();
  } catch {
    return { data: null, isLoggedIn: false };
  }
}

// ─── Error/Placeholder Widget ────────────────────────

function PlaceholderWidget(): React.JSX.Element {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
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
        text="출퇴근 메이트"
        style={{
          fontSize: FONT_SIZES.small.primary,
          fontWeight: 'bold',
          color: WIDGET_COLORS.primaryText,
        }}
      />
      <TextWidget
        text="앱을 열어 데이터를 불러오세요"
        style={{
          fontSize: FONT_SIZES.small.secondary,
          color: WIDGET_COLORS.secondaryText,
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}

// ─── Task Handler ────────────────────────────────────

export async function widgetTaskHandler(
  props: WidgetTaskHandlerProps,
): Promise<void> {
  const { widgetInfo, widgetAction, renderWidget } = props;

  // WIDGET_DELETED: nothing to render
  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  // WIDGET_CLICK: handled by clickAction on the widget itself (OPEN_URI)
  // No additional handling needed here.
  if (widgetAction === 'WIDGET_CLICK') {
    return;
  }

  // WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED: render the widget
  const { data, isLoggedIn } = await getWidgetDataFromPrefs();

  switch (widgetInfo.widgetName) {
    case WIDGET_NAMES.CommuteSmall:
      renderWidget(
        <CommuteSmallWidget data={data} isLoggedIn={isLoggedIn} />,
      );
      break;

    case WIDGET_NAMES.CommuteMedium:
      renderWidget(
        <CommuteMediumWidget data={data} isLoggedIn={isLoggedIn} />,
      );
      break;

    default:
      // Unknown widget name -- render a placeholder
      renderWidget(<PlaceholderWidget />);
      break;
  }
}
