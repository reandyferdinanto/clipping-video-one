# Blueprint & Rencana Pengembangan: Smart Auto-Clipper Studio untuk Konten.com

Dokumen ini merupakan cetak biru arsitektur teknis, alur kerja pemrosesan video otomatis, spesifikasi antarmuka editor interaktif, skema database, kalkulasi token AI, serta integrasi modul video processing untuk memproduksi klip vertikal (9:16) yang **100% patuh terhadap aturan kurasi admin dan brief brand platform Konten.com**.

---

## 1. Ikhtisar & Visi Produk

### A. Latar Belakang
Platform **Konten.com** adalah marketplace clipper di Indonesia yang menghubungkan brand (pengiklan) dengan kreator konten. Monetisasi dihitung berdasarkan validasi views (CPM berkisar Rp 1.000 – Rp 5.000 / 1.000 views). Namun, berbeda dari clipper generik, Konten.com menerapkan **Tinjauan Kurasi Admin (T+1)**:
* Video yang melanggar brief brand (durasi salah, tidak ada poster wajib, hook berbau hoaks/kontroversial, atau tertutup UI media sosial) akan langsung **ditolak (Rp 0 payout)**.
* Proses manual clipper saat ini (download materi Drive/YouTube, potong segmen menarik, reframe 9:16, burning subtitle, tempel outro poster) memakan waktu **30–45 menit per video**.

### B. Solusi: Smart Assisted Video Editor
Sistem ini dirancang bukan sekadar sebagai skrip CLI kaku, melainkan **Assisted Template-Based Video Editor**:
1. Mengotomatiskan tugas berat: Ingestion YouTube/Google Drive, transkripsi per kata, kurasi segmen oleh LLM, pemotongan jeda diam (*silence cut*), reframe 9:16, dan penempelan subtitle bergaya karaoke.
2. Memberikan kontrol interaktif ringan di browser: Koreksi typo nama tokoh pada transkrip, penyesuaian titik potong klip, pengaktifan poster wajib/outro, serta preview dengan **Safe Zone Overlay TikTok/Instagram Reels**.
3. Memangkas waktu produksi video dari 40 menit menjadi **di bawah 3 menit per klip**.

---

## 2. Spesifikasi Riil Konten.com & Gap Analysis

Berdasarkan audit langsung terhadap campaign aktif di Konten.com (seperti *Falcon Pictures - Buya Hamka Vol. 3* dan *Sulianto Indria Putra*):

| Parameter | Aturan Standar Konten.com | Penanganan dalam Sistem Auto-Clipper |
| :--- | :--- | :--- |
| **Sumber Materi** | YouTube Link & Folder Google Drive (Trailer, BTS, Wawancara, Poster). | Dual Ingestion: Dukungan `yt-dlp` dan `gdown` / Google Drive API. |
| **Durasi Klip** | Dinamis sesuai brief brand (misal 10–120 detik atau 30–50 detik). | Durasi fleksibel yang diinjeksi ke parameter prompt AI sesuai campaign. |
| **Aturan Hook (0-3 detik)** | Wajib menarik, **tetapi dilarang kontroversi SARA, hoaks, politik, atau clickbait palsu**. | Prompt Gemini Flash difilter untuk hook berbasis *curiosity*, *quote inspiratif*, atau *pertanyaan pemantik edukatif*. |
| **Elemen Outro Wajib** | Wajib menampilkan poster resmi, keterangan tanggal rilis, atau CTA channel brand di 2–4 detik terakhir. | **Auto-Stitch Outro Engine**: Menempelkan gambar poster atau bumper video resmi secara otomatis di akhir klip. |
| **Safe Zone Subtitle** | Subtitle tidak boleh menutup wajah pembicara dan tidak boleh tertutup elemen UI medsos. | Margin vertikal diatur di zona aman (30–38% dari dasar frame) menggunakan styling format `.ass`. |
| **Audio** | Audio asli wajib dipertahankan; dilarang mengganti suara dengan AI voice-over/dubbing. | Mempertahankan track audio asli 100% dan hanya memotong jeda hening (*dead-air*). |
| **Kepatuhan Metadata** | Wajib menyertakan seluruh hashtag kampanye dan tagar wajib pada caption saat posting. | Fitur *One-Click Copy Submission Data* (Title + Caption + Hashtag lengkap). |

