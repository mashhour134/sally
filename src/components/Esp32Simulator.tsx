import React, { useState, useEffect } from "react";
import { Cpu, Wifi, Battery, Zap, AlertTriangle, RefreshCw, Send, Check } from "lucide-react";
import { Device, calculateAqi, getAqiCategory } from "../types";

interface Esp32SimulatorProps {
  activeDevice: Device;
  onUpdateDevice: (device: Device) => void;
}

export default function Esp32Simulator({ activeDevice, onUpdateDevice }: Esp32SimulatorProps) {
  const [sensorVal, setSensorVal] = useState(activeDevice.sensorValue);
  const [isPowerOn, setIsPowerOn] = useState(activeDevice.status === "online");
  const [wifiQuality, setWifiQuality] = useState(activeDevice.wifiSignal);
  const [batteryLevel, setBatteryLevel] = useState(activeDevice.batteryLevel || 100);
  const [isSyncing, setIsSyncing] = useState(false);
  const [txBlinker, setTxBlinker] = useState(false);
  const [rxBlinker, setRxBlinker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state whenever activeDevice changes
  useEffect(() => {
    setSensorVal(activeDevice.sensorValue);
    setIsPowerOn(activeDevice.status === "online");
    setWifiQuality(activeDevice.wifiSignal);
    setBatteryLevel(activeDevice.batteryLevel || 100);
    setHasUnsavedChanges(false);
  }, [activeDevice.id]);

  // Tx/Rx blinkers simulation of physical board UART communication
  useEffect(() => {
    if (activeDevice.status === "offline") return;
    const interval = setInterval(() => {
      setTxBlinker(true);
      setTimeout(() => setTxBlinker(false), 80);
      
      // Random response
      setTimeout(() => {
        setRxBlinker(true);
        setTimeout(() => setRxBlinker(false), 80);
      }, 150);
    }, 3000); // synchronizes with 3s refresh
    return () => clearInterval(interval);
  }, [activeDevice.status]);

  const handlePushTelemetry = async (
    targetVal: number, 
    power: boolean, 
    wifi: typeof wifiQuality, 
    battery: number
  ) => {
    setIsSyncing(true);
    setTxBlinker(true);
    setTimeout(() => setTxBlinker(false), 200);

    try {
      const response = await fetch("/api/devices/update-sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: activeDevice.id,
          sensorValue: targetVal,
          status: power ? "online" : "offline",
          wifiSignal: wifi,
          batteryLevel: battery
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Give feedback
        setRxBlinker(true);
        setTimeout(() => setRxBlinker(false), 200);
        onUpdateDevice(data.device);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error("Transmission error from node:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSensorVal(val);
    setHasUnsavedChanges(true);
    
    // Snappy responsive local updates so UI is super reactive
    if (isPowerOn && wifiQuality !== "none") {
      onUpdateDevice({
        ...activeDevice,
        sensorValue: val,
        aqi: calculateAqi(val)
      });
    }
  };

  const handlePowerToggle = () => {
    const nextPowerState = !isPowerOn;
    setIsPowerOn(nextPowerState);
    setHasUnsavedChanges(true);
    
    // Snappy responsive update
    onUpdateDevice({
      ...activeDevice,
      status: nextPowerState ? "online" : "offline",
      sensorValue: nextPowerState ? sensorVal : 0,
      aqi: nextPowerState ? calculateAqi(sensorVal) : 0
    });

    handlePushTelemetry(sensorVal, nextPowerState, wifiQuality, batteryLevel);
  };

  const handleWifiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const net = e.target.value as any;
    setWifiQuality(net);
    setHasUnsavedChanges(true);
    
    onUpdateDevice({
      ...activeDevice,
      wifiSignal: net
    });

    handlePushTelemetry(sensorVal, isPowerOn, net, batteryLevel);
  };

  const handleBatteryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBatteryLevel(val);
    setHasUnsavedChanges(true);
    
    onUpdateDevice({
      ...activeDevice,
      batteryLevel: val
    });
  };

  const aqi = calculateAqi(sensorVal);
  const matchedCat = getAqiCategory(aqi);

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 text-slate-100 shadow-xl backdrop-blur-md select-none font-sans">
      {/* Physical Chip Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative inline-flex p-1.5 bg-slate-950 rounded-lg border border-slate-800 text-sky-400">
            <Cpu className={`w-4 h-4 ${isPowerOn ? "animate-pulse text-emerald-400" : ""}`} />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" style={{ display: isPowerOn ? 'block' : 'none' }} />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-300">ESP32-DEVKIT-MQ135</h4>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">GPIO TARGET: {activeDevice.id}</p>
          </div>
        </div>

        {/* Board Hardware LEDs */}
        <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400">
          <div className="flex flex-col items-center">
            <span className={`w-2.5 h-2.5 rounded-sm border mb-0.5 border-slate-800 transition-colors duration-75 ${txBlinker ? "bg-red-500 shadow-lg shadow-red-500" : "bg-red-950"}`} />
            <span>TX</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`w-2.5 h-2.5 rounded-sm border mb-0.5 border-slate-800 transition-colors duration-75 ${rxBlinker ? "bg-emerald-500 shadow-lg shadow-emerald-500" : "bg-emerald-950"}`} />
            <span>RX</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`w-2.5 h-2.5 rounded-sm border mb-0.5 border-slate-800 transition-colors ${isPowerOn ? "bg-blue-500 shadow-lg shadow-blue-500" : "bg-blue-950"}`} />
            <span>PWR</span>
          </div>
        </div>
      </div>

      {/* Simulator Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handlePowerToggle}
          className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isPowerOn 
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60" 
              : "bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-950/60"
          }`}
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>{isPowerOn ? "الطاقة: نشط" : "الطاقة: مطفأ"}</span>
        </button>

        <button
          disabled={isSyncing || !hasUnsavedChanges}
          onClick={() => handlePushTelemetry(sensorVal, isPowerOn, wifiQuality, batteryLevel)}
          className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-white ${
            hasUnsavedChanges 
              ? "bg-sky-600 hover:bg-sky-500 cursor-pointer shadow-lg shadow-sky-950/50" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800"
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
          ) : hasUnsavedChanges ? (
            <Send className="w-3.5 h-3.5 animate-bounce" />
          ) : (
            <Check className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>ارسال الاتصال</span>
        </button>
      </div>

      {/* Simulation Controls Container */}
      <div className="space-y-4 bg-slate-950/50 border border-slate-900 rounded-xl p-3">
        {/* Sensor Slider */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">قراءة مستشعر الغاز (MQ135):</span>
            <span className="font-mono text-cyan-400 font-bold">{sensorVal} PPM</span>
          </div>
          <input
            type="range"
            min="0"
            max="1023"
            disabled={!isPowerOn}
            value={sensorVal}
            onChange={handleSliderChange}
            className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
            <span>0 PPM (نقي)</span>
            <span>200 (تحذير)</span>
            <span>500 (خطر)</span>
            <span>1023 (أقصى غاز)</span>
          </div>
        </div>

        {/* Simulated Parameters details */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">اتصال Wi-Fi:</label>
            <select
              value={wifiQuality}
              onChange={handleWifiChange}
              disabled={!isPowerOn}
              className="w-full bg-slate-900 border border-slate-800 rounded-md py-1 px-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500 disabled:opacity-30 cursor-pointer"
            >
              <option value="excellent">Excellent (-40 dBm)</option>
              <option value="good">Good (-65 dBm)</option>
              <option value="weak">Weak (-85 dBm)</option>
              <option value="none">Disconnected</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>البطارية:</span>
              <span className="font-mono text-slate-300">{batteryLevel}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              disabled={!isPowerOn}
              value={batteryLevel}
              onChange={handleBatteryChange}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-1 disabled:opacity-30"
            />
          </div>
        </div>
      </div>

      {/* Simulator Diagnostics Info */}
      <div className="mt-4 p-2.5 bg-slate-950 rounded-lg border border-slate-900 flex items-start gap-1.5">
        <AlertTriangle className={`w-4 h-4 shrink-0 text-amber-500 ${sensorVal > 500 ? "animate-pulse" : ""}`} />
        <div className="text-[10px] text-slate-400">
          <p className="font-sans font-medium line-clamp-1">
            {sensorVal > 500 
              ? "⚠️ حالة خطر نشطة: صفارات المحاكاة مشتعلة والبروتوكول نشط." 
              : sensorVal > 200 
              ? "⚡ تحذير متوسط: ينشط الآن التنبيه البرتقالي النبضي." 
              : "✅ حالة مستقرة وآمنة تماماً للموقع المربوط."}
          </p>
          <p className="font-mono text-[9px] text-slate-600 mt-0.5">
            Calculated AQI: {aqi} • ({matchedCat.nameAr}) • Recommendation: {matchedCat.recommendationAr.slice(0, 35)}...
          </p>
        </div>
      </div>
    </div>
  );
}
