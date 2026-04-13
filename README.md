# PUSKESMAS BONTOMANGAPE - Sistem Prediksi Kebutuhan Obat

Aplikasi web fullstack untuk memprediksi kebutuhan stok obat menggunakan AI (Machine Learning) di PUSKESMAS BONTOMANGAPE.

## Fitur

### 1. Dashboard
- Informasi stok obat dengan status (Aman, Perlu Dicek, Harus Ditambah)
- Grafik batang prediksi kebutuhan obat 2 tahun kedepan (8 kuartal)
- Notifikasi jumlah obat per status

### 2. Import Data
- Import data Excel dengan format kolom fleksibel
- Sistem otomatis mendeteksi kolom (nama obat, jumlah, tanggal, dll)
- Preview data sebelum import

### 3. Prediksi AI
- **Linear Regression**: Prediksi berbasis tren linear
- **Moving Average**: Prediksi berbasis rata-rata bergerak
- Visualisasi grafik batang dan garis
- Detail prediksi per kuartal untuk 2 tahun kedepan

### 4. Hapus Data
- Hapus semua data pada akun dengan konfirmasi keamanan
- Data terisolasi antar pengguna

### 5. Multi-User
- Sistem login dengan 2+ akun
- Data setiap pengguna terisolasi (tidak saling terlihat)

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Charts**: Chart.js + react-chartjs-2
- **Machine Learning**: Linear Regression, Moving Average

## Instalasi

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push
```

### 3. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Struktur Folder

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # Authentication
│   │   ├── medicines/         # CRUD Obat
│   │   ├── import/            # Import Excel
│   │   ├── predictions/       # Prediksi AI
│   │   ├── stats/             # Statistik
│   │   └── data/              # Hapus Data
│   ├── dashboard/             # Dashboard Pages
│   │   ├── import/           # Import Data Page
│   │   ├── prediction/       # Prediksi AI Page
│   │   └── delete/           # Hapus Data Page
│   ├── login/                 # Login Page
│   └── layout.tsx            # Root Layout
├── components/                # React Components
├── lib/                       # Utilities
│   ├── prisma.ts             # Prisma Client
│   ├── auth.ts               # Auth Config
│   ├── prediction.ts         # ML Algorithms
│   └── excel-parser.ts       # Excel Parser
├── prisma/
│   └── schema.prisma         # Database Schema
└── ml_prediction.py          # Python ML Script (Optional)
```

## Format Import Excel

Sistem akan otomatis mendeteksi kolom berdasarkan nama header:

| Tipe Data | Header yang Diterima |
|-----------|---------------------|
| Nama Obat | nama, name, nama_obat, medicine, obat |
| Jumlah | jumlah, qty, quantity, stok, stock |
| Tanggal | tanggal, date, tgl, waktu |
| Bulan | bulan, month |
| Tahun | tahun, year |
| Satuan | satuan, unit |

## Environment Variables

Buat file `.env` dengan:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Prediksi AI

### Linear Regression
- Memprediksi nilai berdasarkan tren linear dari data historis
- Cocok untuk data dengan pertumbuhan/penurunan konsisten
- Menampilkan tingkat akurasi (R²)

### Moving Average
- Menghaluskan fluktuasi dengan rata-rata bergerak
- Bagus untuk mendeteksi tren jangka panjang
- Menampilkan arah tren (naik/turun/stabil)

## Keamanan

- Password di-hash menggunakan bcryptjs
- Data antar pengguna terisolasi (multi-tenant)
- Session menggunakan JWT dengan NextAuth.js

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm run db:push    # Push schema to database
npm run db:generate # Generate Prisma client
```

## License

© 2024 PUSKESMAS BONTOMANGAPE. All rights reserved.
