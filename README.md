# WA Cuaca Bot (Desktop / VS Code)

Bot WhatsApp berbasis Node.js + Baileys dengan fitur:

- Cek cuaca lokasi (contoh: `!cuaca kec-paloh`)
- Runtime bot (`!runtime`)
- Informasi user yang menjalankan perintah (`!userinfo`)
- Pairing WhatsApp via terminal (akses pairing dikunci kode `12345678`)

## 1) Persiapan

Pastikan sudah install:

- Node.js 18+
- npm
- Visual Studio Code

## 2) Install dependency

```bash
npm install
```

## 3) Jalankan bot

```bash
npm start
```

Saat pertama kali dijalankan:

1. Masukkan kode akses pairing: `12345678`
2. Masukkan nomor WhatsApp kamu (format angka, contoh `6281234567890`)
3. Ambil kode pairing yang tampil di terminal
4. Buka WhatsApp di HP > Linked Devices > Link with phone number > masukkan kode pairing

## 4) Perintah bot

- `!menu` / `!help` → menampilkan bantuan
- `!cuaca <daerah>` → cek cuaca
  - Contoh: `!cuaca kec-paloh`
- `!runtime` → durasi bot aktif
- `!userinfo` → info pengguna yang menjalankan perintah

## Struktur Project

```text
.
├── src
│   ├── index.js
│   ├── services
│   │   └── weather.js
│   └── utils
│       └── format.js
├── package.json
├── .gitignore
└── README.md
```

## Catatan

- Data cuaca memakai API gratis Open-Meteo (tanpa API key).
- Session login WhatsApp disimpan ke folder `auth_info`.
- Kalau logout total, hapus folder `auth_info` lalu pairing ulang.
