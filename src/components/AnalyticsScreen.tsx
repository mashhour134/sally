import React, { useState, useEffect } from "react";
import { 
  TrendingUp, BarChart2, Activity, Calendar, ArrowUpRight, 
  ArrowDownRight, CircleGauge, RefreshCw, AlertTriangle
} from "lucide-react";
import { Device, Reading } from "../types";
import { getApiUrl } from "../utils";

interface AnalyticsScreenProps {
  selectedDevice: Device;
  lang: "ar" | "en";
}

interface StatsSummary {
  highestValue: number;
  lowestValue: number;
  averageValue: number;
  dangerCount: number;
  warningCount: number;
}

// Generate beautiful offline/local telemetry signals when backend is unreachable
const generateMockReadings = (deviceId: string, range: "last_hour" | "last_24h" | "last_7d" | "last_30d"): Reading[] => {
  const points = range === "last_hour" ? 12 : range === "last_24h" ? 24 : range === "last_7d" ? 7 : 30;
  const baseValue = deviceId === "poultry-farm" ? 380 : deviceId === "warehouse" ? 80 : 130;
  const list: Reading[] = [];
  const now = Date.now();
  const timeStep = range === "last_hour" ? 5 * 60 * 1000 : range === "last_24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  
  for (let i = points - 1; i >= 0; i--) {
    // Generate organic waves with some random noise
    const wave = Math.sin((points - i) / (points / 4)) * (baseValue * 0.25);
    const offset = Math.floor(Math.random() * (baseValue * 0.2)) - (baseValue * 0.1);
    const finalVal = Math.max(10, Math.round(baseValue + wave + offset));
    
    list.push({
      id: `mock-${deviceId}-${range}-${i}`,
      deviceId,
      sensorValue: finalVal,
      aqi: finalVal, // approximate conversion
      airStatus: finalVal > 500 ? "danger" : finalVal > 200 ? "warning" : "safe",
      timestamp: new Date(now - i * timeStep).toISOString(),
      wifiStatus: "excellent",
      deviceStatus: "online"
    });
  }
  return list;
};

const generateMockStats = (deviceId: string, readings: Reading[]): StatsSummary => {
  const vals = readings.map(r => r.sensorValue);
  const highestValue = vals.length > 0 ? Math.max(...vals) : 150;
  const lowestValue = vals.length > 0 ? Math.min(...vals) : 50;
  const averageValue = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 100;
  const dangerCount = readings.filter(r => r.sensorValue > 500).length;
  const warningCount = readings.filter(r => r.sensorValue > 200 && r.sensorValue <= 500).length;
  
  return {
    highestValue,
    lowestValue,
    averageValue,
    dangerCount,
    warningCount
  };
};

