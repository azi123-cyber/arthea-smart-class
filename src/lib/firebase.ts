import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Updated to match the backend project: smart-class-d26fa
const firebaseConfig = {
  apiKey: "AIzaSyD7c9PGZv2oKVQ4SrHy_0z4iExy6NRgfwI",
  authDomain: "smart-class-d26fa.firebaseapp.com",
  databaseURL: "https://smart-class-d26fa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-class-d26fa",
  storageBucket: "smart-class-d26fa.firebasestorage.app",
  messagingSenderId: "35614741716",
  appId: "1:35614741716:web:6e3fa8e786c5d34ddf1741",
  measurementId: "G-KXTNF7XR4Z"
};

// Inisialisasi Firebase aman untuk SSR (Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth };
