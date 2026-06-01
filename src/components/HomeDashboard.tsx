import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wind, Shield, Wifi, Battery, BatteryCharging, Clock, 
  Activity, AlertTriangle, ChevronDown, RefreshCw, Cpu, 
  Database, Bell, CheckCircle, Flame, MapPin
} from "lucide-react";
import { Device, getAqiCategory, calculateAqi } from "../types";

interface HomeDashboardProps {
  devices: Device[];
  selectedDevice: Device;
  onSelectDevice: (device: Device) => void;
  onManualRefresh: () => void;
  lang: "ar" | "en";
  hasEmergencyAlert: boolean;
}

export default function HomeDashboard({
  devices,
  selectedDevice,
  onSelectDevice,
  onManualRefresh,
  lang,
  hasEmergencyAlert
}: HomeDashboardProps) {
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isRotating, setIsRotating] = useState(false);

  // Localization Text Map
  const isAr = lang === "ar";
  const t = {
    overview: isAr ? "نظرة عامة" : "Dashboard Overview",
    currentStatus: isAr ? "الحالة الحالية للهواء" : "Current Air Status",
    sensorValue: isAr ? "قراءة مستشعر الغاز (MQ135)" : "MQ135 Gas Reading",
    statusText: isAr ? "التصنيف والتحليل" : "Status & Analysis",
    lastSeen: isAr ? "آخر قراءة" : "Last seen",
    uptime: isAr ? "ساعات التشغيل" : "Device Uptime",
    wifi: isAr ? "إنترنت لاسلكي" : "Wi-Fi Status",
    battery: isAr ? "مستوى شحن البطارية" : "Battery Level",
    refreshing: isAr ? "تحديث تلقائي خلال" : "Auto-sync in",
    sec: isAr ? "ثوانٍ" : "s",
    deviceHealth: isAr ? "سلامة الشريحة" : "Sensor Health",
    healthy: isAr ? "سليم معافى" : "Healthy Calibration",
    warning: isAr ? "حالة معايرة غير مستقرة" : "Unstable calibration",
    offlineText: isAr ? "الجهاز متوقف أو خارج الشبكة" : "Node is offline",
    location: isAr ? "موقع التثبيت" : "Installation Area",
    safeTitle: isAr ? "جودة الهواء آمنة وعادية" : "Safe Air Quality",
    warnTitle: isAr ? "تحذير: ارتفاع معايير الغاز" : "Warning: Gas Spiking",
    dangerTitle: isAr ? "تنبيه طوارئ: خطر تلوث هائل" : "Danger: Heavy Pollution",
    deviceCount: isAr ? "مجموع الأجهزة" : "Active Devices",
    activeNodes: isAr ? "الأجهزة المتصلة" : "Online Nodes",
    offlineNodes: isAr ? "الأجهزة غير المتصلة" : "Offline Nodes",
  };

  // Timer loop for simulation sync indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshClick = () => {
    setIsRotating(true);
    onManualRefresh();
    setCountdown(3);
    setTimeout(() => setIsRotating(false), 800);
  };

  // Determine status color levels
  const sensorValue = selectedDevice.sensorValue;
  const isOffline = selectedDevice.status === "offline";
  const aqi = selectedDevice.aqi;
  const aqiCat = getAqiCategory(aqi);

  let borderStyle = "border-slate-800 bg-slate-900/60";
  let ringColor = "stroke-emerald-500";
  let pulseAnimation = "";
  let glowStyle = "shadow-emerald-500/5";
  let bannerBg = "bg-emerald-950/20 text-emerald-400 border-emerald-500/20";
  let bannerText = t.safeTitle;

  if (isOffline) {
    borderStyle = "border-slate-800/80 bg-slate-900/40 text-slate-400";
    ringColor = "stroke-slate-700";
    glowStyle = "";
    bannerBg = "bg-slate-950/80 text-slate-500 border-slate-800";
    bannerText = t.offlineText;
  } else if (sensorValue > 500) {
    // Danger Threshold
    borderStyle = "border-red-500/30 bg-slate-950/80 shadow-red-500/10";
    ringColor = "stroke-red-500";
    pulseAnimation = "animate-ping opacity-60";
    glowStyle = "shadow-red-500/20 pulse-red-dashboard flash-border-red";
    bannerBg = "bg-red-950/30 text-red-400 border-red-500/30 animate-pulse";
    bannerText = t.dangerTitle;
  } else if (sensorValue > 200) {
    // Warning Threshold
    borderStyle = "border-amber-500/20 bg-slate-900/60 shadow-amber-500/5";
    ringColor = "stroke-amber-500";
    pulseAnimation = "pulse-orange opacity-40";
    glowStyle = "shadow-amber-500/10 pulse-orange-dashboard";
    bannerBg = "bg-amber-950/20 text-amber-400 border-amber-500/20";
    bannerText = t.warnTitle;
  } else {
    // Safe
    borderStyle = "border-emerald-500/15 bg-slate-900/60";
    ringColor = "stroke-emerald-500/90";
    glowStyle = "shadow-emerald-500/10 glow-emerald-dashboard";
    bannerBg = "bg-emerald-950/30 text-emerald-400 border-emerald-500/20";
    bannerText = t.safeTitle;
  }

  // Calculate circular stroke offsets
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // Map AQI (0 to 500) to gauge percentage (0 to 100)
  const percentFilled = isOffline ? 0 : Math.min(100, Math.max(0, (aqi / 500) * 100));
  const strokeDashoffset = circumference - (percentFilled / 100) * circumference;

  // Format uptime
  const formatUptimeValue = (sec: number) => {
    if (!sec) return isAr ? "غير متوفر" : "Offline";
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return isAr ? `${hours} س و ${mins} د` : `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Header Picker */}
      <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="relative">
          <button
            onClick={() => setShowDevicePicker(!showDevicePicker)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-xs text-slate-100 font-sans font-bold rounded-xl border border-slate-800 shadow-md transition-all select-none cursor-pointer"
          >
            <Cpu className={`w-4 h-4 text-emerald-400 ${selectedDevice.status === "online" ? "animate-pulse" : ""}`} />
            <span>{selectedDevice.name}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDevicePicker ? "rotate-180" : ""}`} />
          </button>

          {/* Expanded picker dropdown */}
          <AnimatePresence>
            {showDevicePicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 top-11 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-30 space-y-1 backdrop-blur-xl"
              >
                <div className="text-[10px] text-slate-500 px-2.5 pb-1 border-b border-slate-900 font-mono select-none">
                  {isAr ? "أجهزة ESP32 المكتشفة" : "CHIP COMPILER NODES"}
                </div>
                {devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDevice(d);
                      setShowDevicePicker(false);
                    }}
                    className={`w-full text-right flex items-center justify-between p-2 rounded-lg text-xs transition-all pointer-cursor ${
                      d.id === selectedDevice.id
                        ? "bg-sky-950/40 border border-sky-500/20 text-sky-300 font-bold"
                        : "hover:bg-slate-900/60 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${d.status === "online" ? "bg-emerald-500" : "bg-slate-600"}`} />
                      <span>{d.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{d.roomName}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sync telemetry controller metrics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-950/50 py-1.5 px-3 rounded-lg border border-slate-900 select-none">
            <RefreshCw className={`w-3 h-3 text-sky-400 ${countdown === 3 ? "animate-spin" : ""}`} />
            <span>{countdown} {t.sec}</span>
          </div>

          <button
            onClick={handleRefreshClick}
            className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-slate-300 transition-colors select-none cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Network health tags panel */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900/20 p-2 border border-slate-900 rounded-xl flex flex-col items-center justify-center text-center">
          <Database className="w-4 h-4 text-slate-500 mb-0.5" />
          <span className="text-[9px] text-slate-400 font-sans">{t.deviceCount}</span>
          <span className="text-xs font-mono font-bold text-white mt-0.5">{devices.length}</span>
        </div>
        <div className="bg-slate-900/20 p-2 border border-slate-900 rounded-xl flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-4 h-4 text-emerald-500 mb-0.5" />
          <span className="text-[9px] text-slate-400 font-sans">{t.activeNodes}</span>
          <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
            {devices.filter(d => d.status === "online").length}
          </span>
        </div>
        <div className="bg-slate-900/20 p-2 border border-slate-900 rounded-xl flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-4 h-4 text-slate-500 mb-0.5" />
          <span className="text-[9px] text-slate-400 font-sans">{t.offlineNodes}</span>
          <span className="text-xs font-mono font-bold text-rose-400 mt-0.5">
            {devices.filter(d => d.status === "offline").length}
          </span>
        </div>
      </div>

      {/* Main Air Quality Indicator Guard Card */}
      <div className={`p-6 rounded-3xl border transition-all duration-300 hover:shadow-xl backdrop-blur-md relative overflow-hidden ${borderStyle} ${glowStyle}`}>
        {/* Dynamic Glowing background gradient matches status color */}
        <div className={`absolute top-[-10%] right-[-10%] w-[180px] h-[180px] rounded-full blur-[80px] pointer-events-none opacity-30 ${
          isOffline ? "bg-slate-800" : sensorValue > 500 ? "bg-red-500" : sensorValue > 200 ? "bg-amber-500" : "bg-emerald-500"
        }`} />

        <div className="flex flex-col items-center text-center relative z-10">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-4">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.currentStatus}</span>
          </span>

          {/* Large circular gauge SVG gauge */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-5">
            {/* outer faint pulse rings */}
            {!isOffline && sensorValue > 200 && (
              <div className={`absolute inset-1 rounded-full border-2 border-dashed ${
                sensorValue > 500 ? "border-red-500 animate-spin" : "border-amber-500 animate-[pulse_3s_infinite]"
              }`} style={{ animationDuration: '4s' }} />
            )}

            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Back track circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Colored accent gauge arc */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                className={`transition-all duration-[800ms] ease-out ${ringColor}`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* In-gauge textual displays */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pt-2">
              {isOffline ? (
                <span className="text-sm font-sans font-medium text-slate-500">{isAr ? "غير متصل" : "OFFLINE"}</span>
              ) : (
                <>
                  <span className="text-4xl font-mono font-extrabold tracking-tight text-white mb-0.5">
                    {aqi}
                  </span>
                  <span className="text-[10px] font-sans font-bold text-slate-400 tracking-wider">
                    AQI INDEX
                  </span>
                  <div className={`mt-1.5 px-2.5 py-0.5 text-xxs font-sans font-semibold rounded-full border border-slate-800 ${aqiCat.color}`}>
                    {isAr ? aqiCat.nameAr : aqiCat.nameEn}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dynamic recommendation alert description */}
          <div className={`w-full max-w-sm rounded-2xl border p-3.5 text-center flex items-center gap-2.5 ${bannerBg}`}>
            {sensorValue > 500 ? (
              <Flame className="w-5 h-5 shrink-0 text-red-400 animate-spin" />
            ) : sensorValue > 200 ? (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 animate-bounce" />
            ) : (
              <Shield className="w-5 h-5 shrink-0 text-emerald-400" />
            )}
            <div className="text-right">
              <span className="block text-[11px] font-sans font-bold">{bannerText}</span>
              <span className="block text-[10px] font-sans font-normal text-slate-300 mt-1 leading-relaxed">
                {isOffline ? (isAr ? "تحقق من توصيل الكابل ومزود الطاقة لجهازك" : "Please check device cable configurations") : (isAr ? aqiCat.recommendationAr : aqiCat.recommendationEn)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of details, telemetry records */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sensor Raw PPM Card */}
        <div className="bg-slate-900/40 p-4 border border-slate-900 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <Wind className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-sans font-medium">{t.sensorValue}</span>
          </div>
          <div>
            <span className="text-2xl font-mono font-extrabold text-white">
              {isOffline ? "0" : sensorValue}
            </span>
            <span className="text-[10px] text-slate-500 font-mono ml-1">PPM</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-sans">
            {!isOffline && (
              <span>
                {sensorValue <= 200 ? (isAr ? "نطاق آمن وطبيعي" : "Safe levels") : sensorValue <= 500 ? (isAr ? "تحذير - حذر مطلوب" : "Warning levels") : (isAr ? "خطر - تهوية عاجلة" : "Danger levels")}
              </span>
            )}
          </div>
        </div>

        {/* Location & Room Name */}
        <div className="bg-slate-900/40 p-4 border border-slate-900 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-sans font-medium">{t.location}</span>
          </div>
          <div>
            <div className="text-sm font-sans font-bold text-white truncate">{selectedDevice.location}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5 truncate">{selectedDevice.roomName}</div>
          </div>
          <div className="text-[9px] text-slate-500 font-mono">
            MAC: {selectedDevice.macAddress}
          </div>
        </div>

        {/* Device health diagnostics */}
        <div className="bg-slate-900/40 p-4 border border-slate-900 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-sans font-medium">{t.deviceHealth}</span>
          </div>
          <div>
            <span className={`text-sm font-sans font-extrabold ${
              isOffline ? "text-slate-500" : selectedDevice.sensorHealth === "healthy" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {isOffline ? (isAr ? "غير متصل" : "Offline") : selectedDevice.sensorHealth === "healthy" ? t.healthy : t.warning}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {isAr ? "إصدار:" : "Firmware:"} {selectedDevice.firmwareVersion}
          </div>
        </div>

        {/* Wi-Fi & Battery Status Card */}
        <div className="bg-slate-900/40 p-4 border border-slate-900 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-sans font-medium">{t.wifi}</span>
            </div>
            {selectedDevice.batteryLevel !== undefined && (
              <div className="flex items-center gap-0.5">
                <Battery className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[9px] font-mono">{selectedDevice.batteryLevel}%</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-xs font-mono font-bold text-white">
            {isOffline ? (
              <span className="text-slate-500">{isAr ? "لا توجد إشارة" : "No signal"}</span>
            ) : (
              <span>{selectedDevice.wifiSignal.toUpperCase()} ({selectedDevice.wifiRssi} dBm)</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-sans mt-1">
            Uptime: <span className="font-mono">{formatUptimeValue(selectedDevice.uptime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
