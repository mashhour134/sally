import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Shield, Wind, Cpu } from "lucide-react";

interface SplashScreenProps {
  onLoadingComplete: () => void;
}

export default function SplashScreen({ onLoadingComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("جاري تشغيل النظام وتأمين الاتصال...");

  useEffect(() => {
    // Progress bar loader simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 45);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 25) {
      setStatusText("جاري تشغيل النظام وتأمين الاتصال...");
    } else if (progress < 50) {
      setStatusText("جاري الكشف عن منافذ أجهزة ESP32...");
    } else if (progress < 75) {
      setStatusText("يتم فحص مستشعرات MQ135 ومعايرة العتبات...");
    } else if (progress < 95) {
      setStatusText("تحميل واجهة التنبيهات ونظام الحماية...");
    } else {
      setStatusText("النظام جاهز تماماً للتشغيل والربط");
      const timeout = setTimeout(() => {
        onLoadingComplete();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onLoadingComplete]);

  return (
    <div id="splash-container" className="fixed inset-0 flex flex-col items-center justify-between bg-slate-950 text-white p-6 select-none z-50">
      {/* Upper dynamic glowing mesh */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-sky-500/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-150px] right-12 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Animated App Icon Branding */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative inline-flex items-center justify-center p-6 bg-gradient-to-tr from-sky-600 to-emerald-500 rounded-3xl shadow-xl shadow-sky-950/40 mb-6"
        >
          <Wind className="w-14 h-14 text-white animate-pulse" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-sky-200/35 rounded-3xl"
          />
          <Shield className="w-6 h-6 text-emerald-200 absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-emerald-500" />
        </motion.div>

        {/* Title and Tagline */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl font-sans font-bold tracking-tight bg-gradient-to-r from-sky-400 via-sky-100 to-emerald-400 bg-clip-text text-transparent"
        >
          المنقذ الذكي | Smart Savior
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 0.85 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-sm text-slate-300 font-sans tracking-wide mt-3"
        >
          النظام الذكي لمراقبة جودة الهواء وإنترنت الأشياء (IoT)
        </motion.p>
      </div>

      {/* Progress Indicators & Core Hardware status */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4 mb-2">
        <div className="w-full bg-slate-800/60 backdrop-blur-md rounded-full h-1.5 overflow-hidden border border-slate-700/50 p-[2px]">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut" }}
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
          />
        </div>

        <div className="flex items-center justify-between w-full text-slate-400 text-xs px-1">
          <span className="font-mono text-emerald-400">{progress}%</span>
          <span className="text-right font-sans font-medium line-clamp-1">{statusText}</span>
        </div>

        {/* Bottom Hardware spec tags representing genuine embedded architecture */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800/80 w-full justify-center">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <Cpu className="w-3.5 h-3.5 text-sky-500" />
            <span>ESP32 v3</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <Wind className="w-3.5 h-3.5 text-emerald-500" />
            <span>MQ-135 SENSOR</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>WPA2 TLS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
