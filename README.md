# Smart Auto-Clipper Studio untuk Konten.com 🎬

Sistem otomatisasi video kliping vertikal (9:16) berdurasi pendek (TikTok/Reels/Shorts) yang dirancang khusus untuk mematuhi **100% aturan kurasi dan brief brand platform Konten.com**.

---

## 🌟 Fitur Utama

1. **Dual Ingestion (YouTube & Google Drive):**
   * Mengunduh materi video berkualitas tinggi (1080p) via `yt-dlp`.
   * Mendukung unduhan folder Google Drive (Trailer, Wawancara, BTS, Poster) via `gdown`.
   * Fitur upload file `.mp4` lokal secara langsung.

2. **Transkripsi Super Cepat & Hemat Token:**
   * Ekstrak audio 16kHz mono dan transkripsi kata per kata menggunakan `faster-whisper`.
   * Parsing subtitle `.srt` bawaan YouTube tanpa membebani GPU/CPU.
   * Transkrip diringkas per kalimat/paragraf sebelum dikirim ke LLM (menghemat ~70% token).

3. **AI Hook Curation (Gemini 2.5 Flash):**
   * Deteksi hook tajam di detik 0–3 dengan skor viralitas 1–100.
   * **Injeksi Do's & Don'ts Brand:** Menolak materi kontroversial, SARA, hoaks, atau isu politik agar lolos kurasi admin Konten.com.
   * Biaya sangat murah: **~Rp 27 per video 1 jam** (gratis dengan kuota harian Google AI Studio).

4. **3-Column Assisted Studio Editor:**
   * **Kolom Kiri:** Transkrip interaktif dengan fitur *click-to-seek* dan perbaikan typo ejaan nama tokoh.
   * **Kolom Tengah:** Pemutar video 9:16 dengan **Safe Zone Overlay TikTok & Instagram Reels** (memastikan subtitle tidak tertutup tombol like/komentar/caption).
   * **Kolom Kanan:** Pilihan layout (`BLUR_BG` atau `CENTER_CROP`), pengaturan subtitle karaoke `.ass`, dan **Auto-Stitch Outro Poster Wajib (3 detik)**.

5. **Submission Kit Siap Pakai:**
   * 1-Click Copy Tagar (#awalmulahamka, #buyahamka, dsb).
   * 1-Click Copy Caption lengkap.
   * Form penyimpanan URL postingan media sosial langsung ke database pelacakan.

---

## 🏗️ Struktur Repositori

```text
video-clipper-one/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/   # Router campaigns, ingest, clips, render
│   │   ├── core/            # Config & SQLite Database
│   │   ├── models/          # Schemas Pydantic
│   │   ├── services/        # Ingestion, Whisper, Gemini, Subtitles, FFmpeg
│   │   └── main.py          # FastAPI application
│   ├── storage/             # Penyimpanan raw, processed, subtitles, posters
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API client
│   │   ├── components/      # VideoPlayer916, SafeZoneOverlay, TranscriptEditor, SubmissionCard
│   │   ├── pages/           # Studio & Campaigns
│   │   ├── types/           # TypeScript definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── docs/
    └── PLAN.md              # Blueprint teknis komprehensif
```

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
* **Python 3.10+**
* **Node.js v18+**
* **FFmpeg** (telah terinstall di sistem dengan dukungan `libass`)

### 2. Menjalankan Backend
```bash
cd backend

# Buat & aktifkan virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Buat file konfigurasi .env dari template
copy .env.example .env

# Jalankan server FastAPI
uvicorn app.main:app --reload --port 8000
```
Backend API dan dokumentasi Swagger akan aktif di: `http://localhost:8000/docs`

### 3. Menjalankan Frontend
```bash
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```
Buka browser di: `http://localhost:3000`

---

## 📄 Lisensi & Kontributor
Dikembangkan untuk komunitas kreator & clipper Konten.com Indonesia.
