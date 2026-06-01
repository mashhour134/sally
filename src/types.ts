export type AirStatus = "safe" | "warning" | "danger";

export type AqiCategory = 
  | "excellent" 
  | "good" 
  | "moderate" 
  | "unhealthy" 
  | "very_unhealthy" 
  | "hazardous";

export interface Device {
  id: string;
  name: string;
  location: string;
  roomName: string;
  status: "online" | "offline";
  lastSeen: string; // ISO string
  sensorValue: number; // Raw 0-1023
  aqi: number; // Calculated 0-500
  wifiSignal: "excellent" | "good" | "weak" | "none";
  wifiRssi: number; // dBm
  batteryLevel?: number; // 0-100
  uptime: number; // Seconds
  firmwareVersion: string;
  macAddress: string;
  sensorHealth: "healthy" | "warning" | "critical";
  dataTransmission: "active" | "delayed" | "stopped";
}

export interface Reading {
  id: string;
  deviceId: string;
  sensorValue: number;
  aqi: number;
  airStatus: AirStatus;
  timestamp: string;
  wifiStatus: string;
  deviceStatus: string;
}

export interface SystemAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  type: "air_quality" | "device_offline" | "sensor_fault";
  severity: "info" | "warning" | "danger";
  value: number;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  field: "aqi" | "sensorValue" | "status";
  operator: ">" | "<" | "==";
  value: string | number;
  actionType: "notify" | "emergency" | "trigger_relay";
  actionValue: string;
  active: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  source: "ESP32" | "System" | "Admin";
}

// Map sensor values (0 - 1023) to AQI (0 - 500)
export function calculateAqi(sensorVal: number): number {
  // MQ135 baseline is around 100-150 in clean air, and can spike to over 800 in dense smoke
  // Standard linear lookup / interpolation
  if (sensorVal <= 150) {
    // 0 - 50 AQI (Excellent)
    return Math.round((sensorVal / 150) * 50);
  } else if (sensorVal <= 250) {
    // 51 - 100 AQI (Good)
    return Math.round(50 + ((sensorVal - 150) / 100) * 50);
  } else if (sensorVal <= 400) {
    // 101 - 150 AQI (Moderate)
    return Math.round(100 + ((sensorVal - 250) / 150) * 50);
  } else if (sensorVal <= 650) {
    // 151 - 200 AQI (Unhealthy)
    return Math.round(150 + ((valueClip(sensorVal) - 400) / 250) * 50);
  } else if (sensorVal <= 850) {
    // 201 - 300 AQI (Very Unhealthy)
    return Math.round(200 + ((valueClip(sensorVal) - 650) / 200) * 100);
  } else {
    // 301 - 500 AQI (Hazardous)
    return Math.round(300 + ((valueClip(sensorVal) - 850) / 173) * 200);
  }
}

function valueClip(val: number): number {
  return Math.min(Math.max(val, 0), 1023);
}

export function getAqiCategory(aqi: number): {
  id: AqiCategory;
  nameAr: string;
  nameEn: string;
  color: string;
  bgGlow: string;
  recommendationAr: string;
  recommendationEn: string;
} {
  if (aqi <= 50) {
    return {
      id: "excellent",
      nameAr: "ممتاز",
      nameEn: "Excellent",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      bgGlow: "shadow-emerald-500/10",
      recommendationAr: "جودة الهواء ممتازة، ومثالية وآمنة تماماً داخل المنزل.",
      recommendationEn: "Air quality is excellent. Extremely safe indoors."
    };
  } else if (aqi <= 100) {
    return {
      id: "good",
      nameAr: "مقبول",
      nameEn: "Good",
      color: "text-teal-500 bg-teal-500/10 border-teal-500/30",
      bgGlow: "shadow-teal-500/10",
      recommendationAr: "جودة الهواء مقبولة بشكل عام، ولا تشكل خطراً.",
      recommendationEn: "Air quality is acceptable. Does not pose any risks."
    };
  } else if (aqi <= 150) {
    return {
      id: "moderate",
      nameAr: "معتدل",
      nameEn: "Moderate",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      bgGlow: "shadow-amber-500/10",
      recommendationAr: "يجب على الفئات الحساسة في المنزل أخذ أقساط من الراحة والحد من الجهد الزائد.",
      recommendationEn: "Sensitive individuals should rest and reduce intense physical exertion inside."
    };
  } else if (aqi <= 200) {
    return {
      id: "unhealthy",
      nameAr: "غير صحي",
      nameEn: "Unhealthy",
      color: "text-orange-500 bg-orange-500/10 border-orange-500/30",
      bgGlow: "shadow-orange-500/20 pulse-orange",
      recommendationAr: "الهواء غير صحي للجميع داخل الغرف. يرجى تهوية الغرف ومراقبة تسريب الغاز.",
      recommendationEn: "Air is unhealthy indoors. Please ventilate the rooms and check for gas leaks."
    };
  } else if (aqi <= 300) {
    return {
      id: "very_unhealthy",
      nameAr: "غير صحي جداً",
      nameEn: "Very Unhealthy",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
      bgGlow: "shadow-rose-500/30 pulse-red",
      recommendationAr: "توصية هامة بتهوية المكان فوراً واستخدام منقيات الهواء في الداخل.",
      recommendationEn: "Ventilation is recommended immediately. Use indoor air purifiers."
    };
  } else {
    return {
      id: "hazardous",
      nameAr: "خطير للغاية",
      nameEn: "Hazardous",
      color: "text-red-600 bg-red-600/10 border-red-600/30",
      bgGlow: "shadow-red-600/40 flash-red-border animate-pulse",
      recommendationAr: "تنبيه طوارئ: غادر المنطقة المصابة فوراً، وقم بتهويتها وإخلاء الحاضرين.",
      recommendationEn: "Emergency alert: Leave the affected area immediately and ventilate."
    };
  }
}