export default function AnalyticsScreen({ selectedDevice, lang }: AnalyticsScreenProps) {
  const [range, setRange] = useState<"last_hour" | "last_24h" | "last_7d" | "last_30d">("last_24h");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [stats, setStats] = useState<StatsSummary>({
    highestValue: 145,
    lowestValue: 85,
    averageValue: 112,
    dangerCount: 0,
    warningCount: 1
  });
  const [loading, setLoading] = useState(false);

  const isAr = lang === "ar";
  const t = {
    analytics: isAr ? "التحليلات والمؤشرات" : "Stats & Analytics",
    sub: isAr ? "استعرض سجل التلوث التاريخي ومستويات الغاز لـ" : "Historical pollution logs for",
    hour: isAr ? "الساعة الأخيرة" : "Last Hour",
    day: isAr ? "24 ساعة" : "Last 24h",
    week: isAr ? "7 أيام" : "Last 7d",
    month: isAr ? "30 يوماً" : "Last 30d",
    line: isAr ? "رسم خطي" : "Line Chart",
    bar: isAr ? "رسم بياني" : "Bar Chart",
    highest: isAr ? "أعلى قراءة" : "Highest",
    lowest: isAr ? "أدنى قراءة" : "Lowest",
    average: isAr ? "المتوسط العام" : "Average",
    warningEvents: isAr ? "تجاوزات التحذير" : "Warning Spikes",
    dangerEvents: isAr ? "تجاوزات الخطر" : "Critical Alarms",
    events: isAr ? "حدثاً" : "events",
    blankStats: isAr ? "تجهيز الرسم البياني للنبضات..." : "Polling hardware timeline...",
  };

  const fetchStatsAndHistory = async () => {
    setLoading(true);
    try {
      let statsLoaded = false;
      let historyLoaded = false;
      
      // Fetch stats
      const statsRes = await fetch(getApiUrl(`/api/stats?deviceId=${selectedDevice.id}`));
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        statsLoaded = true;
      }

      // Fetch history for selected range
      const histRes = await fetch(getApiUrl(`/api/history?deviceId=${selectedDevice.id}&range=${range}`));
      if (histRes.ok) {
        const histData = await histRes.json();
        setReadings(histData);
        historyLoaded = true;
      }

      if (!statsLoaded || !historyLoaded) {
        const mockReadings = generateMockReadings(selectedDevice.id, range);
        setReadings(mockReadings);
        setStats(generateMockStats(selectedDevice.id, mockReadings));
      }
    } catch (err) {
      console.warn("Error reading chart metrics, falling back to mock readings:", err);
      const mockReadings = generateMockReadings(selectedDevice.id, range);
      setReadings(mockReadings);
      setStats(generateMockStats(selectedDevice.id, mockReadings));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndHistory();
  }, [selectedDevice.id, range]);

  // SVG Chart Dimensions & Computations
  const width = 500;
  const height = 180;
  const padding = 25;

  // Compute scale mappings
  const maxVal = Math.max(100, stats.highestValue, ...readings.map(r => r.sensorValue));
  const minVal = Math.min(0, stats.lowestValue);
  
  const getX = (index: number) => {
    if (readings.length <= 1) return padding;
    return padding + (index / (readings.length - 1)) * (width - padding * 2);
  };

  const getY = (value: number) => {
    const rangeVal = maxVal - minVal;
    if (rangeVal === 0) return height - padding;
    const norm = (value - minVal) / rangeVal;
    // clip and scale
    return height - padding - norm * (height - padding * 2);
  };

  // Generate SVG Line drawing instructions
  const linePath = readings.length > 0 ? readings.map((r, i) => {
    const x = getX(i);
    const y = getY(r.sensorValue);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ") : "";

  // Generate elegant gradient filling underneath line
  const fillPath = readings.length > 0 ? `${linePath} L ${getX(readings.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z` : "";

  return (
    <div className="space-y-4">
      {/* Selector Filters Header */}
      <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
        <h3 className="text-sm font-sans font-bold text-white mb-2">{t.analytics}</h3>
        <p className="text-[10px] text-slate-400 font-sans mb-3">
          {t.sub} <span className="text-emerald-400 font-bold">"{selectedDevice.name}"</span>
        </p>

        {/* Range Selector Toggles */}
        <div className="flex gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-900 overflow-x-auto select-none">
          {(["last_hour", "last_24h", "last_7d", "last_30d"] as const).map((r) => {
            const labelMap = { last_hour: t.hour, last_24h: t.day, last_7d: t.week, last_30d: t.month };
            const isActive = range === r;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-sans font-medium hover:text-white transition-all shrink-0 cursor-pointer ${
                  isActive ? "bg-slate-800 text-white font-bold" : "text-slate-500"
                }`}
              >
                {labelMap[r]}
              </button>
            );
          })}
        </div>

        {/* Chart View style togglers */}
        <div className="flex gap-1.5 mt-3 select-none">
          <button
            onClick={() => setChartType("line")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-sans font-medium flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              chartType === "line"
                ? "bg-sky-950/30 border-sky-500/20 text-sky-400"
                : "border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t.line}</span>
          </button>

          <button
            onClick={() => setChartType("bar")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-sans font-medium flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              chartType === "bar"
                ? "bg-sky-950/30 border-sky-500/20 text-sky-400"
                : "border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{t.bar}</span>
          </button>
        </div>
      </div>

      {/* Main Charts Plotting Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
        {loading ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-sky-400" />
            <span>{isAr ? "تحميل البيانات وتحليل العينات المأخوذة..." : "Querying database..."}</span>
          </div>
        ) : readings.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <Activity className="w-7 h-7 text-slate-700 animate-pulse mb-1.5" />
            <span>{t.blankStats}</span>
          </div>
        ) : (
          <div className="relative">
            {/* Custom SVG responsive graph rendering */}
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Horizontal Guide Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const stepY = padding + ratio * (height - padding * 2);
                const stepVal = Math.round(maxVal - ratio * (maxVal - minVal));
                return (
                  <g key={index} className="opacity-20 font-mono text-[9px]">
                    <line
                      x1={padding}
                      y1={stepY}
                      x2={width - padding}
                      y2={stepY}
                      className="stroke-slate-700 stroke-dasharray-[2,2]"
                      strokeWidth="1"
                    />
                    <text
                      x={isAr ? width - 5 : 5}
                      y={stepY + 3}
                      className="fill-slate-400 text-right font-sans"
                      textAnchor={isAr ? "end" : "start"}
                    >
                      {stepVal}
                    </text>
                  </g>
                );
              })}

              {/* Graphical Plot Lines/Bars */}
              {chartType === "line" ? (
                <>
                  {/* Glowing Underfill Gradient */}
                  <path d={fillPath} fill="url(#chartGradient)" />
                  {/* Main Bezier Line */}
                  <path
                    d={linePath}
                    fill="none"
                    className="stroke-sky-500"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Coords dots marker */}
                  {readings.map((r, index) => {
                    if (readings.length > 25 && index % 2 !== 0) return null; // reduce clutter
                    const x = getX(index);
                    const y = getY(r.sensorValue);
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="3.5"
                        className="fill-slate-950 stroke-sky-400"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </>
              ) : (
                /* Bar Column charts rendering */
                readings.map((r, index) => {
                  const x = getX(index);
                  const y = getY(r.sensorValue);
                  const colHeight = height - padding - y;
                  const colWidth = Math.max(3, (width - padding * 2) / readings.length * 0.75);
                  let colColor = "fill-emerald-500/80";
                  if (r.sensorValue > 500) colColor = "fill-red-500/80";
                  else if (r.sensorValue > 200) colColor = "fill-amber-500/80";

                  return (
                    <rect
                      key={index}
                      x={x - colWidth / 2}
                      y={y}
                      width={colWidth}
                      height={colHeight}
                      className={`${colColor} rx-[2px]`}
                    />
                  );
                })
              )}
            </svg>
            <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono mt-1 px-4">
              <span>{isAr ? "البداية التاريخية" : "Start Range"}</span>
              <span>{isAr ? "الآن" : "Present"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Statistical Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-sans flex items-center justify-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-red-500" />
            <span>{t.highest}</span>
          </span>
          <span className="text-base font-mono font-bold text-white mt-0.5">{stats.highestValue}</span>
          <span className="text-[8px] text-slate-600 font-mono">PPM</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-sans flex items-center justify-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-emerald-500" />
            <span>{t.lowest}</span>
          </span>
          <span className="text-base font-mono font-bold text-white mt-0.5">{stats.lowestValue}</span>
          <span className="text-[8px] text-slate-600 font-mono">PPM</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-sans flex items-center justify-center gap-1">
            <CircleGauge className="w-3 h-3 text-sky-400" />
            <span>{t.average}</span>
          </span>
          <span className="text-base font-mono font-bold text-sky-400 mt-0.5">{stats.averageValue}</span>
          <span className="text-[8px] text-slate-600 font-mono">PPM</span>
        </div>
      </div>

      {/* Event indices analysis alert indicators */}
      <div className="bg-slate-900/20 rounded-xl p-3 border border-slate-900/55 space-y-2.5 select-none font-sans">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-900/50 text-slate-400 font-medium">
          <span>{isAr ? "تحليل الأحداث المسجلة" : "Events Register Analysis:"}</span>
          <span className="text-[10px] font-mono text-slate-500">{range.replace("_", " ").toUpperCase()}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{t.warningEvents}</span>
          </div>
          <span className="font-mono text-amber-500 font-bold">{stats.warningCount} {t.events}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{t.dangerEvents}</span>
          </div>
          <span className="font-mono text-red-500 font-bold">{stats.dangerCount} {t.events}</span>
        </div>
      </div>
    </div>
  );
}
