import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore, setLogLevel } from "firebase/firestore";
import { Database, getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // Optional values, if present in env they'll be included by Firebase under the hood
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

function isDefined(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value.trim().toLowerCase() !== "undefined";
}

function hasConfig(): boolean {
  const ok = Boolean(
    isDefined(firebaseConfig.apiKey) &&
      isDefined(firebaseConfig.authDomain) &&
      isDefined(firebaseConfig.projectId) &&
      isDefined(firebaseConfig.appId)
  );
  if (!ok) {
    // Helpful runtime hint without leaking secrets
    if (!isDefined(firebaseConfig.apiKey)) console.warn("Firebase apiKey is missing/invalid");
    if (!isDefined(firebaseConfig.authDomain)) console.warn("Firebase authDomain is missing/invalid");
    if (!isDefined(firebaseConfig.projectId)) console.warn("Firebase projectId is missing/invalid");
    if (!isDefined(firebaseConfig.appId)) console.warn("Firebase appId is missing/invalid");
  }
  return ok;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;

if (hasConfig()) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  if (process.env.NODE_ENV === "development") {
    try {
      setLogLevel("debug");
    } catch (_e) {
      // no-op
    }
    const safe = {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      appId: firebaseConfig.appId,
      apiKeyLast4: isDefined(firebaseConfig.apiKey)
        ? (firebaseConfig.apiKey as string).slice(-4)
        : undefined,
    } as const;
    // eslint-disable-next-line no-console
    console.debug("[Firebase config]", safe);
  }
  try {
    const settings: any = {
      experimentalAutoDetectLongPolling: true,
      // Prefer fetch streaming; avoids WebChannel long-polling 400s on some networks
      useFetchStreams: true,
      // Tune long-poll timeouts when fallback happens
      experimentalLongPollingOptions: { timeoutSeconds: 30 },
      synchronizeTabs: false,
    };
    db = initializeFirestore(app, settings);
  } catch (_e) {
    db = getFirestore(app);
  }

  // Initialize Realtime Database
  try {
    rtdb = getDatabase(app);
  } catch (_e) {
    rtdb = null;
  }
}

export { app, auth, googleProvider, db, rtdb };