---

## 3. Arsitektur Sistem (High-Level Architecture)

Sistem menggunakan arsitektur hybrid yang memisahkan beban komputasi berat di backend dan rendering visual instan di browser frontend:

```text
┌────────────────────────────────────────────────────────────────────────┐
│              FRONTEND STUDIO (Vite.js + React + Ant Design)            │
│  - Input: YouTube URL, Google Drive Folder, atau File Upload           │
│  - Campaign Preset & Brief Compliance Rules Selector                   │
│  - 3-Column Interactive Review Canvas:                                 │
│      [Transcript & Typo Editor] | [9:16 Preview + Safe Zone] | [Brand] │
│  - One-Click Submission Helper (Copy Caption & Hashtag Resmi)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API / WebSocket
┌───────────────────────────────────▼────────────────────────────────────┐
│                    BACKEND CORE API (FastAPI / Python)                 │
│  - Manajemen Project & Campaign Config                                 │
│  - Asynchronous Background Task Queue (Celery / BackgroundTasks)       │
│  - JSON Data Formatter & Subtitle Style Generator                      │
└──────────────┬───────────────────────────────────────────┬─────────────┘
               │ Dispatch Job                              │ State / Data
┌──────────────▼────────────────────────────┐ ┌────────────▼────────────┐
│          WORKER PROCESSING ENGINE         │ │   DATABASE (PostgreSQL) │
│ 1. Ingestion: yt-dlp & gdown              │ │ - campaigns             │
│ 2. Transcription: faster-whisper          │ │ - source_videos         │
│ 3. AI Intelligence: Gemini 2.5 Flash      │ │ - clips (status & edit) │
│ 4. Pacing: auto-editor (Silence Cut)      │ │ - submissions           │
│ 5. Render Engine: FFmpeg (libass, concat) │ └─────────────────────────┘
└───────────────────────────────────────────┘
```

---

## 4. Alur Kerja Editor (Interactive Studio Journey)

Editor dirancang dengan prinsip **Assisted Workflow**: *Browser hanya menangani preview interaktif via HTML5 Video dan CSS, sedangkan FFmpeg hanya bekerja 1 kali saat user menekan tombol Final Export.*

```text
[1. INGESTION]          [2. AI CURATION]        [3. INTERACTIVE STUDIO]        [4. EXPORT & SUBMIT]
 Input Link / Drive ──►  Transkripsi Whisper ──► Review 9:16 & Safe Zone   ──► Final FFmpeg Render
 Pilih Campaign          Gemini Hook Finder      Koreksi Typo Transkrip        Unduh MP4 1080x1920
                         Auto-Editor Silence     Pilih Outro Poster Wajib      Salin Caption & Tag
 (Durasi: ~10 detik)     (Durasi: ~45 detik)     (Durasi: 1–2 menit manual)    (Durasi: ~30 detik)
```

### Layout Antarmuka Studio 3-Kolom:
1. **Kolom Kiri (Transcript & Trimming):**
   * Menampilkan kalimat hasil transkripsi lengkap dengan timestamp.
   * User dapat mengklik kata apa pun untuk memperbaiki kesalahan ejaan (misal Whisper salah mengeja nama tokoh lokal).
   * Pengaturan slider *Start Time* dan *End Time* secara visual berbasis potongan teks.
