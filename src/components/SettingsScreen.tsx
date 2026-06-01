import React, { useState } from "react";
import { 
  Settings, Moon, Sun, Monitor, Bell, Volume2, 
  Vibrate, Shield, Sliders, RefreshCw, FolderLock, Globe, Heart, PhoneCall
} from "lucide-react";

interface SettingsScreenProps {
  lang: "ar" | "en";
  onChangeLang: (lang: "ar" | "en") => void;
  theme: "light" | "dark" | "pink";
  onChangeTheme: (theme: "light" | "dark" | "pink") => void;
  thresholds: { safe: number; warning: number; danger: number };
  onUpdateThresholds: (thresholds: { safe: number; warning: number; danger: number }) => void;
  emergencyPhone: string;
  onUpdateEmergencyPhone: (phone: string) => void;
}

export default function SettingsScreen({
  lang,
  onChangeLang,
  theme,
  onChangeTheme,
  thresholds,
  onUpdateThresholds,
  emergencyPhone,
  onUpdateEmergencyPhone
}: SettingsScreenProps) {
  const [notify, setNotify] = useState(true);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);
  const [refreshRate, setRefreshRate] = useState(3);
  
  const [safeVal, setSafeVal] = useState(thresholds.safe);
  const [warnVal, setWarnVal] = useState(thresholds.warning);
  const [dangerVal, setDangerVal] = useState(thresholds.danger);
  const [isSuccessSave, setIsSuccessSave] = useState(false);
  
  const [phoneNumber, setPhoneNumber] = useState(emergencyPhone);
  const [isSuccessPhoneSave, setIsSuccessPhoneSave] = useState(false);

  const isAr = lang === "ar";
  const t = {
    title: isAr ? "إعدادات المنصة" : "System Settings",
    sub: isAr ? "خصص مظهر اللوحة ونظام الإنذارات وعتبات استشعار الغاز الذكية" : "Customize interface themes, parameters, and push alerts.",
    appearance: isAr ? "تخصيص المظهر" : "Visual Appearance",
    tgLight: isAr ? "فاتح" : "Light",
    tgDark: isAr ? "داكن" : "Dark",
    tgPink: isAr ? "زهري 🌸" : "Pink 🌸",
    language: isAr ? "لغة الواجهة" : "System Language",
    ar: isAr ? "العربية" : "Arabic",
    en: isAr ? "الإنجليزية" : "English",
    notifications: isAr ? "إشعارات الهاتف الفورية" : "Push Notifications",
    enableNotify: isAr ? "تمكين الإشعارات الفورية" : "Enable Push Notifications",
    enableSound: isAr ? "تمكين صفارات التنبيه" : "System Alerts Sound",
    enableVib: isAr ? "تمكين الاهتزاز عند الخطر" : "Tactile Vibration",
    thresholdsTitle: isAr ? "معايرة عتبات مستشعر الغاز (MQ-135)" : "MQ135 PPM Safety Scales",
    thresholdsSub: isAr ? "قم بتعديل حدود التلوث لإضفاء الضوء الأخضر أو إنذار الطوارئ الأحمر" : "Calibrate PPM levels for safe, warning, and dangerous alerts.",
    tSafe: isAr ? "الحد الأقصى للنطاق الآمن" : "Safe Threshold Ceiling",
    tWarn: isAr ? "الحد الأقصى لنطاق التحذير" : "Warning Threshold Ceiling",
    tDanger: isAr ? "بداية مستوى الخطر والإنذار" : "Emergency Danger Trigger",
    ppm: isAr ? "جزء في المليون" : "PPM",
    saveThresholds: isAr ? "حفظ التعديلات وعتبات المعايرة" : "Apply Scales Calibration",
    saveSuccess: isAr ? "تم حفظ عتبات مستشعر المراقبة بدقة!" : "Speciation boundaries recalculated!",
    dataTitle: isAr ? "معدلات البيانات والمزامنة" : "Telemetry Refresh Options",
    refreshLabel: isAr ? "معدل تحديث البيانات اللحظي" : "Data Polling Cycle Rate",
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateThresholds({
      safe: Number(safeVal),
      warning: Number(warnVal),
      danger: Number(dangerVal)
    });
    setIsSuccessSave(true);
    setTimeout(() => setIsSuccessSave(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl select-none font-sans">
        <h3 className="text-sm font-sans font-bold text-white flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-sky-400" />
          <span>{t.title}</span>
        </h3>
        <p className="text-[10px] text-slate-400 mt-1">{t.sub}</p>
      </div>

      {isSuccessSave && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-sans">
          <span>{t.saveSuccess}</span>
        </div>
      )}

      {/* 1. Theme and Language selector */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-right font-sans">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3 select-none">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span>{t.appearance}</span>
        </h4>

        {/* Theme select bar */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 border border-slate-900 rounded-xl mb-4 select-none">
          {[
            { id: "light" as const, label: t.tgLight, icon: <Sun className="w-3.5 h-3.5" /> },
            { id: "dark" as const, label: t.tgDark, icon: <Moon className="w-3.5 h-3.5" /> },
            { id: "pink" as const, label: t.tgPink, icon: <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> }
          ].map((item) => {
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTheme(item.id)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-sans font-medium flex items-center justify-center gap-1.5 transition-all text-slate-400 cursor-pointer hover:text-white ${
                  active ? "bg-slate-800 text-white font-bold" : ""
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Language select toggler */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400 font-sans">{t.language}:</span>
          <div className="flex bg-slate-950/60 border border-slate-900 rounded-xl p-1 select-none">
            <button
              onClick={() => onChangeLang("ar")}
              className={`py-1 px-3.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                lang === "ar" ? "bg-slate-800 text-emerald-400" : "text-slate-500"
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => onChangeLang("en")}
              className={`py-1 px-3.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                lang === "en" ? "bg-slate-800 text-sky-400" : "text-slate-500"
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* 2. Calibration Boundaries Thresholds Customizer */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-sans">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1.5 select-none text-right">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>{t.thresholdsTitle}</span>
        </h4>
        <p className="text-[10px] text-slate-500 leading-relaxed mb-4 text-right">
          {t.thresholdsSub}
        </p>

        <form onSubmit={handleSaveThresholds} className="space-y-4">
          {/* Safe boundary slider (ceiling) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">{t.tSafe}</span>
              <span className="font-mono text-emerald-400 font-bold">{safeVal} {t.ppm}</span>
            </div>
            <input
              type="range"
              min="50"
              max="250"
              value={safeVal}
              onChange={(e) => setSafeVal(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Warning boundary slider (ceiling) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">{t.tWarn}</span>
              <span className="font-mono text-amber-500 font-bold">{warnVal} {t.ppm}</span>
            </div>
            <input
              type="range"
              min="201"
              max="600"
              value={warnVal}
              onChange={(e) => setWarnVal(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-950 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Danger boundary slider (floor) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">{t.tDanger}</span>
              <span className="font-mono text-red-500 font-bold">{dangerVal} {t.ppm}</span>
            </div>
            <input
              type="range"
              min="501"
              max="999"
              value={dangerVal}
              onChange={(e) => setDangerVal(Number(e.target.value))}
              className="w-full accent-red-500 bg-slate-950 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-sky-400 hover:text-sky-300 font-bold rounded-xl text-xs border border-slate-800 transition-colors shadow-inner cursor-pointer"
          >
            {t.saveThresholds}
          </button>
        </form>
      </div>

      {/* 3. Toggle Push alerts sound vibration */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-sans select-none text-right">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
          <Bell className="w-4 h-4 text-sky-400" />
          <span>{t.notifications}</span>
        </h4>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{t.enableNotify}</span>
            <input
              type="checkbox"
              checked={notify}
              onChange={() => setNotify(!notify)}
              className="rounded border-slate-900 bg-slate-950 text-sky-500 w-4 h-4 cursor-pointer accent-sky-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{t.enableSound}</span>
            <input
              type="checkbox"
              checked={sound}
              onChange={() => setSound(!sound)}
              className="rounded border-slate-900 bg-slate-950 text-sky-500 w-4 h-4 cursor-pointer accent-sky-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{t.enableVib}</span>
            <input
              type="checkbox"
              checked={vibration}
              onChange={() => setVibration(!vibration)}
              className="rounded border-slate-900 bg-slate-950 text-sky-500 w-4 h-4 cursor-pointer accent-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Telemetry Refresh sync options */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-sans select-none text-right">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
          <RefreshCw className="w-4 h-4 text-indigo-400" />
          <span>{t.dataTitle}</span>
        </h4>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{t.refreshLabel}</span>
            <span className="font-mono text-emerald-400 font-bold">{refreshRate} {t.ppm === "جزء في المليون" ? "ثوانٍ" : "Seconds"}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{isAr ? "مزامنة سحابية تلقائية" : "Auto Cloud Sync"}</span>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={() => setAutoSync(!autoSync)}
              className="rounded border-slate-900 bg-slate-950 text-emerald-500 w-4 h-4 cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-sans flex items-center gap-1">
              <FolderLock className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAr ? "خادم حماية سحابي (Cloud Backup)" : "Encrypted Cloud Backups"}</span>
            </span>
            <input
              type="checkbox"
              checked={cloudBackup}
              onChange={() => setCloudBackup(!cloudBackup)}
              className="rounded border-slate-900 bg-slate-950 text-sky-500 w-4 h-4 cursor-pointer accent-sky-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Emergency Phone Number Configuration */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-sans text-right">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-1.5 select-none">
          <PhoneCall className="w-4 h-4 text-red-400 animate-pulse" />
          <span>{isAr ? "إعداد هاتف الطوارئ والاستجابة السريعة" : "Emergency Call Configuration"}</span>
        </h4>
        <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
          {isAr 
            ? "حدد الرقم الذي ترغب في الاتصال به فوراً بضغطة واحدة من شاشة إنذار تسريب الغاز بالمنزل" 
            : "Define the specific contact number to dial immediately when our indoor gas leak warning activates."}
        </p>

        {isSuccessPhoneSave && (
          <div className="p-2 mb-3 bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] rounded-xl flex items-center justify-center gap-2">
            <span>{isAr ? "✅ تم تحديث رقم الطوارئ بنجاح!" : "✅ Emergency phone updated successfully!"}</span>
          </div>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          onUpdateEmergencyPhone(phoneNumber);
          setIsSuccessPhoneSave(true);
          setTimeout(() => setIsSuccessPhoneSave(false), 3000);
        }} className="space-y-3">
          <div className="flex flex-col gap-1 text-right">
            <label className="text-[10px] text-slate-400">
              {isAr ? "رقم الطوارئ المستهدف (مثل: 997 الدفاع المدني، أو رقم شخصي)" : "Target emergency digits (e.g. 997 Civil Defense, or personal contact)"}
            </label>
            <input
              type="text"
              dir="ltr"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full text-center tracking-widest font-mono font-bold bg-slate-950/80 border border-slate-800 focus:border-red-500 text-red-400 py-2 px-3.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all shadow-inner"
              placeholder="997"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-red-950/40 border border-red-500/30 hover:border-red-500/60 text-red-300 hover:text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer select-none"
          >
            {isAr ? "💾 حفظ رقم الاتصال للطوارئ" : "💾 Save Emergency Number"}
          </button>
        </form>
      </div>
    </div>
  );
}
