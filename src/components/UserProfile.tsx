import React, { useState } from "react";
import { 
  User, Mail, Shield, Award, Activity, LogOut, 
  Key, Save, Smartphone, MapPin, BadgeCheck
} from "lucide-react";

interface UserProfileProps {
  user: { name: string; email: string; avatarUrl: string };
  onLogout: () => void;
  lang: "ar" | "en";
}

export default function UserProfile({ user, onLogout, lang }: UserProfileProps) {
  const [nameInput, setNameInput] = useState(user.name);
  const [phoneNumber, setPhoneNumber] = useState("+966 50 123 4567");
  const [userLocation, setUserLocation] = useState("الرياض، المملكة العربية السعودية");
  const [selectedRole, setSelectedRole] = useState("مدير الشبكة والاتصال");
  const [isSaved, setIsSaved] = useState(false);

  const isAr = lang === "ar";
  const t = {
    profile: isAr ? "الملف الشخصي والحساب الإشرافي" : "Supervisory User Profile",
    sub: isAr ? "استعرض بيانات الاعتماد وصلاحية الإشراف والمواقع المصرح بها" : "Review security privileges and authorized physical sites.",
    nameLabel: isAr ? "اسم المستخدم الثنائي" : "Account Holder Name",
    email: isAr ? "البريد الإلكتروني الموثق" : "Verified Email Address",
    phone: isAr ? "رقم الهاتف للإشعارات الفورية SMS" : "SMS Emergency Phone",
    role: isAr ? "رتبة الصلاحية الأمنية" : "System Authority Role",
    location: isAr ? "المنطقة والموقع المحدد للتثبيت" : "Registered Region",
    saveProfile: isAr ? "حفظ التعديلات" : "Save Changes",
    logout: isAr ? "تسجيل الخروج الآمن" : "Secure Sign Out",
    privileges: isAr ? "صلاحيات الوصول النشطة لـ ESP32" : "Active Node Access Privileges",
    readPriv: isAr ? "قراءة التغذية الممتدة" : "Read-write raw parameters",
    writePriv: isAr ? "تصفير وإعادة تعيين اللوحات" : "Write remote node system flashes",
    backupPriv: isAr ? "تجاوز واختراق صفارة الطوارئ" : "Override emergency alarm sirens",
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Upper header summary */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center select-none font-sans relative overflow-hidden">
        <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold flex items-center gap-1">
          <BadgeCheck className="w-3.5 h-3.5" />
          <span>{isAr ? "موثق" : "Verified Owner"}</span>
        </div>

        {/* User visual Avatar */}
        <div className="relative inline-block mb-3.5 mt-2">
          <img
            src={user.avatarUrl}
            alt="Profile Avatar"
            referrerPolicy="no-referrer"
            className="w-18 h-18 rounded-full object-cover border-2 border-emerald-500/50 shadow-lg shadow-emerald-900/30"
          />
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
        </div>

        <h3 className="text-sm font-sans font-extrabold text-white">{nameInput}</h3>
        <p className="text-[10px] text-slate-500 font-mono mt-1">{user.email}</p>
        <span className="inline-block mt-2.5 px-3 py-1 bg-slate-950 text-indigo-400 border border-slate-800 rounded-full text-[10px] font-sans font-bold">
          {selectedRole}
        </span>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-sans">
          {isAr ? "تم تحديث تفاصيل الملف الشخصي الفوري!" : "User profile details updated!"}
        </div>
      )}

      {/* Profile Form Details */}
      <form onSubmit={handleUpdateProfile} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-sans space-y-3.5">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5">{t.nameLabel}</label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full text-slate-100 bg-slate-950 border border-slate-800/80 rounded-xl py-2.5 pr-10 pl-4 text-xs font-sans focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5">{t.email}</label>
          <div className="relative opacity-60">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full text-slate-400 bg-slate-950 border border-slate-900 rounded-xl py-2.5 pr-10 pl-4 text-xs font-mono cursor-not-allowed focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5">{t.phone}</label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
              <Smartphone className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full text-slate-100 bg-slate-950 border border-slate-800/80 rounded-xl py-2.5 pr-10 pl-4 text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5">{t.location}</label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
              <MapPin className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={userLocation}
              onChange={(e) => setUserLocation(e.target.value)}
              className="w-full text-slate-100 bg-slate-950 border border-slate-800/80 rounded-xl py-2.5 pr-10 pl-4 text-xs font-sans focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-sky-400 font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          {t.saveProfile}
        </button>
      </form>

      {/* Security Privileges details */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-sans select-none text-right">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-3.5">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>{t.privileges}</span>
        </h4>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t.readPriv}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t.writePriv}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t.backupPriv}</span>
          </div>
        </div>
      </div>

      {/* Standard Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3 px-4 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 font-sans font-bold rounded-xl text-xs border border-rose-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
      >
        <LogOut className="w-4 h-4" />
        <span>{t.logout}</span>
      </button>
    </div>
  );
}
