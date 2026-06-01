import React, { useState } from "react";
import { motion } from "motion/react";
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, Globe, Sparkles } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: { name: string; email: string; avatarUrl: string }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Localization States (RTL/LTR switching directly inside the view)
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const t = {
    ar: {
      welcome: "أهلاً بك في نظام المنقذ الذكي",
      sub: "سجّل الدخول لمتابعة ومراقبة جودة الهواء حول منزلك وعنابرك بأمان.",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      remember: "تذكرني على هذا الجهاز",
      login: "تسجيل الدخول الآمن",
      google: "تسجيل الدخول عبر Google",
      forgot: "هل نسيت كلمة المرور؟",
      errorEmpty: "برجاء استكمال كافة تفاصيل تسجيل الدخول الإلكتروني.",
      errorLength: "يجب ألا تقل كلمة المرور الخاصة بك عن 6 مدخلات.",
      resetTitle: "استعادة كلمة المرور",
      resetSub: "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.",
      sendReset: "إرسال رابط الاستعادة",
      backToLogin: "الرجوع لتسجيل الدخول",
      resetSuccess: "تم إرسال رابط استعادة تعيين كلمة المرور لهاتفك وبريدك بنجاح!",
      guestLogin: "الدخول كمسؤول شبكة (دخول سريع)"
    },
    en: {
      welcome: "Welcome to Smart Savior",
      sub: "Sign in to securely monitor and manage your local air quality and ESP32 nodes.",
      email: "Email Address",
      password: "Password",
      remember: "Remember me on this tool",
      login: "Secure Login",
      google: "Sign in with Google",
      forgot: "Forgot your password?",
      errorEmpty: "Please enter your email and password.",
      errorLength: "Password must be at least 6 characters.",
      resetTitle: "Recover Password",
      resetSub: "Enter your email address and we'll send a password recovery link.",
      sendReset: "Send Recovery Link",
      backToLogin: "Back to login screen",
      resetSuccess: "A password recovery link has been sent to your email successfully!",
      guestLogin: "Sign in as Network Administrator"
    }
  }[lang];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(t.errorEmpty);
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t.errorLength);
      return;
    }

    setErrorMessage("");
    // Return mock successful auth
    onLoginSuccess({
      name: email.split("@")[0] || "مسؤول النظام",
      email: email,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=260&auto=format&fit=crop"
    });
  };

  const handleGuestLogin = () => {
    onLoginSuccess({
      name: "مهندس مشهور صبحي",
      email: "mashhour.sobhi5@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=260&auto=format&fit=crop"
    });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setResetSuccessMessage(t.resetSuccess);
    setTimeout(() => {
      setIsForgotPassword(false);
      setResetSuccessMessage("");
      setForgotEmail("");
    }, 4000);
  };

  return (
    <div id="login-container" dir={lang === "ar" ? "rtl" : "ltr"} className="w-full h-full flex flex-col justify-between bg-slate-950 text-slate-100 p-6 relative overflow-hidden select-none">
      {/* Visual background layers */}
      <div className="absolute top-[-20%] left-[-10%] w-[350px] h-[350px] bg-slate-900 border border-slate-800/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-20%] w-[350px] h-[350px] bg-sky-950/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Header section with Language toggler */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <span className="text-sm font-sans font-bold text-sky-300">Smart Savior IO</span>
        </div>
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-300 rounded-full border border-slate-800 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === "ar" ? "English" : "العربية"}</span>
        </button>
      </header>

      {/* Main Authenticator Body */}
      <main className="flex-1 flex flex-col justify-center my-6 z-10">
        {!isForgotPassword ? (
          <div>
            {/* Greetings titles */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-sans tracking-tight text-white">{t.welcome}</h2>
              <p className="text-xs text-slate-400 mt-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-900 leading-normal">
                {t.sub}
              </p>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-950/50 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="leading-snug">{errorMessage}</span>
              </motion.div>
            )}

            {/* Login fields */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-sans text-slate-400 mb-1.5 font-medium">{t.email}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pl-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full text-slate-100 bg-slate-900/60 border border-slate-800 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 rounded-xl py-3 pr-10 pl-4 text-xs font-mono placeholder:text-slate-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans text-slate-400 mb-1.5 font-medium">{t.password}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pl-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-slate-100 bg-slate-900/60 border border-slate-800 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 rounded-xl py-3 pr-10 pl-11 text-xs placeholder:text-slate-600 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 px-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & forgot password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-400 font-sans cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="rounded border-slate-800 bg-slate-900 text-sky-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-sky-500"
                  />
                  <span>{t.remember}</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sky-400 hover:text-sky-300 transition-colors font-sans font-medium"
                >
                  {t.forgot}
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-sans font-semibold py-3 px-4 rounded-xl text-xs hover:opacity-95 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/30 font-medium cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.login}</span>
              </button>
            </form>

            <div className="relative flex py-4 items-center justify-center">
              <div className="flex-grow border-t border-slate-900"></div>
              <span className="flex-shrink mx-4 text-[10px] uppercase font-mono tracking-widest text-slate-600">أو</span>
              <div className="flex-grow border-t border-slate-900"></div>
            </div>

            {/* Simulated OAuth Providers */}
            <div className="space-y-2.5">
              <button
                onClick={handleGuestLogin}
                className="w-full bg-slate-900/90 border border-slate-800 text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 font-sans font-medium py-3 px-4 rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>{t.guestLogin}</span>
              </button>

              <button
                onClick={handleGuestLogin}
                className="w-full bg-slate-900/50 border border-slate-800 text-white hover:bg-slate-800/80 font-sans font-medium py-3 px-4 rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {/* Simulated Google Logo using SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.564-1.88 4.604-6.887 4.604-4.33 0-7.865-3.578-7.865-8s3.535-8 7.865-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.23C18.29 1.102 15.42 0 12.24 0 5.58 0 0 5.373 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.79-.08-1.4-.18-1.925H12.24z"/>
                </svg>
                <span>{t.google}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Forgot Password Interface */
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-sans text-white">{t.resetTitle}</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.resetSub}</p>
            </div>

            {resetSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="leading-snug">{resetSuccessMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-sans text-slate-400 mb-1.5 font-medium">{t.email}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pl-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full text-slate-100 bg-slate-900/60 border border-slate-800 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 rounded-xl py-3 pr-10 pl-4 text-xs font-mono focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-sans font-semibold py-3 px-4 rounded-xl text-xs hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-medium cursor-pointer"
              >
                <span>{t.sendReset}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-slate-400 hover:text-slate-300 text-center text-xs py-2 pointer-cursor font-sans"
              >
                {t.backToLogin}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer system details */}
      <footer className="text-center text-[10px] text-slate-600 font-mono select-none">
        AIR GUARD PLATFORM v3.2.1 • SECURE END-TO-END TLS
      </footer>
    </div>
  );
}
