package com.salaryhijacking.mobile

import android.os.Build
import android.os.Bundle
import android.view.ViewTreeObserver

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  private var firstFrameMarked = false

  override fun onCreate(savedInstanceState: Bundle?) {
    StartupPerfMarkers.mark("startup.n2.activity_on_create_entry")
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    // @generated end expo-splashscreen
    super.onCreate(null)
    StartupPerfMarkers.mark("startup.n3.activity_super_on_create_complete")
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && !firstFrameMarked) {
      firstFrameMarked = true
      StartupPerfMarkers.mark("startup.n5.native_first_frame_ready")
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){
            override fun createRootView(): ReactRootView {
              StartupPerfMarkers.mark("startup.n4.react_root_view_create_start")
              return ReactRootView(this@MainActivity).apply {
                setBackgroundResource(R.drawable.ic_launcher_background)
                viewTreeObserver.addOnPreDrawListener(object : ViewTreeObserver.OnPreDrawListener {
                  override fun onPreDraw(): Boolean {
                    if (!firstFrameMarked) {
                      firstFrameMarked = true
                      StartupPerfMarkers.mark("startup.n5.native_first_frame_ready")
                    }
                    viewTreeObserver.removeOnPreDrawListener(this)
                    return true
                  }
                })
              }
            }
          })
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

}
