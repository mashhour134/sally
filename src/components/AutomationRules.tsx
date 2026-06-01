import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, Plus, ShieldAlert, CheckCircle, Trash2, Sliders, ToggleLeft, 
  ToggleRight, Play, Server, Clock, Power, ShieldX, BellRing
} from "lucide-react";
import { AutomationRule } from "../types";
import { getApiUrl } from "../utils";

interface AutomationRulesProps {
  lang: "ar" | "en";
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "auto-relay-ventilation",
    name: "مروحة شفاط الصالة التلقائية",
    field: "sensorValue",
    operator: ">",
    value: 500,
    actionType: "trigger_relay",
    actionValue: "relay_on",
    active: true
  },
  {
    id: "auto-warning-sms",
    name: "إشعار طوارئ ودق صفارة الحريق",
    field: "sensorValue",
    operator: ">",
    value: 400,
    actionType: "emergency",
    actionValue: "siren_on",
    active: true
  }
];

export default function AutomationRules({ lang }: AutomationRulesProps) {
  const [rules, setRules] = useState<AutomationRule[]>(() => {
    const saved = localStorage.getItem("smart_savior_local_rules");
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerValue, setTriggerValue] = useState(400);
  const [actionType, setActionType] = useState<"alert_user" | "trigger_relay" | "emergency_shutdown">("alert_user");
  const [loading, setLoading] = useState(false);

  const isAr = lang === "ar";
  const t = {
    title: isAr ? "محرك الأتمتة والذكية" : "Automation Rules Engine",
    sub: isAr ? "قم ببناء قواعد وحركات تلقائية لتشغيل الشفاطات أو إرسال بلاغات SMS عند تخطي السموم عتبات معينة" : "Create automated rules, trigger physical relays, or alert users when thresholds breach.",
    addRule: isAr ? "إضافة قاعدة أتمتة" : "Create New Rule",
    activeRule: isAr ? "القاعدة نشطة" : "Active Automation",
    condition: isAr ? "الشرط المسبب للتفعيل" : "Activation Condition",
    targetAction: isAr ? "الإجراء التلقائي التابع" : "Target Relay Action",
    ifText: isAr ? "إذا تجاوز مستشعر الغاز عتبة القيمة" : "If MQ135 sensor PPM exceeds",
    thenText: isAr ? "حينها مباشرة قم بـ:" : "Then execute action:",
    cancel: isAr ? "إلغاء القاعدة" : "Cancel",
    save: isAr ? "تنصيب قاعدة الأتمتة" : "Install Automation",
    empty: isAr ? "لم تقم بتهيئة قواعد أتمتة حتى الآن." : "No automation guidelines active.",
    ruleName: isAr ? "اسم قاعدة الأتمتة" : "Automation Guideline Name",
    actionAlert: isAr ? "إطلاق جرس طوارئ وإشعار فوري للهاتف" : "Fire emergency alerts and SMS warnings",
    actionRelay: isAr ? "تنشيط ريلاي الشفاطات ومراوح التهوية بـ ESP32" : "Trigger mechanical exhaust relay via GPIO",
    actionShut: isAr ? "إيقاف خوادم المعالجة وعزل الغرفة" : "Initiate emergency site quarantine",
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/rules"));
      if (res.ok) {
        const data = await res.json();
        setRules(data);
        localStorage.setItem("smart_savior_local_rules", JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Backend rules unreachable, using offline rules dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (id: string) => {
    const toggled = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setRules(toggled);
    localStorage.setItem("smart_savior_local_rules", JSON.stringify(toggled));

    try {
      const res = await fetch(getApiUrl(`/api/rules/${id}/toggle`), { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        const synced = rules.map(r => r.id === id ? updated : r);
        setRules(synced);
        localStorage.setItem("smart_savior_local_rules", JSON.stringify(synced));
      }
    } catch (err) {
      console.warn("Offline note: Toggled automation rule local state.", err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    localStorage.setItem("smart_savior_local_rules", JSON.stringify(updated));

    try {
      const res = await fetch(getApiUrl(`/api/rules/${id}`), { method: "DELETE" });
    } catch (err) {
      console.warn("Offline note: Deleted automation rule locally.", err);
    }
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const tempId = `local-rule-${Date.now()}`;
    const newLocalRule: AutomationRule = {
      id: tempId,
      name,
      field: "sensorValue",
      operator: ">",
      value: triggerValue,
      actionType: actionType === "alert_user" ? "notify" : actionType === "trigger_relay" ? "trigger_relay" : "emergency",
      actionValue: actionType === "alert_user" ? "siren_on" : actionType === "trigger_relay" ? "relay_on" : "quarantine",
      active: true
    };

    const updated = [newLocalRule, ...rules];
    setRules(updated);
    localStorage.setItem("smart_savior_local_rules", JSON.stringify(updated));

    setName("");
    setTriggerValue(400);
    setActionType("alert_user");
    setShowForm(false);

    try {
      const res = await fetch(getApiUrl("/api/rules"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerValue,
          actionType
        })
      });
      if (res.ok) {
        const newRule = await res.json();
        const synced = updated.map(r => r.id === tempId ? newRule : r);
        setRules(synced);
        localStorage.setItem("smart_savior_local_rules", JSON.stringify(synced));
      }
    } catch (err) {
      console.warn("Offline note: Saved rule locally.", err);
    }
  };

  const getActionLabel = (type: string) => {
    if (type === "alert_user") return t.actionAlert;
    if (type === "trigger_relay") return t.actionRelay;
    return t.actionShut;
  };

  return (
    <div className="space-y-4">
      {/* Title Header area */}
      <div className="flex justify-between items-center bg-slate-900/40 p-3.5 border border-slate-800/80 rounded-2xl select-none font-sans">
        <div>
          <h3 className="text-sm font-sans font-bold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>{t.title}</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">{t.sub}</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-xl text-white font-sans font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addRule}</span>
        </button>
      </div>

      {/* Rules Builder Form accordion panel */}
      {showForm && (
        <form onSubmit={handleSubmitRule} className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl font-sans space-y-4 shadow-xl select-none">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">{t.ruleName}:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. تشغيل ريلاي مراوح شفاط الغاز الملقم"
              className="w-full text-slate-100 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">{t.ifText}:</span>
              <span className="font-mono text-amber-400 font-bold">{triggerValue} PPM</span>
            </div>
            <input
              type="range"
              min="100"
              max="900"
              value={triggerValue}
              onChange={(e) => setTriggerValue(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">{t.thenText}</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="alert_user">{t.actionAlert}</option>
              <option value="trigger_relay">{t.actionRelay}</option>
              <option value="emergency_shutdown">{t.actionShut}</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-grow py-2 px-3 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-grow py-2 px-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-95 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        {loading && rules.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">جاري جلب القواعد المنقحة...</div>
        ) : rules.length === 0 ? (
          <div className="bg-slate-900/10 border border-dashed border-slate-800/80 rounded-2xl p-6 text-center select-none font-sans">
            <Sliders className="w-8 h-8 mx-auto text-slate-700 mb-1.5" />
            <h4 className="text-slate-400 text-xs font-bold">{t.empty}</h4>
            <span className="text-[9px] text-slate-600 block mt-1">القواعد تمكن الاستجابة الآلية لـ ESP32 دون تدخل بشري</span>
          </div>
        ) : (
          rules.map((rule) => {
            const isRelay = rule.actionType === "trigger_relay";
            const isAlert = rule.actionType === "alert_user";

            return (
              <div 
                key={rule.id}
                className={`p-4 rounded-xl border bg-slate-900/40 border-slate-800/80 backdrop-blur-md flex items-start justify-between text-right font-sans ${
                  !rule.active ? "opacity-50" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-bold text-white">{rule.name}</span>
                    <span className={`text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full ${
                      rule.active ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" : "bg-slate-950 text-slate-500 border border-transparent"
                    }`}>
                      {rule.active ? t.activeRule : "موقوفة مؤقتاً"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal mb-2">
                    {t.ifText} <span className="font-mono text-amber-500 font-bold">{rule.triggerValue} PPM</span>, 
                    <span className="text-slate-300"> {getActionLabel(rule.actionType)}</span>
                  </p>

                  <div className="text-[9px] text-slate-600 font-mono">
                    RULE ID: {rule.id} • Triggered: {rule.lastTriggered ? rule.lastTriggered : "Never"}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 select-none">
                  {/* Toggle rules button with smooth flip animation */}
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={rule.active ? "active" : "inactive"}
                        initial={{ rotateY: -110, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 110, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        {rule.active ? (
                          <ToggleRight className="w-9 h-9 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-9 h-9 text-slate-600" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </button>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 bg-slate-950 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-850 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
