import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wind, Shield, Wifi, Battery, BatteryCharging, Clock, 
  Activity, AlertTriangle, ChevronDown, RefreshCw, Cpu, 
  Database, Bell, CheckCircle, Flame, MapPin, Sliders,
  Home, TrendingUp, Cpu as ChipIcon, ShieldAlert, Award, 
  Settings, User, Zap, VolumeX, Volume2
} from "lucide-react";

import { Device } from "./types";
import SplashScreen from "./components/SplashScreen";
import LoginScreen from "./components/LoginScreen";
import Esp32Simulator from "./components/Esp32Simulator";
import HomeDashboard from "./components/HomeDashboard";
import AnalyticsScreen from "./components/AnalyticsScreen";
import AlertCenter from "./components/AlertCenter";
import DeviceManagement from "./components/DeviceManagement";
import AdminPanel from "./components/AdminPanel";
import SettingsScreen from "./components/SettingsScreen";
import UserProfile from "./components/UserProfile";
import AutomationRules from "./components/AutomationRules";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string } | null>(null);
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  // Layout preference states
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("dark");
  const [activeTab, setActiveTab] = useState<"home" | "analytics" | "alerts" | "devices" | "admin" | "settings" | "profile" | "automation">("home");

  // Telemetry sensor states
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [alertsCount, setAlertsCount] = useState(0);
  const [thresholds, setThresholds] = useState({ safe: 200, warning: 500, danger: 1023 });

  // Web Audio Context state for Emergency Alarm
  const [emergencyMuted, setEmergencyMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertOscillatorRef = useRef<OscillatorNode | null>(null);
  const alertGainRef = useRef<GainNode | null>(null);

  const isAr = lang === "ar";

  // Fetch initial devices list and poll state every 3 seconds
  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        // Default select first device
        if (data.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to synchronizing network devices:", err);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, [selectedDeviceId]);

  // Check and handle custom physical audio alarms when sensor overrides danger threshold
  const activeDevice = devices.find((d) => d.id === selectedDeviceId);
  const isDangerZone = activeDevice && activeDevice.status === "online" && activeDevice.sensorValue > thresholds.warning;

  // Synthesize physical sirens loops
  useEffect(() => {
    if (isDangerZone && !emergencyMuted && user) {
      triggerEmergencySirenVoice(true);
    } else {
      triggerEmergencySirenVoice(false);
    }
    return () => triggerEmergencySirenVoice(false);
  }, [isDangerZone, emergencyMuted, user]);

  const triggerEmergencySirenVoice = (activate: boolean) => {
    try {
      if (activate) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        if (!alertOscillatorRef.current) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          // modulation warning sound - sweeping frequency
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          
          let cycle = 0;
          const sweepInterval = setInterval(() => {
            if (!alertOscillatorRef.current) {
              clearInterval(sweepInterval);
              return;
            }
            const freq = 450 + Math.sin(cycle) * 150;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            cycle += 0.5;
          }, 100);

          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start();
          alertOscillatorRef.current = osc;
          alertGainRef.current = gain;
        }
      } else {
        if (alertOscillatorRef.current) {
          try {
            alertOscillatorRef.current.stop();
          } catch (e) {}
          alertOscillatorRef.current.disconnect();
          alertOscillatorRef.current = null;
        }
        if (alertGainRef.current) {
          alertGainRef.current.disconnect();
          alertGainRef.current = null;
        }
      }
    } catch (err) {
      console.warn("AudioContext block by browser guidelines:", err);
    }
  };

  // Add new device callback
  const handleAddNewDevice = async (newDevice: { name: string; location: string; roomName: string; macAddress?: string }) => {
    try {
      const res = await fetch("/api/devices/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDevice)
      });
      if (res.ok) {
        const created = await res.json();
        // Append newly created device
        setDevices((prev) => [...prev, created]);
        setSelectedDeviceId(created.id);
        setActiveTab("home");
      }
    } catch (err) {
      console.error("Error committing register:", err);
    }
  };

  const handleUpdateSelectedDeviceLocal = (updatedDevice: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === updatedDevice.id ? updatedDevice : d)));
  };

  // Switch tabs helper inside simulator
  const renderSelectedTabScreen = () => {
    if (!activeDevice) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
          {isAr ? "تعذر العثور على أجهزة استشعار بالمنظومة" : "No sensors connected to this workspace."}
        </div>
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <HomeDashboard
            devices={devices}
            selectedDevice={activeDevice}
            onSelectDevice={(d) => setSelectedDeviceId(d.id)}
            onManualRefresh={fetchDevices}
            lang={lang}
            hasEmergencyAlert={!!isDangerZone}
          />
        );
      case "analytics":
        return <AnalyticsScreen selectedDevice={activeDevice} lang={lang} />;
      case "alerts":
        return <AlertCenter lang={lang} onAlertsCountChange={setAlertsCount} />;
      case "devices":
        return (
          <DeviceManagement
            devices={devices}
            onSelectDevice={(d) => setSelectedDeviceId(d.id)}
            lang={lang}
            onAddDevice={handleAddNewDevice}
          />
        );
      case "admin":
        return <AdminPanel devices={devices} selectedDevice={activeDevice} lang={lang} />;
      case "settings":
        return (
          <SettingsScreen
            lang={lang}
            onChangeLang={setLang}
            theme={themeMode}
            onChangeTheme={setThemeMode}
            thresholds={thresholds}
            onUpdateThresholds={setThresholds}
          />
        );
      case "profile":
        return (
          <UserProfile
            user={user!}
            onLogout={() => {
              triggerEmergencySirenVoice(false);
              setUser(null);
            }}
            lang={lang}
          />
        );
      case "automation":
        return <AutomationRules lang={lang} />;
      default:
        return null;
    }
  };

  // Unpack current date info
  const dateStrAr = new Intl.DateTimeFormat('ar-SA', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date());
  const dateStrEn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " + new Date().toLocaleDateString();

  // Handle splash load
  if (!isSplashComplete) {
    return <SplashScreen onLoadingComplete={() => setIsSplashComplete(true)} />;
  }

  // Handle authentication layer
  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  // Visual layout toggle depending on dark/light
  const isLightThemeActive = themeMode === "light";
  const deviceBgClass = isLightThemeActive 
    ? "bg-slate-50 text-slate-900 shadow-md" 
    : "bg-slate-950 text-slate-100";

  return (
    <div id="application-layout" className="min-h-screen bg-slate-950 flex flex-col justify-between select-none relative overflow-x-hidden pt-4 pb-8 px-4 font-sans text-slate-100">
      
      {/* Background ambient glowing shapes to make it super elegant */}
      <div className="absolute top-[10%] left-[-20%] w-[450px] h-[450px] bg-sky-950/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-20%] w-[450px] h-[450px] bg-emerald-950/25 rounded-full blur-[140px] pointer-events-none" />

      {/* Cybernetic telemetry hardware state banner */}
      <div className="w-full max-w-5xl mx-auto mb-4 border-b border-slate-900 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-emerald-500 text-white rounded-2xl shadow-lg">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-1.5">
              <span>حارس الهواء</span>
              <span className="text-xs uppercase font-mono tracking-widest px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">Air Guard</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
              {isAr ? "لوحة الإشراف المتكاملة لإنترنت الأشياء (IoT)" : "Supervisory Developer Workspace Console"}
            </span>
          </div>
        </div>

        {/* Global Sound Toggler */}
        {isDangerZone && (
          <div className="flex items-center gap-2 select-none animate-bounce">
            <button
              onClick={() => setEmergencyMuted(!emergencyMuted)}
              className={`p-2.5 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                emergencyMuted 
                  ? "bg-slate-900 text-slate-400 border-slate-800" 
                  : "bg-red-950/40 text-red-400 border-red-500/30 animate-pulse"
              }`}
              title={isAr ? "كتم جرس الطوارئ" : "Mute Siren"}
            >
              {emergencyMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-[9px] font-sans font-bold text-red-500 animate-pulse hidden md:inline-block">
              {isAr ? "⚠️ جرس الغاز نشط!" : "⚠️ Siren ON!"}
            </span>
          </div>
        )}
      </div>

      {/* Split Pane: ESP32 PCB breadboard and iOS Phone frame */}
      <div id="dual-pane-container" className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center flex-1">
        
        {/* Left Side: Custom NodeMCU hardware simulation breadboard */}
        <div className="w-full lg:w-5/12 flex-grow space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5 select-none">
              <ChipIcon className="w-4.5 h-4.5 text-sky-400 animate-spin" />
              <span>{isAr ? "محاكي رقاقة العينة (DEVELOPER INTERFACE)" : "Physical ESP32 IoT Node Simulator"}</span>
            </h3>
            <p className="text-[10px] text-slate-500 leading-normal mb-4">
              {isAr 
                ? "استشر اللوحة الفيزيائية بالأسفل لبرمجة PPM، وعزل الواي فاي وسحب كابل الطاقة لاختبار نظام الإنذار." 
                : "Slide indicators, sever Wifi, or pull node power plugs below to dry-run notifications."}
            </p>

            {activeDevice ? (
              <Esp32Simulator
                activeDevice={activeDevice}
                onUpdateDevice={handleUpdateSelectedDeviceLocal}
              />
            ) : (
              <div className="p-8 text-center text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
                {isAr ? "يرجى ربط جهاز جديد للبدء بإنترنت الأشياء" : "Please establish an active sensor first."}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: High fidelity smartphone frame container */}
        <div className="w-full lg:w-7/12 flex items-center justify-center">
          
          {/* Main Visual Smartphone Shell Wrapper */}
          <div 
            id="smartphone-bezel" 
            dir={isAr ? "rtl" : "ltr"}
            className="w-full max-w-[400px] aspect-[9/19] rounded-[48px] bg-slate-900 border-[10px] border-slate-800 shadow-2xl overflow-hidden relative flex flex-col justify-between"
            style={{
              boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.5), inset 0 0 12px rbg(255 255 255 / 0.05)",
              borderImage: "linear-gradient(to bottom, #1e293b, #0f172a) 1"
            }}
          >
            {/* Top Smartphone Camera Dynamic Island notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 flex justify-center z-40">
              <div className="w-28 h-4 bg-black rounded-b-xl flex items-center justify-between px-3 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                <span className="w-6 h-1 bg-slate-950 rounded-full" />
              </div>
            </div>

            {/* Simulated Mobile Status bar */}
            <div className={`px-5 pt-7 pb-1 flex justify-between items-center text-[10px] z-30 font-sans select-none ${
              isLightThemeActive ? "bg-slate-100 text-slate-800" : "bg-slate-900/90 text-slate-300"
            }`}>
              <div className="font-bold font-mono">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              <div className="flex items-center gap-1.5">
                {activeDevice?.status === "online" ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-slate-500" />
                )}
                {activeDevice?.batteryLevel !== undefined ? (
                  <div className="flex items-center gap-0.5">
                    <Battery className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-mono text-[9px] font-bold">{activeDevice.batteryLevel}%</span>
                  </div>
                ) : (
                  <Battery className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
            </div>

            {/* Inner scrollable viewport of mobile application */}
            <div 
              id="smartphone-viewport" 
              className={`flex-1 overflow-y-auto px-4 py-3 relative transition-colors ${deviceBgClass}`}
              style={{ contentVisibility: "auto" }}
            >
              {/* Emergency Danger Warning Siren Modal overlay */}
              {isDangerZone && (
                <div className="absolute inset-0 bg-red-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-[pulse_1.5s_infinite] border-4 border-red-500">
                  <div className="p-4 bg-red-500 rounded-full shadow-lg shadow-red-900/60 mb-4 animate-bounce">
                    <Flame className="w-12 h-12 text-white" />
                  </div>

                  <h2 className="text-xl font-sans font-extrabold text-white">
                    {isAr ? "🚨 تنبيه طوارئ: خطر تلوث هائل!" : "🚨 CRITICAL AIR POLLUTION!"}
                  </h2>
                  
                  <p className="text-xs text-red-200 mt-2 font-mono uppercase tracking-widest font-bold">
                    PPM RECORD: {activeDevice?.sensorValue} PPM
                  </p>

                  <p className="text-xs text-white leading-relaxed mt-4 bg-black/40 p-3 rounded-xl border border-red-500/20 text-right">
                    {isAr 
                      ? "تجاوزت مستويات سموم المستشعر عتبة الـ 500 PPM! نوصي بالخروج الفوري والتهوية الشاملة وتشغيل شفاطات التهوية تلقائياً."
                      : "We recommend initiating immediate room ventilation and activating hardware relays."}
                  </p>

                  {/* Actions buttons inside emergency warning */}
                  <div className="mt-6 space-y-2 w-full select-none">
                    <button
                      onClick={() => setEmergencyMuted(!emergencyMuted)}
                      className="w-full py-2.5 bg-white text-red-900 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {emergencyMuted ? (isAr ? "تفعيل صوت الإنذار" : "Unmute Siren") : (isAr ? "كتم جرس الطوارئ" : "Mute Siren")}
                    </button>

                    <button
                      onClick={() => {
                        // Temp lower sensor locally for testing convenience
                        handleUpdateSelectedDeviceLocal({
                          ...activeDevice,
                          sensorValue: 120
                        });
                      }}
                      className="w-full py-2 bg-transparent text-red-200 hover:text-white transition-colors text-xs font-sans"
                    >
                      {isAr ? "تجاوز التنبيه مؤقتاً" : "Close Overlay"}
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic screen views routes switcher */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: isAr ? 15 : -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isAr ? -15 : 15 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  {renderSelectedTabScreen()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Mobile Bottom Navigation Bar styled to match Material Design 3 */}
            <div className={`px-2.5 pt-2 pb-5 border-t select-none z-30 ${
              isLightThemeActive ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-900"
            }`}>
              <nav className="flex items-center justify-around">
                
                {/* Home tab button */}
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "home" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "الرئيسية" : "Home"}
                >
                  <Home className="w-5 h-5" />
                  <span className="text-[8px] font-sans font-medium">{isAr ? "الرئيسية" : "Monitor"}</span>
                </button>

                {/* Automation Rules Tab button */}
                <button
                  onClick={() => setActiveTab("automation")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "automation" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "الأتمتة" : "Automation"}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-[8px] font-sans font-medium">{isAr ? "الأتمتة" : "Rules"}</span>
                </button>

                {/* Analytics logs tab button */}
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "analytics" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "التحليلات" : "Analytics"}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-[8px] font-sans font-medium">{isAr ? "التحليلات" : "Charts"}</span>
                </button>

                {/* Alarm alerts center tab button */}
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer relative ${
                    activeTab === "alerts" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "الإنذارات" : "Alarms"}
                >
                  <Bell className="w-5 h-5" />
                  {alertsCount > 0 && (
                    <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-mono font-bold animate-pulse">
                      {alertsCount}
                    </span>
                  )}
                  <span className="text-[8px] font-sans font-medium">{isAr ? "الإنذارات" : "Alarms"}</span>
                </button>

                {/* Admin config panel */}
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "admin" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "المشرف" : "Supervisor"}
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-[8px] font-sans font-medium">{isAr ? "المشرف" : "Console"}</span>
                </button>

                {/* Settings Configuration tab button */}
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "settings" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "الضبط" : "Settings"}
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-[8px] font-sans font-medium">{isAr ? "الضبط" : "Settings"}</span>
                </button>

                {/* User credential tab button */}
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === "profile" 
                      ? "text-sky-400" 
                      : (isLightThemeActive ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-slate-200")
                  }`}
                  title={isAr ? "الملف" : "Owner"}
                >
                  <User className="w-5 h-5" />
                  <span className="text-[8px] font-sans font-medium">{isAr ? "الحساب" : "User"}</span>
                </button>

              </nav>
            </div>
          </div>

        </div>
      </div>

      <footer className="text-center text-[10px] text-slate-700 font-mono select-none mt-8 border-t border-slate-900 pt-3 flex items-center justify-between max-w-5xl w-full mx-auto">
        <span>AIR GUARD SECURED • FIRMWARE v3.2.1</span>
        <span>MASHHOUR SOBHI • 2026</span>
      </footer>
    </div>
  );
}