2. **Kolom Tengah (9:16 Canvas Preview):**
   * Pemutar video HTML5 dengan rasio aspek 9:16.
   * Tombol *Toggle Safe Zone Overlay*: Menampilkan garis panduan semi-transparan ikon TikTok/Reels (tombol like, komentar, nama akun di bawah, dan margin atas).
   * Visualisasi subtitle karaoke real-time.
3. **Kolom Kanan (Brand Styling & Outro Control):**
   * **Layout Mode:** Center-Crop 9:16 (Smart Zoom), Box-Blur Background, atau Split-Screen (Podcast/Interview).
   * **Outro / Poster Stitcher:** Checkbox *"Sertakan Poster Wajib Brand di Akhir Video"*, dengan opsi memilih poster dari folder materi dan durasi outro (2–4 detik).
   * **Campaign Hashtag Preview:** Menampilkan daftar hashtag wajib yang otomatis tervalidasi.

---

## 5. Modul Ingestion (YouTube, Google Drive, Direct Upload)

### Script Download Multi-Sumber (`ingestion_service.py`):
```python
import os
import yt_dlp
import gdown

class IngestionService:
    @staticmethod
    def fetch_youtube(url: str, output_dir: str = "./storage/raw") -> dict:
        os.makedirs(output_dir, exist_ok=True)
        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': f'{output_dir}/%(id)s.%(ext)s',
            'writeautomaticsub': True,
            'writesubtitles': True,
            'subtitleslangs': ['id', 'en'],
            'subtitlesformat': 'srt',
            'quiet': False
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_id = info['id']
            video_path = f"{output_dir}/{video_id}.mp4"
            srt_path = f"{output_dir}/{video_id}.id.srt"
            
            return {
                "source_type": "YOUTUBE",
                "source_id": video_id,
                "title": info.get('title', video_id),
                "video_path": video_path,
                "srt_path": srt_path if os.path.exists(srt_path) else None,
                "duration": info.get('duration', 0)
            }

    @staticmethod
    def fetch_gdrive_folder(folder_url: str, output_dir: str = "./storage/raw") -> list[str]:
        os.makedirs(output_dir, exist_ok=True)
        # Mengunduh seluruh materi folder Drive (video trailer, bts, poster)
        downloaded_files = gdown.download_folder(url=folder_url, output=output_dir, quiet=False)
        return downloaded_files
```

---

## 6. Engine AI Curation & Analisis Konsumsi Token (Gemini Flash)

### A. Strategi Optimasi Token
Agar tidak memboroskan token:
1. **Hindari mengirim word-level timestamp ke LLM.** Kirim transkrip dalam format blok kalimat berdurasi 5–10 detik. Word-level timestamp asli tetap disimpan di database untuk kebutuhan subtitle karaoke.
2. **Gunakan Structured Output (`response_schema`).** Memaksa LLM langsung mengeluarkan format JSON murni tanpa kalimat pengantar/penutup basa-basi.
3. **Injeksi Do's & Don'ts Campaign ke System Prompt.** Menghindari kesalahan kurasi sejak awal sehingga tidak perlu regenerasi ulang.

### B. Kalkulasi Biaya Token Riil (Gemini 2.5 Flash)
* Rata-rata percakapan podcast: ~130 kata per menit (~180 token/menit).
* Video 60 Menit: ~11.000 kata ≈ 15.000 input tokens.
* Output JSON (5 rekomendasi klip): ~600 output tokens.
* **Biaya Total:**
  $$\text{Input: } \frac{15.000}{1.000.000} \times \$0.10 = \$0.0015$$
  $$\text{Output: } \frac{600}{1.000.000} \times \$0.40 = \$0.00024$$
  $$\text{Total per Video: } \mathbf{\$0.00174 \ (\approx \text{Rp 27,-})}$$
* **Free Tier Advantage:** Google AI Studio menyediakan kuota gratis hingga 15 Request Per Minute (RPM), cukup untuk memproses puluhan video harian tanpa biaya API.

