# Jubelio Chat — Linux

Aplikasi desktop Linux untuk **Jubelio Chat**, dibangun sebagai shell
[Electron](https://www.electronjs.org/) yang memuat web app resmi
`https://chat.jubelio.com`.

Ini **bukan port source code**. Installer Windows Jubelio berisi Flutter AOT
(`app.so`) tanpa source Dart, sehingga UI-nya tidak bisa di-recompile ke Linux.
Build ini membungkus produk web yang sama ke dalam window desktop native.

| | |
|---|---|
| Versi | 1.1.28 |
| Basis | Electron 40 (Chromium + Node.js) |
| Target | Linux x64 |
| Lisensi | GPL-3.0 |

---

## Daftar isi

- [Fitur](#fitur)
- [Persyaratan](#persyaratan)
- [Struktur proyek](#struktur-proyek)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Build dari source](#build-dari-source)
- [Integrasi desktop (opsional)](#integrasi-desktop-opsional)
- [Konfigurasi](#konfigurasi)
- [Cara kerja routing](#cara-kerja-routing)
- [Keamanan](#keamanan)
- [Troubleshooting](#troubleshooting)
- [Lisensi dan atribusi](#lisensi-dan-atribusi)

---

## Fitur

- **Langsung ke inbox chat.** Aplikasi membuka `https://chat.jubelio.com/chat`,
  bukan portal top-up `/ai-credit`. Setelah login, web app yang mendarat di
  `/ai-credit` otomatis diarahkan ke `/chat`.
- **Link Jubelio tetap di dalam app.** URL `https://jubelio.com` dan
  subdomainnya dibuka sebagai window baru di dalam aplikasi.
- **Link luar buka browser default.** URL non-Jubelio dengan protokol `http:`,
  `https:`, atau `mailto:` dibuka lewat `shell.openExternal` (butuh `xdg-open`).
- **Sesi login tersimpan.** Cookie dan storage disimpan di
  `~/.config/Jubelio Chat` (Electron `userData`), jadi tidak perlu login ulang
  setiap start.
- **Satu instance saja.** Instance kedua langsung memfokuskan window yang sudah
  berjalan.
- **Izin web yang wajar.** Notifikasi, mikrofon/kamera (`media`), fullscreen,
  dan `clipboard-sanitized-write` diizinkan; izin lain ditolak.
- **Context menu native.** Cut/copy/paste di field teks, copy untuk teks
  terpilih, dan select all.
- **Wayland native, fallback X11.** Switch `ozone-platform-hint=auto` dipasang
  saat startup.
- **User agent desktop.** UA dipaksa mengikuti versi Chrome bawaan Electron,
  agar web app menyajikan tampilan desktop.
- **Menu bar disembunyikan** tetapi menu default tetap aktif, jadi shortcut
  seperti `Ctrl+Q`, `Ctrl+W`, dan DevTools berfungsi. Background putih, ukuran
  awal 1280×820 (minimum 940×600).

---

## Persyaratan

- Linux x64 dengan glibc (bukan musl/Alpine).
- **Node.js 22.12+** dan npm untuk build dari source. Electron 40 membawa
  dependensi yang mensyaratkan Node modern.
- Koneksi internet — seluruh UI berasal dari web app Jubelio.
- Ruang disk sekitar 600 MB untuk `node_modules` (~303 MB) dan `dist` (~289 MB).
- Untuk link eksternal dan integrasi desktop: `xdg-open` dan desktop environment
  yang mendukung `.desktop` entry.

---

## Struktur proyek

```
jubelio-chat-linux/
├── main.js              # Entry point Electron: window, routing, izin, security
├── package.json         # Metadata app + script start
├── package-lock.json    # Lock dependency (electron ^40.0.0)
├── build.sh             # Script packaging manual ke dist/
├── build/
│   └── icon.png         # Ikon aplikasi (512 px)
├── dist/
│   ├── jubelio-chat.desktop       # Entry desktop hasil generate
│   └── Jubelio Chat-linux-x64/    # Hasil build (Electron runtime + app)
│       ├── Jubelio Chat          # Binary utama
│       └── resources/app/        # main.js, package.json, build/icon.png
└── node_modules/        # Dependensi (electron)
```

File yang perlu diedit untuk perubahan aplikasi hanya `main.js` dan
`package.json`; `dist/` selalu dihasilkan ulang oleh `build.sh`.

---

## Menjalankan aplikasi

### Binary hasil build

```sh
"./dist/Jubelio Chat-linux-x64/Jubelio Chat"
```

Tanda kutip diperlukan karena nama binary mengandung spasi.

### Mode development

```sh
npm install
node node_modules/electron/install.js   # npm 12 memblokir postinstall
npm start                                # = electron .
```

`npm install` mengunduh Electron; jika postinstall diblokir oleh kebijakan npm,
jalankan `electron/install.js` secara manual seperti di atas.

---

## Build dari source

```sh
npm install
node node_modules/electron/install.js
./build.sh
```

`build.sh` melakukan packaging manual:

1. Membaca versi dari `package.json`.
2. Menghapus `dist/Jubelio Chat-linux-x64` lalu menyalin seluruh runtime
   `node_modules/electron/dist`.
3. Menghapus `resources/default_app.asar`.
4. Menyalin `main.js` dan `build/icon.png` ke `resources/app/`.
5. Menulis `resources/app/package.json` dengan `name`, `productName`, dan
   `version` dari proyek.
6. Mengganti nama binary `electron` menjadi `Jubelio Chat` dan memberi mode
   executable.
7. Menulis `dist/jubelio-chat.desktop` dengan path absolut binary dan ikon.
8. Memperingatkan jika `chrome-sandbox` butuh SUID root di sistem yang membatasi
   user namespace.

Output: `dist/Jubelio Chat-linux-x64/Jubelio Chat`.

> **Catatan:** `./build.sh` adalah satu-satunya jalur build. Tidak ada script
> `npm run dist`.

### Menaikkan versi

Ubah `version` di `package.json`, lalu jalankan `./build.sh`. Versi di
`resources/app/package.json` dan nama folder output mengikuti otomatis. Jangan
mengedit file di `dist/` secara manual — akan tertimpa.

---

## Integrasi desktop (opsional)

`build.sh` menghasilkan `dist/jubelio-chat.desktop` dengan path absolut ke binary
dan ikon. Pasang ke menu aplikasi:

```sh
cp "dist/jubelio-chat.desktop" ~/.local/share/applications/
update-desktop-database ~/.local/share/applications 2>/dev/null || true
```

`StartupWMClass=jubelio-chat` cocok dengan `app.setDesktopName()` di `main.js`.
Jika repo dipindah, jalankan ulang `./build.sh` dan salin ulang file desktop.

---

## Konfigurasi

Semua konfigurasi ada di bagian atas `main.js`:

| Konstanta | Nilai | Fungsi |
|---|---|---|
| `APP_URL` | `https://chat.jubelio.com/chat` | URL yang dimuat saat start dan target redirect |
| `ORIGIN` | `https://chat.jubelio.com` | Origin yang dipantau untuk routing |
| `ICON` | `build/icon.png` | Ikon window dan window baru |
| `EXTERNAL_PROTOCOLS` | `http:`, `https:`, `mailto:` | Protokol yang boleh dibuka ke OS |

Nilai lain yang tertanam:

- **Ukuran window:** 1280×820, minimum 940×600.
- **Permission whitelist:**
  `notifications`, `media`, `fullscreen`, `clipboard-sanitized-write`.
- **User agent:** `Mozilla/5.0 (X11; Linux x86_64) ... Chrome/<versi Electron>`.
- **Web preferences:** `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`, `spellcheck: true`.
- **Data sesi:** `~/.config/Jubelio Chat`.

Untuk memakai environment Jubelio lain, ubah `APP_URL`, `ORIGIN`, dan
`isJubelioUrl()` secara konsisten, lalu build ulang.

---

## Cara kerja routing

Web app Jubelio selalu mendarat di `/ai-credit` setelah login, padahal yang
diinginkan adalah inbox chat. `followChatRoute()` menangani ini:

1. Hanya URL dengan origin `https://chat.jubelio.com` yang diproses.
2. Path `/chat` menandai `onChat = true`.
3. Path `/login` mereset `onChat = false`, sehingga login berikutnya bisa
   diarahkan lagi.
4. Jika belum di `/chat` dan path adalah `/` atau `/ai-credit`, aplikasi
   memuat `APP_URL` (`/chat`) sekali.

Handler dipasang pada `did-navigate` dan `did-navigate-in-page`, jadi redirect
juga bekerja untuk navigasi client-side (SPA).

---

## Keamanan

- `nodeIntegration` dimatikan dan `sandbox` diaktifkan, sehingga halaman web
  tidak punya akses langsung ke Node.js.
- `contextIsolation` memisahkan preload/world aplikasi dari halaman.
- Tidak ada `preload` script dan tidak ada IPC kustom — permukaan serang kecil.
- Navigasi top-level ke luar domain Jubelio dicegah dan dialihkan ke browser.
  Hanya protokol `http:`, `https:`, dan `mailto:` yang diteruskan ke OS.
- Hanya izin yang masuk whitelist yang diberikan; permintaan lain ditolak.
- `window.open` untuk domain Jubelio dibuka sebagai window Electron; URL lain
  dibuka di browser atau ditolak.
- Guard navigasi, `window.open`, dan context menu dipasang lewat
  `web-contents-created`, jadi berlaku di window utama maupun window popup.

Aplikasi ini memuat konten pihak pertama Jubelio, tetapi tetap perlakukan web app
sebagai boundary kepercayaan: jangan menambahkan `preload` atau API Node tanpa
kebutuhan yang jelas.

---

## Troubleshooting

**Window putih / halaman gagal dimuat**
Periksa koneksi dan status `https://chat.jubelio.com`. Jalankan binary dari
terminal untuk melihat log Chromium/Electron.

**Tidak bisa login atau sesi rusak**
Hapus folder sesi lalu start ulang:

```sh
rm -rf ~/.config/"Jubelio Chat"
```

**Error `chrome-sandbox` / `SUID sandbox helper`**
Binary sandbox harus dimiliki root dan ber-mode SUID. `build.sh` memberi
peringatan jika sistem membatasi user namespace dan sandbox belum SUID. Pada
build lokal:

```sh
sudo chown root:root "dist/Jubelio Chat-linux-x64/chrome-sandbox"
sudo chmod 4755 "dist/Jubelio Chat-linux-x64/chrome-sandbox"
```

Hindari `--no-sandbox` kecuali benar-benar terpaksa.

**Link eksternal tidak terbuka**
Pastikan `xdg-open` terpasang dan ada browser default:
`xdg-settings get default-web-browser`.

**Notifikasi tidak muncul**
Izin notifikasi sudah diizinkan di level Electron; periksa pengaturan notifikasi
desktop dan pastikan sesi tidak memblokirnya di sisi web.

**Masalah tampilan di Wayland**
Aplikasi memakai `ozone-platform-hint=auto`. Untuk memaksa backend, jalankan
dengan `--ozone-platform=wayland` atau `--ozone-platform=x11`.

**Mikrofon/kamera tidak berfungsi**
Izin `media` diizinkan oleh aplikasi, tetapi akses perangkat tetap bisa
dibatasi oleh PipeWire/Portal atau pengaturan privasi desktop.

---

## Lisensi dan atribusi

Kode aplikasi ini dilisensikan **GPL-3.0**; teks lengkap ada di `LICENSE`.
Runtime Electron/Chromium membawa lisensi pihak ketiga; daftar lengkapnya ada di
`dist/Jubelio Chat-linux-x64/LICENSES.chromium.html` dan
`dist/Jubelio Chat-linux-x64/LICENSE`.

Nama, logo, dan konten Jubelio tetap milik Jubelio dan tidak tercakup lisensi
ini.
