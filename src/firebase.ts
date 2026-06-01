import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, UserCredential } from "firebase/auth";
import { getDatabase, ref, onValue, off, DataSnapshot } from "firebase/database";

// Default credentials matches target ESP32 C++ Sketch
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDo09di_vPt-rRSYbg9K_cV-mND0dZ6Sd0",
  databaseURL: "https://smartsaver-7d551-default-rtdb.firebaseio.com/",
  authDomain: "smartsaver-7d551.firebaseapp.com",
  projectId: "smartsaver-7d551",
};

export const DEFAULT_AUTH_CREDENTIALS = {
  email: "esp32@smartsaver.com",
  password: "12345678",
};

// Initialize or retrieve Firebase App
export function getFirebaseApp(config = DEFAULT_FIREBASE_CONFIG) {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(config);
}

// Subscribe to Live Realtime Database path "/home/gas_sensor"
export function subscribeToGasSensor(
  onData: (data: { level: number; status: string; lastUpdate: number }) => void,
  onError: (error: Error) => void,
  config = DEFAULT_FIREBASE_CONFIG,
  authCreds = DEFAULT_AUTH_CREDENTIALS
): () => void {
  try {
    const app = getFirebaseApp(config);
    const auth = getAuth(app);
    const db = getDatabase(app);

    let unsubscribeDatabase: (() => void) | null = null;
    let isActive = true;

    // Sign in first since database rules may protect the node
    signInWithEmailAndPassword(auth, authCreds.email, authCreds.password)
      .then((userCred) => {
        if (!isActive) return;
        
        console.log("Firebase Auth signed in successfully:", userCred.user.email);
        
        const sensorRef = ref(db, "home/gas_sensor");
        
        const listener = onValue(
          sensorRef,
          (snapshot: DataSnapshot) => {
            if (!isActive) return;
            const val = snapshot.val();
            if (val) {
              const level = typeof val.level === "number" ? val.level : 0;
              const status = val.status || "offline";
              const lastUpdate = typeof val.last_update === "number" ? val.last_update : Math.floor(Date.now() / 1000);
              
              onData({ level, status, lastUpdate });
            } else {
              // No data at path yet, send defaults
              onData({ level: 0, status: "offline", lastUpdate: Math.floor(Date.now() / 1000) });
            }
          },
          (err) => {
            onError(err);
          }
        );

        unsubscribeDatabase = () => {
          off(sensorRef, "value", listener);
        };
      })
      .catch((err) => {
        if (isActive) {
          onError(err);
        }
      });

    return () => {
      isActive = false;
      if (unsubscribeDatabase) {
        unsubscribeDatabase();
      }
    };
  } catch (err: any) {
    onError(err);
    return () => {};
  }
}
