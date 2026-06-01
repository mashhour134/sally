import React, { useState } from "react";
import { 
  Cpu, Wifi, RotateCcw, RefreshCw, Radio, HardDrive, 
  MapPin, Plus, Smartphone, Clock, ShieldCheck, X, Check, Eye
} from "lucide-react";
import { Device } from "../types";

interface DeviceManagementProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  lang: "ar" | "en";
  onAddDevice: (newDevice: { name: string; location: string; roomName: string; macAddress?: string }) => void;
}

export default function DeviceManagement({
  devices,
  onSelectDevice,
  lang,
  onAddDevice
}: DeviceManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newMac, setNewMac] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const isAr = lang === "ar";
  const t = {
    title: isAr ? "إدارة أجهزة الاستشعار" : "Hardware Management",
    sub: isAr ? "تحكم في أجهزة ESP32 الموزعة، أرسل أوامر التمكين وقم بتوصيل مستقبلات جديدة" : "Monitor distributed ESP32 nodes, send commands, and add hardware.",
    addDevice: isAr ? "إضافة جهاز استشعار جديد" : "Add ESP32 Node",
    restart: isAr ? "إعادة تشغيل" : "Restart IP Node",
    reconnect: isAr ? "إعادة تهيئة الـ Wi-Fi" : "Reconnect Wi-Fi",
    active: isAr ? "متصل بالإنترنت" : "Online",
    offline: isAr ? "خارج الخدمة" : "Offline",
    macAddress: isAr ? "عنوان MAC" : "MAC Base Address",
    firmware: isAr ? "إصدار البرمجية" : "Firmware Version",
    lastSeen: isAr ? "آخر نشاط" : "Last seen",
    uptime: isAr ? "وقت التشغيل النشط" : "System Uptime",
    rssi: isAr ? "قوة إشارة Wi-Fi" : "RSSI signal",
    actions: isAr ? "أوامر مبرمجة سريعة" : "Remote Commands",
    createTitle: isAr ? "ربط مستشعر ESP32 جديد" : "Register New ESP32 Sensor",
    inputName: isAr ? "اسم المستشعر (e.g. مستشعر المطبخ)" : "Device Node Name",
    inputLoc: isAr ? "موقع التثبيت (e.g. منزل المزرعة)" : "Installation Site",
    inputRoom: isAr ? "اسم الغرفة (e.g. المطبخ الرئيسي)" : "Room Name",
    inputMac: isAr ? "عنوان MAC الفيزيائي (اختياري)" : "MAC Address (Optional)",
    cancel: isAr ? "إلغاء لربط" : "Cancel",
    save: isAr ? "إكمال الربط الذكي" : "Bind Sensor",
    monitor: isAr ? "مراقبة وإشراف" : "Select & Monitor",
  };

  const handleTriggerRestart = async (id: string) => {
    setActionMessage(isAr ? "جاري إرسال أوامر إعادة تصفير لوحة ESP32..." : "Sending remote flash reboot command...");
    try {
      const res = await fetch(`/api/devices/${id}/restart`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(isAr ? "تم إرسال طاقة صفير اللوحة بنجاح. سيتراجع مؤقتاً ثم يعود للخدمة." : "Node restarted successfully. Reconnecting shortly.");
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerReconnect = async (id: string) => {
    setActionMessage(isAr ? "جاري تهيئة قنوات الوصول والمودم لـ ESP32..." : "Refreshing local router DHCP table rules...");
    try {
      const res = await fetch(`/api/devices/${id}/reconnect`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(isAr ? "تم تحسين قنوات الاتصال بالشبكة بنجاح." : "Wi-Fi calibration complete.");
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newLocation) return;
    onAddDevice({
      name: newName,
      location: newLocation,
      roomName: newRoom || "غير محدد",
      macAddress: newMac
    });
    // reset
    setNewName("");
    setNewLocation("");
    setNewRoom("");
    setNewMac("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Title Header area */}
      <div className="flex justify-between items-center bg-slate-900/40 p-3.5 border border-slate-800/80 rounded-2xl select-none font-sans">
        <div>
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>{t.title}</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">{t.sub}</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="p-2.5 bg-gradient-to-r from-sky-500 to-emerald-500 hover:opacity-90 rounded-xl text-white font-sans font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-sky-950/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addDevice}</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl flex items-center gap-2.5 antie-pulse font-sans">
          <Clock className="w-4 h-4 animate-spin shrink-0 text-indigo-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Grid of registered hardware node items */}
      <div className="space-y-3.5">
        {devices.map((device) => {
          const isOnline = device.status === "online";
          return (
            <div 
              key={device.id} 
              className={`p-4 rounded-2xl border bg-slate-900/60 backdrop-blur-md border-slate-800/80 hover:border-slate-700/80 transition-all font-sans relative overflow-hidden`}
            >
              {/* Outer decorative layout tags */}
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span className={`text-[9px] font-mono font-medium ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                  {isOnline ? t.active : t.offline}
                </span>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <Cpu className={`w-4.5 h-4.5 ${isOnline ? "text-emerald-400" : "text-slate-500"}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{device.name}</h4>
                    <span className="text-[10px] text-slate-500">{device.macAddress}</span>
                  </div>
                </div>

                {/* Grid details and RSSI stats */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 py-3 border-y border-slate-950/60 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{device.location} ({device.roomName})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-[10px]">Uptime: {isOnline ? `${Math.floor(device.uptime / 60)}m` : "0m"}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-[10px]">
                      {isOnline ? `${device.wifiSignal.toUpperCase()} (${device.wifiRssi}dBm)` : "NO SIGNAL"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-[10px]">{t.firmware} {device.firmwareVersion}</span>
                  </div>
                </div>

                {/* Commands tools */}
                <div className="flex gap-2 mt-4 select-none">
                  {/* Select device as monitoring core */}
                  <button
                    onClick={() => {
                      onSelectDevice(device);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-900 text-xxs font-bold text-sky-400 hover:text-sky-300 border border-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-inner"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.monitor}</span>
                  </button>

                  <button
                    onClick={() => handleTriggerReconnect(device.id)}
                    disabled={!isOnline}
                    className="flex-1 py-1.5 px-3 bg-slate-950 hover:bg-slate-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[10px] text-slate-400 rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t.reconnect}</span>
                  </button>

                  <button
                    onClick={() => handleTriggerRestart(device.id)}
                    disabled={!isOnline}
                    className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] text-slate-400 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title={t.restart}
                  >
                    <RotateCcw className="w-3 h-3 text-rose-500" />
                    <span>{t.restart}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Sensor Form Dialog (simulating robust dashboard modal panels) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5 select-none pt-1">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>{t.createTitle}</span>
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.inputName}</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مستشعر المختبر الطمي"
                  className="w-full text-slate-100 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.inputLoc}</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="مزرعة المشهراوي"
                  className="w-full text-slate-100 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.inputRoom}</label>
                <input
                  type="text"
                  required
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="عنبر التبريد الرئيسي"
                  className="w-full text-slate-100 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">{t.inputMac}</label>
                <input
                  type="text"
                  value={newMac}
                  onChange={(e) => setNewMac(e.target.value)}
                  placeholder="1A:2B:3C:4D:5E:6F"
                  className="w-full font-mono text-slate-100 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                />
              </div>

              <div className="flex gap-2 pt-3 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 px-3 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:opacity-95 text-white font-bold rounded-xl text-xs transition-opacity cursor-pointer shadow-md"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
