package com.commutemate.app.modules.widgetdatasync

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetDataSyncModule : Module() {
  private val prefsName: String
    get() = "com.commutemate.widget_data"
  private val dataKey = "widget_data_json"

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("WidgetDataSync")

    /**
     * Writes widget data JSON string to SharedPreferences.
     * The widget task handler reads from the same SharedPreferences
     * to render the widget UI.
     */
    AsyncFunction("syncWidgetData") { jsonString: String ->
      val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
      prefs.edit().putString(dataKey, jsonString).apply()
    }

    /**
     * Reads cached widget data JSON from SharedPreferences.
     * Used by the widget task handler to render the widget with
     * the latest data that was persisted by syncWidgetData().
     * Returns null if no data has been cached yet.
     */
    AsyncFunction("getWidgetData") {
      val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
      prefs.getString(dataKey, null)
    }

    /**
     * Removes widget data from SharedPreferences.
     * Called on logout to clear cached widget data.
     */
    AsyncFunction("clearWidgetData") {
      val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
      prefs.edit().remove(dataKey).apply()
    }

    /**
     * No-op on Android.
     * On iOS, this syncs the JWT token to the shared Keychain Access Group
     * so the widget extension can authenticate API calls.
     * On Android, the widget task handler runs inside the app's JS context
     * and can access SharedPreferences directly -- no separate auth token
     * sharing mechanism is needed.
     */
    AsyncFunction("syncAuthToken") { _: String ->
      // No-op on Android: widget runs in app process
    }

    /**
     * No-op on Android.
     * See syncAuthToken for rationale.
     */
    AsyncFunction("clearAuthToken") {
      // No-op on Android: widget runs in app process
    }
  }
}
