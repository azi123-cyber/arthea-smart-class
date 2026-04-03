import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Updated to match the backend project: smart-class-d26fa
const firebaseConfig = {
  apiKey: "AIzaSyCtPReL3uWRO5lQL5emNRvqnqjQUad_vYY", // Note: Verify if this key works with the new project ID
  authDomain: "smart-class-d26fa.firebaseapp.com",
  databaseURL: "https://smart-class-d26fa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-class-d26fa",
  storageBucket: "smart-class-d26fa.firebasestorage.app",
  messagingSenderId: "234906918891",
  appId: "1:234906918891:web:704552f1f11c3c3a1603ae"
};

// Inisialisasi Firebase aman untuk SSR (Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth };
