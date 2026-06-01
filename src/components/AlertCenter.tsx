import React, { useState, useEffect } from "react";
import { 
  Bell, Search, Filter, ShieldAlert, Check, 
  Trash2, Download, AlertTriangle, CloudRain, Cpu, RefreshCw
} from "lucide-react";
import { SystemAlert } from "../types";
import { getApiUrl } from "../utils";

interface AlertCenterProps {
  lang: "ar" | "en";
  onAlertsCountChange?: (count: number) => void;
}

export default function AlertCenter({ lang, onAlertsCountChange }: AlertCenterProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "warning" | "danger" | "device_offline">("all");
  const [loading, setLoading] = useState(false);

  const isAr = lang === "ar";
  const t = {
    title: isAr ? "مركز الإنذارات الذكي" : "Smart Alert Center",
    sub: isAr ? "استعرض سجل الإشعارات، التنبيهات والأحداث الطارئة المفعلة بالنظام" : "Review system alarms, active warnings, and critical events.",
    searchPlaceholder: isAr ? "البحث في نص الإنذار أو اسم الموقع..." : "Search alerts, devices, rooms...",
    all: isAr ? "الكل" : "All",
    warning: isAr ? "تحذيرات برتقالية" : "Warnings",
    danger: isAr ? "مخاطر عالية" : "Critical Danger",
    offline: isAr ? "أجهزة متوقفة" : "Offline Devices",
    clearAll: isAr ? "مسح السجل بالكامل" : "Clear History",
    resolve: isAr ? "حل ومعالجة" : "Resolve",
    resolved: isAr ? "تم الحل" : "Resolved",
    export: isAr ? "تصدير الملخص" : "Export Dossier",
    empty: isAr ? "السجل نظيف تماماً ولا توجد إنذارات نشطة حالياً" : "Dossier clean, no active notifications.",
    warningTag: isAr ? "تحذير متوسط" : "Warning Level",
    dangerTag: isAr ? "خطر طارئ" : "Critical Danger",
    offlineTag: isAr ? "تعطل الاتصال" : "Offline",
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/alerts"));
      if (res.ok) {
        const data: SystemAlert[] = await res.json();
        setAlerts(data);
        if (onAlertsCountChange) {
          onAlertsCountChange(data.filter(a => !a.resolved).length);
        }
      }
    } catch (err) {
      console.error("Error reading alert center registries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 4 seconds to catch hardware updates from controller
    const interval = setInterval(fetchAlerts, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/alerts/${id}/resolve`), {
        method: "POST"
      });
      if (res.ok) {
        const updatedAlerts = await res.json();
        await fetchAlerts();
      }
    } catch (err) {
      console.error("Error resolving alarm:", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(isAr ? "هل أنت متأكد من مسح جميع تنبيهات السجل بالكامل؟" : "Confirm deleting historical summaries?")) return;
    try {
      const res = await fetch(getApiUrl("/api/alerts/clear"), {
        method: "POST"
      });
      if (res.ok) {
        setAlerts([]);
        if (onAlertsCountChange) onAlertsCountChange(0);
      }
    } catch (err) {
      console.error("Error purging logs:", err);
    }
  };

  const handleSimulateExport = () => {
    // Write nice summary print alert
    const header = isAr ? "--- تقرير ملخص إنذارات المنقذ الذكي ---" : "--- Smart Savior Alarms Summary ---";
    const body = alerts.map(a => `[${a.timestamp.slice(11, 16)}] [${a.severity.toUpperCase()}] ${a.deviceName}: ${a.message}`).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Smart_Savior_Alert_Logs_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter and search computation
  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = a.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === "all") return matchesSearch;
    if (filterType === "warning") return matchesSearch && a.severity === "warning" && a.type === "air_quality";
    if (filterType === "danger") return matchesSearch && a.severity === "danger" && a.type === "air_quality";
    if (filterType === "device_offline") return matchesSearch && a.type === "device_offline";
    
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Drawer */}
      <div className="bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
        <h3 className="text-sm font-sans font-bold text-white mb-1.5 flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-sky-400" />
          <span>{t.title}</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-sans mb-3.5">{t.sub}</p>

        {/* Custom Search field styled with icon */}
        <div className="relative mb-3">
          <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full text-slate-100 bg-slate-950 border border-slate-800/80 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 rounded-xl py-2.5 pr-10 pl-4 text-xs focus:outline-none transition-all placeholder:text-slate-600 font-sans"
          />
        </div>

        {/* Filter Badges carousel */}
        <div className="flex gap-1 overflow-x-auto select-none pt-1">
          {(["all", "warning", "danger", "device_offline"] as const).map((f) => {
            const labels = { all: t.all, warning: t.warning, danger: t.danger, device_offline: t.offline };
            const isActive = filterType === f;
            return (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`py-1.5 px-3 rounded-lg text-[9px] font-sans font-medium transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? "bg-slate-800 border border-slate-700 text-white font-bold" 
                    : "text-slate-500 bg-slate-950/40 hover:text-slate-300 border border-transparent"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Actions bar */}
      {alerts.length > 0 && (
        <div className="flex justify-between items-center select-none font-sans">
          <button
            onClick={handleClearAll}
            className="text-slate-500 hover:text-rose-400 text-xxs font-semibold flex items-center gap-1 py-1 px-2 hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearAll}</span>
          </button>

          <button
            onClick={handleSimulateExport}
            className="text-sky-400 hover:text-sky-300 text-xxs font-semibold flex items-center gap-1 py-1 px-2.5 bg-sky-950/30 border border-sky-500/20 rounded-lg transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.export}</span>
          </button>
        </div>
      )}

      {/* Dynamic Alerts List */}
      <div className="space-y-2.5">
        {loading && alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-sans">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
            <span>جاري فرز التنبيهات...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl p-8 text-center select-none font-sans">
            <CloudRain className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <h4 className="text-slate-400 text-xs font-bold">{t.empty}</h4>
            <span className="text-[10px] text-slate-600 block mt-1">يتحقق النظام من عينات ESP32 باستمرار</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isDanger = alert.severity === "danger";
            const isOffline = alert.type === "device_offline";
            
            let colorMap = "border-amber-500/20 bg-amber-950/10 text-amber-200";
            let iconMap = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
            let tagLabel = t.warningTag;

            if (isDanger) {
              colorMap = "border-red-500/30 bg-red-950/15 text-red-200";
              iconMap = <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />;
              tagLabel = t.dangerTag;
            } else if (isOffline) {
              colorMap = "border-slate-800 bg-slate-900/40 text-slate-400";
              iconMap = <Cpu className="w-5 h-5 text-slate-500 shrink-0" />;
              tagLabel = t.offlineTag;
            }

            return (
              <div 
                key={alert.id}
                className={`p-4 rounded-2xl border flex gap-3 items-start justify-between backdrop-blur-md transition-all ${colorMap} ${
                  alert.resolved ? "opacity-45 grayscale" : ""
                }`}
              >
                <div className="flex gap-3 items-start text-right">
                  <div className="mt-0.5">{iconMap}</div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-sans font-extrabold text-white">{alert.deviceName}</span>
                      <span className="text-[8px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">{tagLabel}</span>
                    </div>
                    <p className="text-xs font-sans font-medium text-slate-300 mt-1.5 leading-relaxed">{alert.message}</p>
                    <div className="text-[9px] text-slate-500 font-mono mt-2 select-none">
                      {alert.timestamp.slice(0, 10)} • {alert.timestamp.slice(11, 16)} • MQ-135 Value: <span className="font-bold">{alert.value} PPM</span>
                    </div>
                  </div>
                </div>

                {/* Resolve controller trigger button */}
                {!alert.resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="p-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t.resolve}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
