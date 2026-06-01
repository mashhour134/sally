import React, { useState, useEffect } from "react";
import { 
  Shield, Server, Users, Terminal, FileText, Download, 
  Sparkles, RefreshCw, AlertCircle, Trash2, Globe, CheckCircle
} from "lucide-react";
import { Device, SystemLog } from "../types";

interface AdminPanelProps {
  devices: Device[];
  selectedDevice: Device;
  lang: "ar" | "en";
}

export default function AdminPanel({ devices, selectedDevice, lang }: AdminPanelProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warning" | "error">("all");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [reportRange, setReportRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [isDownloading, setIsDownloading] = useState("");

  const isAr = lang === "ar";
  const t = {
    title: isAr ? "منصة المشرف والعمليات" : "Admin Operations Console",
    sub: isAr ? "إدارة عمليات النظام وحسابات المسؤولين واستخراج التقارير وتتبع سجلات الوصلات" : "Manage system properties, export summaries, and track diagnostic logs.",
    statsTitle: isAr ? "إحصائيات الشبكة البيئية" : "Network Health Indexes",
    totalDev: isAr ? "مجموع مستقبلات ESP" : "Total ESP Nodes",
    onlineAvg: isAr ? "متوسط كفاءة التلوث" : "Average Network PPM",
    logsTitle: isAr ? "قارئ سجلات النظام الدقيقة (SysLog)" : "Direct System Diagnostic Logs",
    aiReportBtn: isAr ? "توليد تقرير تشخيصي ذكي (Gemini AI)" : "Generate AI Diagnostic Report",
    aiGenerating: isAr ? "جاري قياس البيانات وكتابة التقرير بالذكاء الاصطناعي..." : "Modeling telemetry into report...",
    downloadsTitle: isAr ? "خدمة التقارير الإدارية المعتمدة" : "Historical CSV/PDF Reports",
    dlDaily: isAr ? "تقرير المراقبة اليومي" : "Daily Report",
    dlWeekly: isAr ? "ملخص جودة الهواء الأسبوعي" : "Weekly Air Report",
    dlMonthly: isAr ? "تقرير الغازات السنوي الشامل" : "Monthly Gas Summary",
    exportPdf: isAr ? "تصدير كـ PDF" : "Download PDF",
    exportExcel: isAr ? "تصدير كـ Excel" : "Download Excel",
    noLogs: isAr ? "السجل التشخيصي فارغ تماماً" : "Syslog is completely vacant.",
    reportDone: isAr ? "تم إعداد تقرير الخبير!" : "Expert Diagnosis complete!",
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true);
    setAiReport("");
    try {
      const res = await fetch("/api/reports/ai-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice.id })
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.report);
      }
    } catch (err) {
      console.error(err);
      setAiReport(isAr ? "⚠️ فشل مواءمة التقرير. يرجى مراجعة ضبط مفتاح API في secrets." : "⚠️ Error generating report. Check API keys.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSimulateReportDownload = (type: "pdf" | "excel", reportName: string) => {
    setIsDownloading(`${reportName}-${type}`);
    setTimeout(() => {
      // Create a nice file download simulation
      const content = `SMART SAVIOR SYSTEM REPORT\nType: ${reportName}\nFormat: ${type.toUpperCase()}\nCreated At: 2026-06-01\nTarget Device: ${selectedDevice.name}\nMAC: ${selectedDevice.macAddress}\nAverage AQI: ${selectedDevice.aqi}\n\nThis file represents a commercial audit record exported from Smart Savior.`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Smart_Savior_Report_${reportName}.${type === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      URL.revokeObjectURL(url);
      setIsDownloading("");
    }, 1500);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(l => {
    if (logFilter === "all") return true;
    return l.level === logFilter;
  });

  // Network stats calculations
  const totalCount = devices.length;
  const onlineCount = devices.filter(d => d.status === "online").length;
  const avgPpm = devices.filter(d => d.status === "online").length > 0
    ? Math.round(devices.filter(d => d.status === "online").reduce((a, b) => a + b.sensorValue, 0) / onlineCount)
    : 110;

  return (
    <div className="space-y-4">
      {/* Consolidated Admin stats card */}
      <div className="bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl select-none font-sans">
        <h3 className="text-sm font-sans font-bold text-white flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>{t.title}</span>
        </h3>
        <p className="text-[10px] text-slate-400 leading-normal mb-4">{t.sub}</p>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-950/60 pt-3 text-center">
          <div>
            <span className="block text-[9px] text-slate-500">{t.totalDev}</span>
            <span className="block text-base font-mono font-extrabold text-white mt-0.5">{onlineCount} / {totalCount}</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-500">{t.onlineAvg}</span>
            <span className="block text-base font-mono font-extrabold text-sky-400 mt-0.5">{avgPpm} PPM</span>
          </div>
          <div>
            <span className="block text-[9px] text-slate-500">{isAr ? "إنذارات الخطر اليوم" : "Danger Alarms"}</span>
            <span className="block text-base font-mono font-extrabold text-rose-500 mt-0.5">
              {selectedDevice.sensorValue > 500 ? "1" : "0"}
            </span>
          </div>
        </div>
      </div>

      {/* Gemini AI Expert Diagnostics System */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 bg-gradient-to-r from-sky-500 to-indigo-500 text-[8px] font-mono uppercase tracking-widest px-2.5 py-1 text-white rounded-br-xl select-none">
          AI AGENT INTEGRATED
        </div>

        <div className="pt-2 mb-4">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 select-none">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>{isAr ? "تحليل جودة الهواء بالذكاء الاصطناعي (Gemini 3.5)" : "Gemini AI Diagnostics"}</span>
          </h4>
          <p className="text-[10px] text-slate-500 mt-1 leading-normal">
            {isAr ? "يحلل التقرير قراءات MQ135 الحالية لمستشعرك ويصيغ نصائح طبية وبيئية دقيقة." : "Generates real-time health audits from MQ135 readings."}
          </p>
        </div>

        {isGeneratingAi ? (
          <div className="p-6 bg-slate-950/60 border border-slate-900 rounded-xl text-center flex flex-col items-center justify-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mb-2" />
            <span>{t.aiGenerating}</span>
          </div>
        ) : aiReport ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl max-h-60 overflow-y-auto text-xs text-slate-300 leading-relaxed text-right font-sans border-sky-500/20 shadow-inner">
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mb-2 border-b border-slate-900 pb-1 flex-row-reverse">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{t.reportDone}</span>
              </div>
              <p className="whitespace-pre-line">{aiReport}</p>
            </div>
            <button
              onClick={() => setAiReport("")}
              className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 text-xxs text-slate-400 border border-slate-800 rounded-lg cursor-pointer"
            >
              {isAr ? "تحليل موقع آخر" : "Close Analysis"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateAiReport}
            className="w-full bg-gradient-to-r from-sky-500/80 to-indigo-500/80 hover:opacity-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.aiReportBtn}</span>
          </button>
        )}
      </div>

      {/* CSV PDF Reports Exports Section */}
      <div className="bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl select-none font-sans">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1 bg-slate-950/40 py-1.5 px-3 rounded-xl border border-slate-950">
          <FileText className="w-4 h-4 text-sky-400" />
          <span>{t.downloadsTitle}</span>
        </h4>

        {/* List of simulated report downloads */}
        <div className="divide-y divide-slate-950/60 mt-2">
          {[
            { id: "daily", name: t.dlDaily },
            { id: "weekly", name: t.dlWeekly },
            { id: "monthly", name: t.dlMonthly }
          ].map((rep) => (
            <div key={rep.id} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">{rep.name}</span>
              <div className="flex gap-1.5">
                <button
                  disabled={isDownloading !== ""}
                  onClick={() => handleSimulateReportDownload("excel", rep.id)}
                  className="py-1 px-2.5 bg-slate-950 hover:bg-slate-900 text-[10px] text-slate-400 hover:text-emerald-400 border border-slate-900 rounded-lg cursor-pointer flex items-center gap-1 font-sans font-medium"
                >
                  <Download className="w-3 h-3" />
                  <span>{isDownloading === `${rep.id}-excel` ? "Excel..." : "Excel"}</span>
                </button>

                <button
                  disabled={isDownloading !== ""}
                  onClick={() => handleSimulateReportDownload("pdf", rep.id)}
                  className="py-1 px-2.5 bg-slate-950 hover:bg-slate-900 text-[10px] text-slate-400 hover:text-rose-400 border border-slate-900 rounded-lg cursor-pointer flex items-center gap-1 font-sans font-medium"
                >
                  <Download className="w-3 h-3" />
                  <span>{isDownloading === `${rep.id}-pdf` ? "PDF..." : "PDF"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive live syslog module */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 select-none">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>{t.logsTitle}</span>
          </h4>

          {/* Logs sorting badge bar */}
          <div className="flex gap-1 select-none">
            {(["all", "info", "warning", "error"] as const).map((lvl) => {
              const active = logFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`text-[8px] px-1.5 py-0.5 rounded-md font-sans uppercase font-bold border transition-colors cursor-pointer ${
                    active 
                      ? "bg-slate-800 text-sky-400 border-sky-400/20" 
                      : "text-slate-500 border-transparent hover:text-slate-400"
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logs visual terminal */}
        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[9px] text-slate-300 space-y-1.5 shadow-inner">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-16 font-sans text-xxs">{t.noLogs}</div>
          ) : (
            filteredLogs.map((log) => {
              let classColor = "text-sky-300";
              let label = "INFO";
              if (log.level === "warning") {
                classColor = "text-amber-400";
                label = "WARN";
              } else if (log.level === "error") {
                classColor = "text-red-400";
                label = "ERR ";
              }

              return (
                <div key={log.id} className="flex gap-1 items-start leading-snug">
                  <span className="text-slate-600 shrink-0">[{log.timestamp.slice(11, 19)}]</span>
                  <span className={`${classColor} font-bold shrink-0`}>[{label}]</span>
                  <span className="text-slate-500 shrink-0">[{log.source}]:</span>
                  <span className="text-slate-300 ml-1 text-right line-clamp-2 font-sans">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
