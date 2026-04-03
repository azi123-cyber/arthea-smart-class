/**
 * Script: upload_users_firebase.js
 * 
 * Script ini untuk seeder / upload data users ke Firebase secara massal.
 * Jalankan dari folder backend/:
 *   node upload_users_firebase.js
 * 
 * Pastikan .env sudah dikonfigurasi sebelum menjalankan script ini!
 */

require("dotenv").config();
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ============================================================
// INISIALISASI FIREBASE ADMIN
// ============================================================
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: File serviceAccountKey.json tidak ditemukan!");
  console.error(
    "   Letakkan file service account JSON di:",
    path.resolve(serviceAccountPath)
  );
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// ============================================================
// DAFTAR USER YANG AKAN DIUPLOAD
// ============================================================
// Tambah atau edit data user di sini sesuai kebutuhan
const usersToUpload = [
  {
    uid: "student_001",
    name: "Budi Santoso",
    email: "budi@example.com",
    role: "student",
    whatsapp: "6281234567890",
    isVerified: false,
    createdAt: new Date().toISOString(),
  },
  {
    uid: "student_002",
    name: "Siti Aminah",
    email: "siti@example.com",
    role: "student",
    whatsapp: "6289876543210",
    isVerified: false,
    createdAt: new Date().toISOString(),
  },
  {
    uid: "admin_001",
    name: "Admin Utama",
    email: "admin@sekolah.ac.id",
    role: "admin",
    whatsapp: "6281111111111",
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
];

// ============================================================
// FUNGSI UPLOAD
// ============================================================
async function uploadUsers() {
  console.log(`\n🔄 Memulai upload ${usersToUpload.length} user ke Firebase...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of usersToUpload) {
    try {
      await db.ref(`users/${user.uid}`).set(user);
      console.log(`✅ Berhasil: ${user.name} (${user.uid})`);
      successCount++;
    } catch (err) {
      console.error(`❌ Gagal upload ${user.uid}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n📊 Selesai!`);
  console.log(`   ✅ Berhasil : ${successCount} user`);
  console.log(`   ❌ Gagal    : ${failCount} user`);

  process.exit(0);
}

uploadUsers();