### C. Implementasi Kurasi AI (`ai_curator.py`):
```python
from google import genai
from pydantic import BaseModel, Field

class SegmentRecommendation(BaseModel):
    start_time: float = Field(description="Waktu mulai klip dalam detik")
    end_time: float = Field(description="Waktu selesai klip dalam detik")
    hook_text: str = Field(description="Kalimat pembuka di 0-3 detik pertama")
    virality_score: int = Field(description="Skor potensi viral (1-100)")
    compliance_reason: str = Field(description="Alasan klip ini patuh terhadap brief brand")

def curate_clips(transcript_summary: str, campaign_brief: dict) -> list[SegmentRecommendation]:
    client = genai.Client()
    
    system_instruction = f"""
    Kamu adalah Supervisi Editor Video Konten.com. Tugasmu memilih 3-5 klip terbaik untuk video vertikal 9:16.
    
    ATURAN KETAT BRIEF BRAND:
    1. Durasi segmen wajib antara {campaign_brief.get('min_duration', 30)} hingga {campaign_brief.get('max_duration', 55)} detik.
    2. Detik 0 hingga 3 WAJIB memiliki Hook kuat (curiosity gap, fakta unik, atau quote inspiratif).
    3. DILARANG KERAS: Memilih bagian yang mengandung kontroversi SARA, politik, hoaks, atau melanggar kesusilaan.
    4. Klip harus memiliki alur utuh (pembuka, inti bahasan, penutup yang tidak terpotong di tengah kata).
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"TRANSKRIP VIDEO:\n{transcript_summary}",
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
            "response_schema": list[SegmentRecommendation],
            "temperature": 0.25,
        }
    )
    return response.parsed
```

---

## 7. Pipeline Pemrosesan Video & Command FFmpeg

Pipeline mengeksekusi tahapan pemrosesan tanpa menurunkan kualitas video mentah:

```text
[Klip Terpilih (Start - End)]
            │
            ▼
[Tahap 1: Silence Removal (auto-editor)]
  Potong jeda hening audio > 0.4s untuk memaksimalkan retensi
            │
            ▼
[Tahap 2: Reframe 9:16 + Smart Crop]
  Pilihan: Center-Crop 1080x1920 atau Boxblur background
            │
            ▼
[Tahap 3: Burning Subtitle Karaoke (.ass)]
  Font bold, border hitam tebal, posisi Safe Zone (35% dari dasar)
            │
            ▼
[Tahap 4: Stitch Outro Poster Wajib (FFmpeg Concat)]
  Tambahkan poster brand 3 detik di akhir dengan crossfade halus
            │
            ▼
[Hasil Final MP4 Siap Submit]
```

### Script & Perintah FFmpeg Utama:

#### 1. Reframe 16:9 ke 9:16 dengan Box-Blur Background
```bash
ffmpeg -i clip_trimmed.mp4 -lavfi \
"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:10[bg]; \
 [0:v]scale=1080:-2[fg]; \
 [bg][fg]overlay=(W-w)/2:(H-h)/2" \
-c:a copy clip_916.mp4
```

#### 2. Reframe 16:9 ke 9:16 Center Crop (Fokus Objek)
```bash
ffmpeg -i clip_trimmed.mp4 -vf \
"scale=ih*9/16:ih:force_original_aspect_ratio=increase,crop=ih*9/16:ih,scale=1080:1920" \
-c:a copy clip_cropped_916.mp4
```

#### 3. Burning Subtitle Safe Zone (.ass Karaoke)
Format subtitle `.ass` memastikan teks tidak tertutup nama profil di bawah (`MarginV=520` pada canvas 1920px):
```ini
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTokKaraoke,Montserrat ExtraBold,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,4,2,2,40,40,520,1
```
Perintah burn subtitle:
```bash
ffmpeg -i clip_916.mp4 -vf "ass=subtitles_safe.ass" -c:a copy clip_subtitled.mp4
```

