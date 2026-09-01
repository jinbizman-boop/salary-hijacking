package com.salaryhijacking.mobile

import android.os.SystemClock
import android.util.Log

object StartupPerfMarkers {
  private const val TAG = "SH_RELEASE_PERF"

  @Volatile
  @JvmStatic
  var lastMarkerLine: String = ""
    private set

  @JvmStatic
  fun mark(marker: String) {
    val line =
      "[SH_RELEASE_PERF] marker=${marker} t=${System.currentTimeMillis()} elapsed_ms=${SystemClock.elapsedRealtime()} route=bootstrap"
    lastMarkerLine = line
    Log.i(TAG, line)
    System.out.println(line)
  }
}
