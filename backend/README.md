# WEB-OSN Backend Server

Backend Express.js untuk platform WEB-OSN, siap deploy di **Pterodactyl Panel**.

## 📁 Struktur File

```
backend/
├── server.js                  # Server utama (entry point)
├── upload_users_firebase.js   # Script seeder upload user massal
├── package.json               # Dependencies
├── .env.example               # Template environment variables
├── .env                       # (BUAT SENDIRI, jangan dicommit!)
├── .gitignore
└── serviceAccountKey.json     # (LETAKKAN DI SINI, jangan dicommit!)
```

---

## 🚀 Step-by-Step Deploy ke Pterodactyl

### LANGKAH 1: Persiapan File di Lokal

1. Masuk ke folder backend:
   ```bash
   cd /home/arsyirazeim/WEB-OSN/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

4. Edit file `.env` sesuai konfigurasi kamu:
   ```bash
   nano .env
   ```
   Isi nilainya:
   ```
   PORT=3001
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   FIREBASE_DATABASE_URL=https://smart-class-d26fa-default-rtdb.firebaseio.com
   FIREBASE_STORAGE_BUCKET=smart-class-d26fa.appspot.com
   API_SECRET_TOKEN=buat_token_panjang_dan_rahasia_disini
   CORS_ORIGIN=https://domainmu.vercel.app
   ```

5. **Penting!** Salin file service account JSON ke folder backend dengan nama `serviceAccountKey.json`:
   ```bash
   cp /home/arsyirazeim/WEB-OSN/smart-class-d26fa-firebase-adminsdk-fbsvc-29f7518b76.json ./serviceAccountKey.json
   ```

6. Test di lokal dulu:
   ```bash
   node server.js
   ```
   Kalau berhasil, muncul:
   ```
   ✅ Firebase Admin berhasil diinisialisasi
   🚀 Backend WEB-OSN berjalan di port 3001
   ```

---

### LANGKAH 2: Upload ke Pterodactyl

1. **Login ke Pterodactyl Panel** kamu

2. **Buat server baru** (kalau belum ada):
   - Egg: **Node.js** (atau generic egg yang support Node)
   - Memory: minimal 512MB
   - Port: misalnya `3001`

3. **Upload file-file berikut** via File Manager Pterodactyl:
   - `server.js`
   - `package.json`
   - `.env` *(isi dulu di lokal, baru upload)*
   - `serviceAccountKey.json` *(jangan lupa ini!)*

4. **Install dependencies** via Console Pterodactyl:
   ```bash
   npm install
   ```

5. **Set startup command** di Pterodactyl:
   ```
   node server.js
   ```
   atau jika menggunakan field "Start Command":
   ```
   npm start
   ```

6. **Start server** → klik tombol Start di panel

7. **Verify** dengan buka URL:
   ```
   http://IP_SERVER:3001/health
   ```
   Respons yang benar:
   ```json
   { "status": "healthy", "uptime": 12.34 }
   ```

---

### LANGKAH 3: Jalankan Script Upload User (Opsional)

Untuk memasukkan data user secara massal ke Firebase:

```bash
cd /home/arsyirazeim/WEB-OSN/backend
node upload_users_firebase.js
```

Edit dulu data user di dalam file `upload_users_firebase.js` sesuai kebutuhan.

---

## 📡 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | Info server |
| GET | `/health` | Health check |
| POST | `/upload` | Upload file ke Firebase Storage |
| POST | `/users/create` | Buat user baru di Realtime DB |
| POST | `/materials/upload` | Upload materi/soal |
| GET | `/db/:path` | Ambil data dari Realtime DB |
| DELETE | `/upload` | Hapus file dari Storage |

Semua endpoint (kecuali `/` dan `/health`) membutuhkan header:
```
x-api-token: <API_SECRET_TOKEN kamu>
```

---

## 🔒 Keamanan

- Jangan pernah commit file `.env` atau `serviceAccountKey.json` ke Git
- Ganti `API_SECRET_TOKEN` dengan string acak yang panjang
- Set `CORS_ORIGIN` ke domain frontend kamu yang sebenarnya
- Gunakan HTTPS jika sudah pakai domain

---

## 🛠️ Troubleshooting

| Error | Solusi |
|-------|--------|
| `serviceAccountKey.json tidak ditemukan` | Pastikan file ada di folder `backend/` |
| `Cannot find module` | Jalankan `npm install` dulu |
| `401 Unauthorized` | Cek `API_SECRET_TOKEN` di `.env` dan header request |
| Port sudah dipakai | Ganti `PORT` di `.env` |
