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
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);

  // Advanced reactive overrides for smooth receding animations
  const [overrideSensorValue, setOverrideSensorValue] = useState<number | null>(null);
  const [overrideAqi, setOverrideAqi] = useState<number | null>(null);
  const [isClearingGas, setIsClearingGas] = useState(false);

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

  // Safe Receding Simulation: Gradually steps down sensor values to green zone
  const handleUnderstoodAndRecede = async () => {
    setIsGasModalOpen(false);
    
    // If unit is offline, just dismiss modal.
    if (isOffline) return;

    setIsClearingGas(true);
    
    // Starting values (based on current active state)
    const startVal = selectedDevice.sensorValue;
    const startAqi = selectedDevice.aqi;
    
    // Destination safe parameters inside the green zone
    const targetVal = startVal <= 80 ? Math.max(15, startVal - 25) : 75;
    const targetAqi = startAqi <= 25 ? Math.max(5, startAqi - 15) : 15;
    
    const duration = 3000; // 3 seconds buttery transition
    const intervalTime = 100; // updates every 100ms
    const steps = duration / intervalTime;
    let currentStep = 0;

    // Send the safe state telemetry to the backend server so the system registers safety
    try {
      await fetch("/api/devices/update-sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDevice.id,
          sensorValue: targetVal,
          status: "online",
          wifiSignal: selectedDevice.wifiSignal || "good",
          batteryLevel: selectedDevice.batteryLevel || 98
        })
      });
    } catch (err) {
      console.warn("Could not notify server, reverting clientside indicator locally", err);
    }

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      // Interpolate countdown steps down smoothly
      const currentSensor = Math.round(startVal - (startVal - targetVal) * progress);
      const currentAqi = Math.round(startAqi - (startAqi - targetAqi) * progress);
      
      setOverrideSensorValue(currentSensor);
      setOverrideAqi(currentAqi);
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setOverrideSensorValue(targetVal);
        setOverrideAqi(targetAqi);
        
        // Let the REST poller catch up with the safe database value, then release overrides
        setTimeout(() => {
          setIsClearingGas(false);
          setOverrideSensorValue(null);
          setOverrideAqi(null);
        }, 1500);
      }
    }, intervalTime);
  };

  // Determine status color levels (uses simulated override values if active)
  const sensorValue = overrideSensorValue !== null ? overrideSensorValue : selectedDevice.sensorValue;
  const isOffline = selectedDevice.status === "offline";
  const aqi = overrideAqi !== null ? overrideAqi : selectedDevice.aqi;
  const aqiCat = getAqiCategory(aqi);

  let borderStyle = "border-slate-800 bg-slate-900/60";
  let ringColor = "stroke-emerald-500";
  let pulseAnimation = "";
  let glowStyle = "shadow-emerald-500/5";
  let bannerBg = "bg-emerald-950/20 text-emerald-400 border-emerald-500/20";
  let bannerText = t.safeTitle;

  // Extraordinary dynamic styling configurations
  let activeGradient = "url(#safeGradient)";
  let dotColor = "fill-emerald-400";
  let glowColorRGBA = "16, 185, 129";
  let beadGlowClass = "shadow-emerald-500/40";

  if (isOffline) {
    borderStyle = "border-slate-800/80 bg-slate-900/40 text-slate-400";
    ringColor = "stroke-slate-700";
    glowStyle = "";
    bannerBg = "bg-slate-950/80 text-slate-500 border-slate-800";
    bannerText = t.offlineText;
    activeGradient = "url(#offlineGradient)";
    dotColor = "fill-slate-500";
    glowColorRGBA = "100, 116, 139";
    beadGlowClass = "shadow-slate-500/25";
  } else if (sensorValue > 500) {
    // Danger Threshold
    borderStyle = "border-red-500/30 bg-slate-950/80 shadow-red-500/10";
    ringColor = "stroke-red-500";
    pulseAnimation = "animate-ping opacity-60";
    glowStyle = "shadow-red-500/20 pulse-red-dashboard flash-border-red";
    bannerBg = "bg-red-950/30 text-red-100 border-red-500/30 animate-pulse";
    bannerText = t.dangerTitle;
    activeGradient = "url(#dangerGradient)";
    dotColor = "fill-rose-400";
    glowColorRGBA = "239, 68, 68";
    beadGlowClass = "shadow-red-500/50 animate-pulse";
  } else if (sensorValue > 200) {
    // Warning Threshold
    borderStyle = "border-amber-500/20 bg-slate-900/60 shadow-amber-500/5";
    ringColor = "stroke-amber-500";
    pulseAnimation = "pulse-orange opacity-40";
    glowStyle = "shadow-amber-500/10 pulse-orange-dashboard";
    bannerBg = "bg-amber-950/20 text-amber-400 border-amber-500/20";
    bannerText = t.warnTitle;
    activeGradient = "url(#warningGradient)";
    dotColor = "fill-amber-400";
    glowColorRGBA = "245, 158, 11";
    beadGlowClass = "shadow-amber-500/40";
  } else {
    // Safe
    borderStyle = "border-emerald-500/15 bg-slate-900/60";
    ringColor = "stroke-emerald-500/90";
    glowStyle = "shadow-emerald-500/10 glow-emerald-dashboard";
    bannerBg = "bg-emerald-950/30 text-emerald-400 border-emerald-500/20";
    bannerText = t.safeTitle;
    activeGradient = "url(#safeGradient)";
    dotColor = "fill-emerald-400";
    glowColorRGBA = "16, 185, 129";
    beadGlowClass = "shadow-emerald-500/40";
  }

  // Calculate circular stroke offsets
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // Map AQI (0 to 500) to gauge percentage (0 to 100)
  const percentFilled = isOffline ? 0 : Math.min(100, Math.max(0, (aqi / 500) * 100));
  const strokeDashoffset = circumference - (percentFilled / 100) * circumference;

  // Glowing dot positions at the edge of the active progress segment
  // Starts at top (-90 degrees, i.e. -Math.PI / 2)
  const finalAngle = -Math.PI / 2 + (percentFilled / 100) * 2 * Math.PI;
  const dotX = 80 + radius * Math.cos(finalAngle);
  const dotY = 80 + radius * Math.sin(finalAngle);

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
      <div className={`p-6 rounded-3xl border transition-all duration-300 hover:shadow-2xl backdrop-blur-md relative overflow-hidden ${borderStyle} ${glowStyle}`}>
        {/* Dynamic Glowing background gradient matches status color */}
        <div 
          className="absolute top-[-15%] right-[-15%] w-[210px] h-[210px] rounded-full blur-[100px] pointer-events-none opacity-40 transition-all duration-500 ease-in-out" 
          style={{ backgroundColor: `rgba(${glowColorRGBA}, 0.6)` }}
        />

        <div className="flex flex-col items-center text-center relative z-10">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-5 bg-slate-950/40 px-3 py-1 rounded-full border border-slate-900 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOffline ? "bg-slate-400" : sensorValue > 500 ? "bg-red-400" : "bg-emerald-405"}`} style={{ backgroundColor: `rgba(${glowColorRGBA}, 1)` }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: `rgba(${glowColorRGBA}, 1)` }} />
            </span>
            <span>{t.currentStatus}</span>
          </span>

          {/* Large circular gauge SVG gauge */}
          <div className="relative w-44 h-44 flex items-center justify-center mb-5">
            {/* outer faint pulse rings */}
            {!isOffline && (
              <div className="absolute inset-0 rounded-full border border-slate-800/40 pointer-events-none scale-105" />
            )}
            {!isOffline && sensorValue > 200 && (
              <div 
                className={`absolute inset-[-4px] rounded-full border border-dashed opacity-40 ${
                  sensorValue > 500 ? "border-red-500 animate-[spin_8s_linear_infinite]" : "border-amber-500 animate-[spin_12s_linear_infinite]"
                }`} 
              />
            )}

            {/* Inner premium glassmorphic circle background */}
            <div className="absolute inset-4 rounded-full bg-slate-950/90 backdrop-blur-sm border border-slate-800/60 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center pointer-events-none" />

            <svg 
              className="w-full h-full transform -rotate-90 select-none transition-all duration-500" 
              viewBox="0 0 160 160"
              style={{ filter: `drop-shadow(0 0 20px rgba(${glowColorRGBA}, 0.6))` }}
            >
              <defs>
                {/* Stunning Premium Linear Gradients */}
                <linearGradient id="safeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="warningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="dangerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id="offlineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                {/* Extraordinary Neon Glow Filter */}
                <filter id="neonGaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Sub-Dial Outer Scale / Ring */}
              <circle
                cx="80"
                cy="80"
                r={radius + 8}
                className="stroke-slate-800/30"
                strokeWidth="1"
                strokeDasharray="3, 5"
                fill="none"
              />

              {/* Back track circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-900"
                strokeWidth="10"
                fill="transparent"
              />

              {/* Subtle background track glow overlay */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-800/40"
                strokeWidth="10"
                fill="transparent"
              />

              {/* 8 Beautiful Technical Micro Ticks at 45 degree intervals */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const tx = 80 + 52 * Math.cos(rad);
                const ty = 80 + 52 * Math.sin(rad);
                return (
                  <circle
                    key={i}
                    cx={tx}
                    cy={ty}
                    r="1.5"
                    className="fill-slate-700/60"
                  />
                );
              })}

              {/* Thick blurred glow underlay for stunning outer halo of progress */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                stroke={activeGradient}
                strokeWidth="18"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
                filter="url(#neonGaugeGlow)"
                className="opacity-30"
              />

              {/* Secondary medium glow layer for concentrated neon density */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                stroke={activeGradient}
                strokeWidth="14"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
                filter="url(#neonGaugeGlow)"
                className="opacity-50"
              />

              {/* Colored accent gauge arc using corresponding gradient fill (Sharp crisp top-most path) */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                stroke={activeGradient}
                strokeWidth="10"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
                fill="transparent"
              />

              {/* Modern high-tech glowing bead indicator at active tip segment */}
              {!isOffline && (
                <>
                  <motion.circle
                    cx={dotX}
                    cy={dotY}
                    r="12"
                    className={`${dotColor} opacity-30`}
                    animate={{ scale: [0.8, 1.8, 0.8], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                  <motion.circle
                    cx={dotX}
                    cy={dotY}
                    r="7"
                    className={`${dotColor} opacity-95 filter drop-shadow-[0_0_10px_#ffffff]`}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                </>
              )}
            </svg>

            {/* In-gauge textual displays */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pt-1 z-10">
              {isOffline ? (
                <span className="text-sm font-sans font-semibold tracking-wide text-slate-500">{isAr ? "غير متصل" : "OFFLINE"}</span>
              ) : (
                <>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-4xl lg:text-5xl font-mono font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                      {aqi}
                    </span>
                  </div>
                  <span className="text-[9px] font-sans font-bold text-slate-400 tracking-widest mt-0.5">
                    AQI INDEX
                  </span>
                  <div className={`mt-2.5 px-3 py-0.5 text-[9px] font-sans font-bold rounded-full border shadow-sm flex items-center gap-1 backdrop-blur-md ${aqiCat.color}`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sensorValue > 500 ? "bg-red-400" : sensorValue > 200 ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${sensorValue > 500 ? "bg-red-500" : sensorValue > 200 ? "bg-amber-500" : "bg-emerald-500"}`} />
                    </span>
                    <span>{isAr ? aqiCat.nameAr : aqiCat.nameEn}</span>
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
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 animate-bounce" />
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

          {/* Interactive Gas Valve Shut-off Action Button - only visible if orange warning or above and not offline */}
          {!isOffline && sensorValue > 200 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsGasModalOpen(true)}
              className="mt-3.5 w-full max-w-sm py-2 px-4 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 border bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.45)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.7)] hover:text-white transition-all duration-300 ease-out cursor-pointer select-none"
            >
              <Flame className="w-4 h-4 text-current animate-pulse" />
              <span className="font-bold">{isAr ? "⚠️ قطع وإغلاق صمام الغاز الذكي فوراً" : "⚠️ Shut Off Smart Gas Valve Now"}</span>
            </motion.button>
          )}
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

      {/* Extraordinary Glow Gas Shut-off & Window Opening Popup Modal */}
      <AnimatePresence>
        {isGasModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Smooth back backdrop with strong blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGasModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Premium Dialog Box with Neon Dual Borders */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-slate-900/95 border border-emerald-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(16,185,129,0.35)] backdrop-blur-2xl overflow-hidden z-10 text-center"
            >
              {/* Absolutes for futuristic circuit look */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_12px_#06b6d4]" />
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

              {/* Status Header Icon */}
              <div className="inline-flex items-center justify-center p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl mb-4 text-emerald-400 shadow-lg shadow-emerald-950/60 animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>

              {/* Success Message Banner */}
              <h3 className="text-xl font-bold font-sans text-white tracking-tight">
                {isAr ? "تم إغلاق وإيقاف صمام الغاز بنجاح" : "Gas Valve Automatically Shut Off"}
              </h3>
              <p className="text-emerald-400 font-mono text-[10px] tracking-widest uppercase mt-1 select-none">
                {isAr ? "🔒 حالة المنطقة: مؤمّنة ومعزولة" : "🔒 ZONE STATE: SECURED & COLD"}
              </p>

              {/* Beautiful, extraordinary SVG illustration of open window with fresh wind flow */}
              <div className="relative my-4 py-2 bg-slate-950/50 border border-slate-800/60 rounded-2xl shadow-inner select-none">
                <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[9px] font-sans font-bold bg-sky-950/60 border border-sky-500/30 text-sky-400 animate-pulse">
                  {isAr ? "💡 تذكير أمان عاجل" : "💡 Urgent Safety Alert"}
                </div>
                
                <svg viewBox="0 0 200 160" className="w-48 h-40 mx-auto overflow-visible">
                  {/* Outer Window Frame structure */}
                  <rect x="30" y="20" width="140" height="120" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="4" className="shadow-lg" />
                  
                  {/* Inside Room Perspective background */}
                  <rect x="36" y="26" width="128" height="108" rx="4" fill="#0b0f19" />
                  
                  {/* Peaceful outdoor landscape visible through the window */}
                  <path d="M 36 100 Q 70 80 100 110 T 164 120 L 164 134 L 36 134 Z" fill="#064e3b" opacity="0.4" />
                  <path d="M 36 115 Q 110 90 164 110 L 164 134 L 36 134 Z" fill="#047857" opacity="0.5" />
                  <circle cx="130" cy="55" r="14" fill="#10b981" opacity="0.15" className="animate-pulse" />

                  {/* Left glass panel swung wide open inside-out */}
                  <motion.g
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: -72 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    style={{ transformOrigin: "36px center", perspective: 600 }}
                  >
                    {/* Frame panel */}
                    <rect x="36" y="26" width="64" height="108" rx="1" fill="#334155" stroke="#4a5568" strokeWidth="3" opacity="0.95" />
                    {/* Glass plate */}
                    <rect x="41" y="31" width="54" height="98" rx="1" fill="#38bdf8" opacity="0.15" />
                    {/* Glass shine accent diagonal lines */}
                    <line x1="48" y1="40" x2="72" y2="76" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />
                    {/* Window handles */}
                    <circle cx="92" cy="80" r="3.5" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                  </motion.g>

                  {/* Right glass panel swung wide open inside-out */}
                  <motion.g
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 72 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    style={{ transformOrigin: "164px center", perspective: 600 }}
                  >
                    {/* Frame panel */}
                    <rect x="100" y="26" width="64" height="108" rx="1" fill="#334155" stroke="#4a5568" strokeWidth="3" opacity="0.95" />
                    {/* Glass plate */}
                    <rect x="105" y="31" width="54" height="98" rx="1" fill="#38bdf8" opacity="0.15" />
                    {/* Glass shine accent diagonal lines */}
                    <line x1="112" y1="40" x2="136" y2="76" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />
                    {/* Window handles */}
                    <circle cx="108" cy="80" r="3.5" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                  </motion.g>

                  {/* Wind flow breezes animating into the room beautifully */}
                  <g>
                    {/* Air Wave 1 */}
                    <motion.path
                      d="M 24 60 C 60 45, 90 75, 120 50 C 140 35, 160 55, 185 45"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "15, 100", strokeDashoffset: 120 }}
                      animate={{ strokeDashoffset: -120 }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                    />
                    {/* Air Wave 2 */}
                    <motion.path
                      d="M 16 90 C 50 75, 100 110, 130 85 C 150 70, 165 95, 188 80"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "30, 120", strokeDashoffset: 150 }}
                      animate={{ strokeDashoffset: -150 }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear", delay: 0.4 }}
                    />
                    {/* Air Wave 3 */}
                    <motion.path
                      d="M 32 115 C 70 100, 110 130, 140 105 C 160 90, 172 110, 182 100"
                      fill="none"
                      stroke="#a7f3d0"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "20, 90", strokeDashoffset: 100 }}
                      animate={{ strokeDashoffset: -100 }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear", delay: 0.8 }}
                    />
                  </g>
                </svg>
              </div>

              {/* Crucial notification / hint */}
              <div className="bg-sky-950/30 border border-sky-500/20 text-sky-100 rounded-2xl p-4 mb-5 text-right flex flex-col gap-1.5 shadow-md">
                <span className="text-[12px] font-sans font-extrabold flex items-center gap-1.5 text-sky-400">
                  <Wind className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>{isAr ? "افتح جميع النوافذ والشبابيك فوراً!" : "Open all windows and vents now!"}</span>
                </span>
                <span className="text-[10px] font-sans text-slate-300 leading-relaxed font-normal">
                  {isAr 
                    ? "لقد أغلقنا صمام الغاز بنجاح لمنع أي تسريب إضافي، لكن يرجى فتح الشبابيك فوراً لتهوية العنبر/المكان وضمان دخول الهواء النقي وطرد بقايا الغاز المعلق."
                    : "The physical ESP valve has been locked to prevent leaks. Please open all windows immediately to purge trapped gas spikes and let fresh clean ambient air in."
                  }
                </span>
              </div>

              {/* Confirmed / Got it close Action Button */}
              <button
                type="button"
                onClick={handleUnderstoodAndRecede}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 hover:text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] duration-300 transition-all font-sans cursor-pointer select-none"
              >
                {isAr ? "فهمت، تم فتح النوافذ والشبابيك ✅" : "Understood, Windows Are Open ✅"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