#### 4. Stitch Outro Poster Brand Wajib (3 Detik di Akhir)
Membuat klip 3 detik dari gambar poster statis, lalu menggabungkannya:
```bash
# 1. Konversi poster statis menjadi video 3 detik 1080x1920 30fps
ffmpeg -loop 1 -i poster_wajib.jpg -c:v libx264 -t 3 -pix_fmt yuv420p -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" outro_poster.mp4

# 2. Concat klip utama + poster outro
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy final_ready_to_upload.mp4
```

---

## 8. Skema Database PostgreSQL

Skema telah disesuaikan untuk mencakup parameter kepatuhan brief brand dan metadata outro:

```sql
-- 1. Master Kampanye Konten.com
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(150) NOT NULL,
    cpm_rate INT NOT NULL,                     -- Misal: Rp 2.000
    min_views_threshold INT DEFAULT 1000,
    min_clip_duration INT DEFAULT 30,          -- Durasi minimal (detik)
    max_clip_duration INT DEFAULT 60,          -- Durasi maksimal (detik)
    required_tags TEXT NOT NULL,               -- "#awalmulahamka #buyahamka"
    caption_template TEXT,                     -- Template caption resmi
    mandatory_outro_required BOOLEAN DEFAULT FALSE,
    mandatory_outro_file_path VARCHAR(500),    -- Path file poster/bumper resmi
    dos_and_donts_rules TEXT,                  -- Pantangan brand untuk panduan AI
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Materi Mentah Video (Source Materials)
CREATE TABLE source_videos (
    id SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES campaigns(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,          -- 'YOUTUBE', 'GDRIVE', 'UPLOAD'
    source_url VARCHAR(500),
    local_file_path VARCHAR(500) NOT NULL,
    duration_seconds INT,
    word_transcript_json JSONB,                -- Word-level timing Whisper
    summary_transcript TEXT,                   -- Chunk transkrip untuk LLM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Klip Hasil Kurasi & Review Editor
CREATE TABLE clips (
    id SERIAL PRIMARY KEY,
    source_video_id INT REFERENCES source_videos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    hook_text TEXT,
    virality_score INT,
    layout_mode VARCHAR(50) DEFAULT 'BLUR_BG', -- 'BLUR_BG', 'CENTER_CROP', 'SPLIT'
    outro_enabled BOOLEAN DEFAULT TRUE,
    custom_transcript_override JSONB,          -- Catatan koreksi typo oleh user
    output_video_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'DRAFT',        -- DRAFT, READY_TO_RENDER, COMPLETED
    submission_url VARCHAR(500),               -- Link post TikTok/Instagram
    verified_views INT DEFAULT 0,
    estimated_earnings DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Desain Antarmuka Frontend (Vite + React + Ant Design)

### Struktur Folder:
```text
frontend/
├── src/
│   ├── api/                     # Axios API endpoints ke FastAPI
│   ├── components/
│   │   ├── SafeZoneMockup.tsx   # SVG overlay mockup UI TikTok/Reels
│   │   ├── VideoPlayer916.tsx   # HTML5 Player 9:16 + real-time caption sync
│   │   ├── TranscriptEditor.tsx # Transkrip kata per kata yang dapat diedit langsung
│   │   ├── OutroSettings.tsx    # Pengaturan poster & bumper outro
│   │   └── SubmissionBar.tsx    # Tombol 1-click salin caption + tags
│   ├── pages/
│   │   ├── CampaignManager.tsx  # Kelola brief brand & file materi
│   │   ├── Studio.tsx           # Workspace utama video editor
│   │   └── Analytics.tsx        # Pantau status submission & views
│   ├── App.tsx
│   └── main.tsx
```

### Fitur Kunci Komponen Studio (`Studio.tsx`):
1. **Interactive Safe Zone Guide:**
   Garis pembatas visual yang menunjukkan area tombol Like/Share (kanan), judul/audio (bawah), dan status bar perangkat (atas) agar editor yakin subtitle berada di posisi aman.
2. **Click-to-Seek & Typo Fix:**
   Setiap kata pada transkrip memiliki event `onClick` yang otomatis melompatkan waktu pemutar video ke detik kata tersebut diucapkan. User cukup mengklik tombol pensil untuk mengoreksi teks sebelum di-burn.
3. **Preset Durasi Cepat:**
   Tombol *pill preset*: `[30s]`, `[45s]`, `[60s]`, `[Sesuai Rekomendasi AI]` yang otomatis mengatur slider durasi klip.

---

## 10. Prosedur Operasional Standar (SOP) Clipper Konten.com

Alur praktis harian clipper untuk memaksimalkan pendapatan:

| Langkah | Aksi Clipper di Studio Editor | Manfaat & Kepatuhan Platform |
| :--- | :--- | :--- |
| **1. Pilih Campaign** | Buka Studio, pilih campaign aktif (misal *Buya Hamka Vol. 3*), salin link materi (Drive/YouTube). | Menggunakan aset resmi dan memuat Do's & Don'ts brand ke sistem. |
| **2. Auto-Generate** | Klik *"Analyze & Curate"*. Tunggu 45 detik hingga sistem memunculkan 3–5 opsi klip ber-hook tajam. | Mengeliminasi proses skimming manual video panjang. |
| **3. Review & Typo QC** | Cek preview 9:16 dengan Safe Zone aktif. Perbaiki salah eja nama tokoh pada transkrip jika ada. | Mencegah penolakan kurasi akibat typo atau teks tertutup UI medsos. |
| **4. Validasi Outro** | Pastikan opsi *"Sertakan Poster Wajib"* aktif (otomatis tertempel di 3 detik terakhir). | 100% patuh pada aturan wajib akhir video brand. |
| **5. Render & Submit** | Klik *"Render MP4"*, download file, lalu klik *"Copy Submission Data"* untuk mendapatkan caption & hashtag resmi. | Siap diupload ke TikTok/Instagram dalam 1 kali aksi. |
| **6. Input Submission** | Setelah upload di TikTok, tempelkan link video ke dashboard Konten.com dan catat di database studio. | Memantau views harian hingga saldo cair ke e-wallet. |

---

## 11. Panduan Setup & Eksekusi

### A. Prasyarat Sistem
* Python 3.10+
* Node.js v18+
* FFmpeg 6.0+ terinstall dan terdaftar di System PATH (wajib mendukung `libass`).
* NVIDIA GPU (opsional, disarankan CUDA untuk akselerasi faster-whisper & NVENC FFmpeg).

### B. Setup Backend:
```bash
# 1. Masuk folder backend
mkdir -p autoclipper-backend && cd autoclipper-backend

# 2. Inisialisasi virtual environment
python -m venv venv
# Aktifkan (Windows):
venv\Scripts\activate

# 3. Install dependencies
pip install fastapi uvicorn yt-dlp gdown faster-whisper auto-editor google-genai psycopg2-binary sqlalchemy pydantic python-multipart

# 4. Set Google Gemini API Key
set GEMINI_API_KEY=AIzaSyYourKeyHere   # Windows CMD
$env:GEMINI_API_KEY="AIzaSyYourKeyHere" # PowerShell

# 5. Jalankan server FastAPI
uvicorn main:app --reload --port 8000
```

### C. Setup Frontend:
```bash
# 1. Buat project Vite React TypeScript
npm create vite@latest autoclipper-frontend -- --template react-ts
cd autoclipper-frontend

# 2. Install library antarmuka & icon
npm install antd @ant-design/icons axios dayjs lucide-react

# 3. Jalankan server frontend
npm run dev
```

---

*Dokumen ini merupakan spesifikasi lengkap yang menggabungkan efisiensi komputasi open-source, optimasi token Gemini Flash, dan pemenuhan 100% aturan kurasi platform Konten.com.*
