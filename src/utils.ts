/**
 * Utilities for Smart Saver Dashboard and Hybrid/APK Environments
 */

export const getApiUrl = (endpoint: string): string => {
  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;
    // If we are in the live preview iframe or the web server, relative paths work perfectly
    if (
      hostname.includes("run.app") || 
      hostname.includes("aistudio") || 
      (hostname === "0.0.0.0" && port === "3000") ||
      (hostname === "localhost" && port === "3000")
    ) {
      return endpoint;
    }
  }
  // If we are inside a local webview / Cordova / Capacitor / local file protocol (APK environment)
  // we fallback to querying the live Cloud Run backend instead of relative file system pathing
  const backendBase = "https://ais-pre-w5jjoq3gswyhdccvim4iau-709382146758.europe-west2.run.app";
  return `${backendBase}${endpoint}`;
};
