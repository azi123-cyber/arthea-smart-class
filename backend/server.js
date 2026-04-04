require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

// ============================================================
// OTP & IP SECURITY
// ============================================================
// OTP lokal di memory (tetap ada sebagai cache, tapi primary di Firebase)
const otpStore = {}; 

/**
 * Utility: Dapatkan IP User
 */
function getClientIP(req) {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress || "0.0.0.0";
}

/**
 * Utility: Cek apakah IP diblokir (cek di Firebase)
 */
async function checkIPBlock(req, res, next) {
  try {
    const ip = getClientIP(req);
    const ipHash = ip.replace(/\./g, "_");
    const blockSnap = await db.ref(`blocked_ips/${ipHash}`).once("value");
    
    if (blockSnap.exists()) {
      const block = blockSnap.val();
      if (block.type === 'perm') {
        return res.status(403).json({ error: "Akses diblokir permanen karena tindakan tidak wajar (Spam)." });
      }
      if (block.until && Date.now() < block.until) {
        const resetAt = new Date(block.until).toLocaleString("id-ID");
        return res.status(403).json({ error: `Akses diblokir sementara hingga ${resetAt}.` });
      }
      // Blokir sudah lewat -> hapus
      await db.ref(`blocked_ips/${ipHash}`).remove();
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Utility: Catat Tindakan User & Blokir jika Spam
 */
async function recordIPAction(ip, action, type = 'temp') {
  const ipHash = ip.replace(/\./g, "_");
  const today = new Date().toISOString().split('T')[0];
  const statsRef = db.ref(`ip_stats/${ipHash}/${today}/${action}`);
  
  await statsRef.transaction((current) => (current || 0) + 1);
  const snap = await statsRef.once("value");
  const count = snap.val();

  // Rule 1: Buat akun / OTP > 10x sehari -> Blokir sampai besok
  if ((action === 'register' || action === 'otp') && count > 10) {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    await db.ref(`blocked_ips/${ipHash}`).set({
      type: 'temp',
      until: tomorrow.getTime(),
      reason: `Terlalu banyak request ${action}`
    });
  }
  
  // Rule 2: Spam Ujian Non-Login > 20x semalam -> Blokir Permanen
  if (action === 'exam_guest' && count > 20) {
    await db.ref(`blocked_ips/${ipHash}`).set({
      type: 'perm',
      reason: "Spam pengerjaan ujian tanpa login"
    });
  }

  // Rule 3: Spam Ujian Login > 50x semalam -> Blokir 1 Hari
  if (action === 'exam_login' && count > 50) {
    const nextDay = Date.now() + 24 * 60 * 60 * 1000;
    await db.ref(`blocked_ips/${ipHash}`).set({
      type: 'temp',
      until: nextDay,
      reason: "Spam pengerjaan ujian (logged-in)"
    });
  }
}


// ============================================================
// INISIALISASI FIREBASE ADMIN
// ============================================================
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: File serviceAccountKey.json tidak ditemukan!");
  console.error("   Letakkan file service account JSON di:", path.resolve(serviceAccountPath));
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.database();
const bucket = admin.storage().bucket();
console.log("✅ Firebase Admin berhasil diinisialisasi");

// ============================================================
// INISIALISASI EXPRESS
// ============================================================
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-token"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// MIDDLEWARE: AUTH TOKEN
// ============================================================
function requireAuth(req, res, next) {
  const token = req.headers["x-api-token"];
  if (!token || token !== process.env.API_SECRET_TOKEN) {
    return res.status(401).json({ error: "Unauthorized: Token tidak valid" });
  }
  next();
}

// ============================================================
// MULTER: Konfigurasi upload file ke DISK LOKAL SERVER
// ============================================================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Berfungsi agar folder 'uploads' bisa diakses secara publik via URL
app.use("/uploads", express.static(uploadDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // Maks 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipe file tidak diizinkan. Hanya JPG, PNG, WebP, PDF."), false);
    }
  },
});

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "WEB-OSN Backend berjalan!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// ------------------------------------------------------------
// ROUTE: Kirim OTP ke Firebase (Jeda 2 Menit)
// POST /otp/send
// Body (JSON): { username, name, kelas, password }
// ------------------------------------------------------------
app.post("/otp/send", checkIPBlock, async (req, res) => {
  try {
    const { username, name, kelas, password } = req.body;
    const ip = getClientIP(req);

    if (!username || !name || !kelas || !password) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    // Record IP action
    await recordIPAction(ip, 'otp');

    // Cek cooldown di Firebase
    const otpRef = db.ref(`otps/${username}`);
    const existingSnap = await otpRef.once("value");
    
    if (existingSnap.exists()) {
      const lastSent = existingSnap.val().timestamp;
      const remains = (lastSent + 2 * 60 * 1000) - Date.now();
      if (remains > 0) {
        const secs = Math.ceil(remains / 1000);
        return res.status(429).json({ error: `Tunggu ${secs} detik lagi untuk meminta OTP baru.` });
      }
    }

    // Cek apakah username sudah ada
    const userSnap = await db.ref(`users/${username}`).once("value");
    if (userSnap.exists()) {
      return res.status(409).json({ error: "Username sudah digunakan" });
    }

    // Generate OTP 6 digit
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 menit

    // Simpan ke Firebase dan memory cache
    const otpData = { code: otpCode, timestamp: Date.now(), expiresAt, name, kelas, password, ip };
    await otpRef.set(otpData);
    otpStore[username] = otpData;

    console.log(`[OTP] Created for ${username}: ${otpCode} (IP: ${ip})`);

    res.json({ success: true, message: "OTP berhasil dibuat. Silakan cek di Firebase / Admin Panel." });
  } catch (err) {
    console.error("Error OTP send:", err.message);
    res.status(500).json({ error: "Gagal membuat OTP", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Verifikasi OTP
// POST /otp/verify
// ------------------------------------------------------------
app.post("/otp/verify", checkIPBlock, async (req, res) => {
  try {
    const { username, otp } = req.body;
    const ip = getClientIP(req);

    if (!username || !otp) return res.status(400).json({ error: "Data tidak lengkap" });

    const otpRef = db.ref(`otps/${username}`);
    const snap = await otpRef.once("value");
    const stored = snap.val();

    if (!stored) return res.status(404).json({ error: "OTP tidak ditemukan." });
    if (Date.now() > stored.expiresAt) {
      await otpRef.remove();
      return res.status(410).json({ error: "OTP sudah kedaluwarsa." });
    }
    if (stored.code !== otp.trim()) return res.status(401).json({ error: "Kode OTP salah." });

    // Akun dibuat
    const userData = {
      name: stored.name,
      username,
      password: stored.password,
      kelas: stored.kelas,
      role: "siswa",
      createdAt: Date.now(),
      isVerified: true,
      registeredIP: ip
    };

    await db.ref(`users/${username}`).set(userData);
    await otpRef.remove();
    await recordIPAction(ip, 'register');

    res.json({ success: true, message: "Berhasil verifikasi!", user: userData });
  } catch (err) {
    res.status(500).json({ error: "Gagal verifikasi OTP" });
  }
});

// ------------------------------------------------------------
// ROUTE: Catat Login & Check Block
// POST /auth/login-track
// ------------------------------------------------------------
app.post("/auth/login-track", checkIPBlock, async (req, res) => {
  const { username } = req.body;
  const ip = getClientIP(req);
  if (username) {
    await db.ref(`users/${username}/lastLoginIP`).set(ip);
    await db.ref(`users/${username}/lastLoginAt`).set(Date.now());
  }
  await recordIPAction(ip, 'login');
  res.json({ success: true });
});

// ------------------------------------------------------------
// ROUTE: Track Action (Exam Start, etc)
// POST /api/track-ip
// ------------------------------------------------------------
app.post("/api/track-ip", checkIPBlock, async (req, res) => {
  const { action } = req.body; // 'exam_guest' or 'exam_login'
  const ip = getClientIP(req);
  if (action) await recordIPAction(ip, action);
  res.json({ success: true });
});



// ------------------------------------------------------------
// ROUTE: Upload file ke Pterodactyl Lokal HTTP
// POST /upload
// Header: x-api-token: <token>
// Body (multipart): file (file), folder (optional string)
// ------------------------------------------------------------
app.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Tidak ada file yang diupload" });
    }

    const fileName = req.file.filename;

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host;
    const publicUrl = `${proto}://${host}/uploads/${fileName}`;

    res.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Error upload:", err);
    res.status(500).json({ error: "Gagal upload file ke lokal", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Tambah user ke Firebase Realtime Database
// POST /users/create
// Header: x-api-token: <token>
// Body (JSON): { uid, name, email, role, whatsapp }
// ------------------------------------------------------------
app.post("/users/create", requireAuth, async (req, res) => {
  try {
    const { uid, name, email, role, whatsapp } = req.body;

    if (!uid || !name || !email) {
      return res.status(400).json({ error: "Field uid, name, dan email wajib diisi" });
    }

    const userData = {
      uid,
      name,
      email,
      role: role || "student",
      whatsapp: whatsapp || "",
      createdAt: new Date().toISOString(),
      isVerified: false,
    };

    await db.ref(`users/${uid}`).set(userData);

    res.json({ success: true, message: `User ${name} berhasil dibuat`, data: userData });
  } catch (err) {
    console.error("Error create user:", err);
    res.status(500).json({ error: "Gagal membuat user", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Upload materi/soal (JSON) ke Realtime Database
// POST /materials/upload
// Header: x-api-token: <token>
// Body (JSON): { title, subject, content, type }
// ------------------------------------------------------------
app.post("/materials/upload", requireAuth, async (req, res) => {
  try {
    const { title, subject, content, type } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Field title dan content wajib diisi" });
    }

    const newRef = db.ref("materials").push();
    const material = {
      id: newRef.key,
      title,
      subject: subject || "Umum",
      content,
      type: type || "materi", // 'materi' | 'soal' | 'tryout'
      createdAt: new Date().toISOString(),
      uploadedBy: "admin",
    };

    await newRef.set(material);

    res.json({ success: true, message: "Materi berhasil diupload", data: material });
  } catch (err) {
    console.error("Error upload material:", err);
    res.status(500).json({ error: "Gagal upload materi", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Ambil semua data dari path Firebase tertentu
// GET /db/:path
// Header: x-api-token: <token>
// ------------------------------------------------------------
app.get("/db/*", requireAuth, async (req, res) => {
  try {
    const dbPath = req.params[0];
    const snapshot = await db.ref(dbPath).once("value");
    res.json({ success: true, data: snapshot.val() });
  } catch (err) {
    console.error("Error read DB:", err);
    res.status(500).json({ error: "Gagal membaca database", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Ambil Limit AI User Hari Ini
// GET /ai/limits
// Header: x-api-token: <token>
// ------------------------------------------------------------
app.get("/ai/limits", requireAuth, async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid dibutuhkan" });

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const limitsRef = db.ref(`users/${uid}/ai_limits/${today}`);
    const snapshot = await limitsRef.once("value");
    const data = snapshot.val() || { Pintar: 0, Menengah: 0, Biasa: 0 };

    res.json({ success: true, data });
  } catch (err) {
    console.error("Error get AI limits:", err);
    res.status(500).json({ error: "Gagal mendapatkan limit AI" });
  }
});

// ------------------------------------------------------------
// ROUTE: Generate Soal AI
// POST /ai/generate
// Header: x-api-token: <token>
// Body: { uid, prompt, subMateri, modelType, difficulty, count }
// ------------------------------------------------------------
app.post("/ai/generate", requireAuth, async (req, res) => {
  try {
    const { uid, prompt, subMateri, modelType, difficulty, count = 5, language = "Indonesia", role = "student", imageContent, imageMimeType, questionTypes } = req.body;
    if (!uid || !prompt || !modelType || !difficulty) {
      return res.status(400).json({ error: "Parameter tidak lengkap" });
    }

    const today = new Date().toISOString().split("T")[0];
    const limitsRef = db.ref(`users/${uid}/ai_limits/${today}`);

    // Check limits
    const limitsSnap = await limitsRef.once("value");
    const limitsData = limitsSnap.val() || { Pintar: 0, Menengah: 0, Biasa: 0 };

    let maxLimit = 0;
    if (role === "teacher" || role === "admin") {
      if (modelType === "Pintar") maxLimit = 8;
      else if (modelType === "Menengah") maxLimit = 8;
      else if (modelType === "Biasa") maxLimit = 10;
      else return res.status(400).json({ error: "Tipe AI tidak valid" });
    } else {
      if (modelType === "Pintar") maxLimit = 1;
      else if (modelType === "Menengah") maxLimit = 1;
      else if (modelType === "Biasa") maxLimit = 5;
      else return res.status(400).json({ error: "Tipe AI tidak valid" });
    }

    if (limitsData[modelType] >= maxLimit) {
      return res.status(403).json({ error: `Limit penggunaan AI ${modelType} harian Anda sudah habis.` });
    }

    // Build Prompt
    let clueInstruction = "Isi field 'clue' dengan petunjuk singkat untuk membantu siswa.";
    if (req.body.includeClue === false) clueInstruction = "Isi field 'clue' dengan string kosong \"\" karena clue tidak diminta.";
    else if (difficulty == 1) clueInstruction = "Isi field 'clue' dengan petunjuk yang jelas (maksimal 2 kalimat).";
    else if (difficulty == 2) clueInstruction = "Isi field 'clue' dengan kata kunci singkat (maksimal 3 kata).";
    else if (difficulty == 3) clueInstruction = "Isi field 'clue' dengan string kosong \"\" (jangan beri clue untuk tingkat sulit).";

    let expInstruction = "Isi field 'explanation' dengan penjelasan lengkap mengenai jawaban yang benar.";
    if (req.body.includeExplanation === false) expInstruction = "Isi field 'explanation' dengan string kosong \"\" karena penjelasan tidak diminta.";

    const maxQuestions = Math.min(parseInt(count), 20);
    const typesStr = (questionTypes && questionTypes.length > 0) ? questionTypes.join(", ") : "Pilihan Ganda (PG)";

const systemPrompt = `Kamu adalah guru cerdas penanggung jawab pembuatan soal olimpiade. TUGAS UTAMA: Buatkan tepat ${maxQuestions} soal dengan variasi tipe: [${typesStr}] berdasarkan perintah pengguna: "${prompt}" ${subMateri ? "dengan sub-materi: " + subMateri : ""}.
${imageContent ? "INSTRUKSI KRITIS: Pengguna melampirkan file REFERENSI! Kamu WAJIB meneliti isi file tersebut dan membuat soal yang bersumber atau terinspirasi kuat dari konten file tersebut. JANGAN membuat soal yang tidak relevan dengan referensi ini." : ""}

Tipe Soal Detail:
1. PG (Pilihan Ganda): 4 opsi (A-D), 1 jawaban benar.
2. PGK (Pilihan Ganda Kompleks): 4-5 opsi, LEBIH DARI 1 jawaban benar. Field 'correctAnswer' HARUS berupa ARRAY string (misal: ["A", "C"]).
3. Essay: Tanpa opsi (isi 'options' dengan array kosong []), 'correctAnswer' berupa teks kunci jawaban.

Tingkat kesulitan: ${difficulty} (1 mudah, 2 sedang, 3 sulit).
- ${clueInstruction}
- ${expInstruction}

Gunakan Bahasa ${language}. Rumus gunakan LaTeX ($..$).
Output HARUS murni JSON:
{
  "questions": [
    {
      "type": "PG atau PGK atau Essay",
      "question": "teks soal",
      "options": ["A. opsi1", "B. opsi2", ...],
      "correctAnswer": "A" atau ["A", "C"] atau "teks jawaban essay",
      "explanation": "penjelasan",
      "clue": "petunjuk"
    }
  ]
}
Pastikan total ada tepat ${maxQuestions} soal.`;

    let generatedText = "";

    // Call API
    if (modelType === "Pintar") { // Gemini
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");

      const partsArr = [{ text: systemPrompt }];
      if (imageContent && imageMimeType) {
        // Supports image/jpeg, image/png, application/pdf, etc.
        partsArr.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageContent
          }
        });
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: partsArr }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7
          }
        }
      );
      generatedText = response.data.candidates[0].content.parts[0].text;
    } else { // Claude or Llama via OpenRouter
      if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY belum dikonfigurasi.");
      let model = "meta-llama/llama-3.1-8b-instruct";
      if (modelType === "Menengah") model = "anthropic/claude-3-haiku";

      let contentPayload;
      if (imageContent && imageMimeType) {
        if (model === "meta-llama/llama-3.1-8b-instruct" || model === "anthropic/claude-3-haiku") {
          // Both might complain about image structure depending on the format. We fallback to Gemini Flash on openrouter.
          model = "google/gemini-2.5-flash";
        }
        contentPayload = [
          { type: "text", text: systemPrompt },
          { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageContent}` } }
        ];
      } else {
        contentPayload = systemPrompt;
      }

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model,
          messages: [
            { role: "system", content: "Kamu adalah guru cerdas penanggung jawab pembuatan soal olimpiade." },
            { role: "user", content: contentPayload }
          ],
          temperature: 0.7,
          max_tokens: 3000
        },
        { headers: { 
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://arthea-smart-class.arsyir.my.id",
            "X-Title": "Arthea Smart Class"
        } }
      );
      generatedText = response.data.choices[0].message.content;
    }

    // Extract JSON string using regex incase of prepended/appended text
    let cleanJsonStr = "";
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJsonStr = jsonMatch[0];
    } else {
      cleanJsonStr = generatedText.trim();
    }

    // Fix invalid JSON escapes (like \p in \pmod) generated by AI for LaTeX
    cleanJsonStr = cleanJsonStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

    // Fix unescaped literal newlines inside JSON strings which cause JSON.parse to fail
    let inString = false;
    let inEscaped = false;
    let cleanedJson = "";
    for (let i = 0; i < cleanJsonStr.length; i++) {
      const c = cleanJsonStr[i];
      if (c === '\\') {
        inEscaped = !inEscaped;
        cleanedJson += c;
      } else if (c === '"' && !inEscaped) {
        inString = !inString;
        cleanedJson += c;
      } else if (inString && (c === '\n' || c === '\r')) {
        cleanedJson += (c === '\n' ? '\\n' : '\\r');
        inEscaped = false;
      } else {
        cleanedJson += c;
        inEscaped = false;
      }
    }
    cleanJsonStr = cleanedJson;

    let questionsData;
    try {
      questionsData = JSON.parse(cleanJsonStr);
      if (!Array.isArray(questionsData)) {
        if (questionsData.questions) questionsData = questionsData.questions;
        else if (questionsData.soal) questionsData = questionsData.soal;
        else questionsData = [questionsData];
      }

      // Final fallback to clean up undefined outputs rendering as "null" on frontend
      questionsData = questionsData.map(q => ({
        ...q,
        clue: q.clue || "Tidak ada clue untuk pertanyaan ini",
        explanation: q.explanation || "Tidak ada penjelasan untuk pertanyaan ini"
      }));

    } catch (e) {
      console.error("Failed to parse JSON", cleanJsonStr);
      throw new Error("Gagal mengurai output dari AI menjadi bentuk soal. Tolong coba lagi.");
    }

    // Update Limits
    limitsData[modelType] += 1;
    await limitsRef.set(limitsData);

    let materialId = null;

    if (role !== "teacher" && role !== "admin") {
      const materialTitle = `AI Generated: ${prompt.substring(0, 30)}`;
      const newMaterialRef = db.ref("materials").push();
      const materialData = {
        id: newMaterialRef.key,
        title: materialTitle,
        subject: subMateri || "AI Generator",
        type: "soal",
        duration: req.body.duration || 60,
        maxAttempts: req.body.maxAttempts || 1,
        token: req.body.tokenUjian || "",
        content: JSON.stringify(questionsData),
        createdAt: new Date().toISOString(),
        uploadedBy: uid,
        isPrivate: true
      };
      await newMaterialRef.set(materialData);
      materialId = newMaterialRef.key;

      try {
        const dirPath = path.join(__dirname, 'soal_ai_private');
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        const fileName = `Soal_${uid}_${subMateri ? subMateri.replace(/[^a-zA-Z0-9]/g, '_') : 'AI'}_${Date.now()}.json`;
        fs.writeFileSync(path.join(dirPath, fileName), JSON.stringify(materialData, null, 2));
      } catch (e) {
        console.error("Gagal menyimpan ke server Pterodactyl lokal", e);
      }
    }

    res.json({ success: true, questions: questionsData, materialId, limits: limitsData });
  } catch (err) {
    console.error("Error AI generate:", err?.response?.data || err.message);
    res.status(500).json({ error: "Gagal men-generate soal", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Catat Riwayat Ujian Publik
// POST /api/public-history
// Header: x-api-token: <token>
// ------------------------------------------------------------
app.post("/api/public-history", requireAuth, async (req, res) => {
  try {
    const { tryoutId, guestName, score, violations, uploadedBy } = req.body;
    const dirPath = path.join(__dirname, 'history_user_public');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const fileName = `PublicHistory_${Date.now()}_${guestName ? guestName.replace(/[^a-zA-Z0-9]/g, '_') : 'Anonymous'}.json`;
    const record = {
      tryoutId,
      guestName: guestName || 'Anonymous',
      score,
      violations,
      uploadedBy,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.join(dirPath, fileName), JSON.stringify(record, null, 2));
    res.json({ success: true, message: "Riwayat berhasil disimpan" });
  } catch (err) {
    console.error("Error catat public history:", err);
    res.status(500).json({ error: "Gagal mencatat riwayat publik", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Ambil semua data dari path Firebase tertentu
// GET /db/:path
// Header: x-api-token: <token>
// ------------------------------------------------------------
app.get("/db/*", requireAuth, async (req, res) => {
  try {
    const dbPath = req.params[0];
    const snapshot = await db.ref(dbPath).once("value");
    res.json({ success: true, data: snapshot.val() });
  } catch (err) {
    console.error("Error read DB:", err);
    res.status(500).json({ error: "Gagal membaca database", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Hapus data dari Firebase Realtime Database
// DELETE /firebase/path
// Header: x-api-token: <token>
// Body (JSON): { path: "forum/topicId" atau "forum/topicId/replyList/replyId" }
// ------------------------------------------------------------
app.delete("/firebase/path", requireAuth, async (req, res) => {
  try {
    const { path: dbPath } = req.body;
    if (!dbPath) return res.status(400).json({ error: "path wajib diisi" });

    // Batasi hanya path forum yang boleh dihapus lewat endpoint ini
    if (!dbPath.startsWith("forum/")) {
      return res.status(403).json({ error: "Hanya path forum yang diizinkan dihapus" });
    }

    await db.ref(dbPath).remove();
    res.json({ success: true, message: `Data di path '${dbPath}' berhasil dihapus` });
  } catch (err) {
    console.error("Error hapus Firebase path:", err);
    res.status(500).json({ error: "Gagal menghapus data dari Firebase", detail: err.message });
  }
});

// ------------------------------------------------------------
// ROUTE: Hapus file dari Penyimpanan Lokal
// DELETE /upload
// Header: x-api-token: <token>
// Body (JSON): { fileName }
// ------------------------------------------------------------
app.delete("/upload", requireAuth, async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: "fileName wajib diisi" });

    const filePath = path.join(__dirname, "uploads", fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: `File ${fileName} berhasil dihapus secara lokal` });
    }

    res.status(404).json({ error: "File tidak ditemukan di direktori lokal" });
  } catch (err) {
    console.error("Error hapus file:", err);
    res.status(500).json({ error: "Gagal menghapus file", detail: err.message });
  }
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ============================================================
// START SERVER
// ============================================================
const https = require("https");

function getPublicIP() {
  return new Promise((resolve) => {
    https.get("https://ifconfig.me/ip", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data.trim()));
    }).on("error", () => resolve(null));
  });
}

app.listen(PORT, "0.0.0.0", async () => {
  const publicIP = await getPublicIP();
  console.log(`🚀 Backend WEB-OSN berjalan di port ${PORT}`);
  console.log(`   Health check (Local) : http://localhost:${PORT}/health`);
  if (publicIP) {
    console.log(`   Health check (Remote): http://${publicIP}:${PORT}/health`);
  } else {
    console.log(`   Health check (Remote): Gunakan IP Server Pterodactyl kamu di port ${PORT}`);
  }
  console.log(`   Waktu start : ${new Date().toLocaleString("id-ID")}`);
});
