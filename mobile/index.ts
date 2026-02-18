import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { defineGeofenceTask } from './src/services/geofence.service';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

// Register background tasks (must be at top level, outside component tree)
defineGeofenceTask();

registerWidgetTaskHandler(widgetTaskHandler);
