/* global require */
require("react-native-gesture-handler");

const timestampMs = Math.round(Date.now());
console.info(
  `[SH_RELEASE_PERF] marker=startup.p3.js_bundle_start t=${timestampMs} route=bootstrap`,
);

require("expo-router/entry");
