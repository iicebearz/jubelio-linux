# Jubelio Chat — Linux

Aplikasi desktop Linux untuk **Jubelio Chat**. Bentuknya adalah *shell* Electron
yang memuat web app resmi `https://chat.jubelio.com` di dalam satu window native.

Ini **bukan port source code**. Installer Windows Jubelio berisi Flutter AOT
(`app.so`) tanpa source Dart, jadi UI-nya tidak bisa di-recompile ke Linux. Build
ini membungkus produk web yang sama ke dalam window desktop.

| | |
|---|---|
| Versi | 1.1.29 |
| Basis | Electron 40 (Chromium + Node.js) |
| Target | Linux x64 |
| Lisensi | GPL-3.0 |
| Release | [GitHub Releases](https://github.com/iicebearz/jubelio-linux/releases) |

---

## Daftar isi

- [Ringkasan teknis](#ringkasan-teknis)
- [Fitur](#fitur)
- [Persyaratan](#persyaratan)
- [Struktur proyek](#struktur-proyek)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Build dan packaging](#build-dan-packaging)
- [Memori dan tab chat](#memori-dan-tab-chat)
- [Integrasi desktop](#integrasi-desktop-opsional)
- [Konfigurasi](#konfigurasi)
- [Cara kerja routing](#cara-kerja-routing)
- [Keamanan](#keamanan)
- [Troubleshooting](#troubleshooting)
- [Lisensi dan atribusi](#lisensi-dan-atribusi)

---

## Ringkasan teknis

### Dibangun dengan apa

- **Electron 40** — runtime Chromium + Node.js. Satu proses main dan satu
  renderer untuk halaman chat.
- **`main.js`** — entry point CommonJS, satu file, tanpa bundler. Mengatur
  window, routing, user agent, izin, context menu, dan kebijakan navigasi.
- **Tanpa preload / IPC kustom.** Renderer tidak diberi akses Node.js
  (`nodeIntegration: false`, `sandbox: true`, `contextIsolation: true`).
- **`build.sh`** — packaging manual: menyalin runtime Electron dan menulis
  `resources/app` berisi `main.js`, ikon, dan `package.json`.
- **`package.sh`** — membuat paket `.deb`, AppImage, `.pkg.tar.zst`, dan
  `.tar.gz` dari hasil `build.sh`.
- Tidak ada framework UI lokal, tidak ada Dart/Flutter, tidak ada source React
  di repo ini.

### UI disusun dari apa

Seluruh tampilan berasal dari web app Jubelio di `https://chat.jubelio.com`
dan di-render oleh Chromium. Berdasarkan inspeksi bundle produksi web app:

| Lapisan | Teknologi |
|---|---|
| UI | React, dibangun dengan Vite (`/assets/index-*.js`) |
| Styling | Tailwind CSS (utility classes, `data-[state=...]` variants) |
| Komponen | Radix UI primitives (tabs, dialog, roving focus, slot) |
| State server | TanStack Query (cache query conversations/messages) |
| State lokal | Zustand, sebagian di-persist ke `localStorage` |

Konsekuensinya:

- Tidak ada file HTML/CSS/JS antarmuka di repositori ini. Perubahan tampilan
  sepenuhnya ditentukan oleh server Jubelio.
- Aplikasi ini hanya mengontrol *container*-nya: ukuran window, navigasi,
  izin, dan perilaku link.
- Tab chat adalah fitur **web app**, bukan tab Electron. State-nya disimpan di
  `localStorage` dengan kunci `chat-tabs`, dibatasi **maksimal 12 tab**, dan
  hanya percakapan aktif yang dirender.

---

## Fitur

- **Langsung ke inbox chat.** Membuka `https://chat.jubelio.com/chat`, bukan
  portal top-up `/ai-credit`. Setelah login, web app yang mendarat di
  `/ai-credit` otomatis diarahkan ke `/chat`.
- **Link Jubelio tetap di dalam app.** URL `https://jubelio.com` dan
  subdomainnya dibuka sebagai window baru di dalam aplikasi. Window turunan
  yang kembali ke `/chat` atau `/` ditutup otomatis setelah 300 ms.
- **Link luar buka browser default.** URL non-Jubelio
  (`http:`, `https:`, `mailto:`) dibuka lewat `shell.openExternal`.
- **Sesi login tersimpan.** Cookie dan storage ada di `~/.config/Jubelio Chat`.
- **Satu instance saja.** Instance kedua memfokuskan window yang sudah ada.
- **Izin web terbatas.** Notifikasi, media, fullscreen, dan
  `clipboard-sanitized-write` diizinkan; sisanya ditolak.
- **Context menu native.** Cut/copy/paste, copy seleksi, dan select all.
- **Wayland native, fallback X11** lewat `ozone-platform-hint=auto`.
- **User agent desktop** mengikuti versi Chrome bawaan Electron.
- **Monitoring memori opsional.** `JUBELIO_MEM_LOG=1` mencatat memori per
  proses tiap 60 detik (default mati).

---

## Persyaratan

- Linux x64 dengan glibc (bukan musl/Alpine).
- **Node.js 22.12+** dan npm untuk build dari source.
- Koneksi internet — seluruh UI berasal dari web app Jubelio.
- Ruang disk ±600 MB untuk `node_modules` dan `dist`, plus ±1,2 GB saat
  membuat keempat paket sekaligus.
- `xdg-open` dan desktop environment untuk link eksternal & integrasi desktop.
- `dpkg-deb` untuk `.deb`, `zstd` untuk `.pkg.tar.zst`, dan `curl` untuk
  mengunduh `appimagetool` saat membuat AppImage.

---

## Struktur proyek

```
jubelio-chat-linux/
├── main.js              # Entry point Electron: window, routing, izin, memori
├── package.json         # Metadata app + script start
├── package-lock.json    # Lock dependency (electron ^40.0.0)
├── build.sh             # Packaging manual ke dist/
├── package.sh           # Build .deb / AppImage / .pkg.tar.zst / .tar.gz
├── build/
│   └── icon.png         # Ikon aplikasi (512 px)
├── dist/                # Hasil build.sh (dihasilkan ulang)
└── node_modules/        # Dependensi (electron)
```

Output paket berada di luar repo: `/home/justbay/Git-repo/JUBELIO_BUILD`.

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
npm start
```

---

## Build dan packaging

```sh
./build.sh     # menghasilkan dist/
./package.sh   # menghasilkan 4 paket di /home/justbay/Git-repo/JUBELIO_BUILD
```

`build.sh` melakukan packaging manual:

1. Membaca versi dari `package.json`.
2. Menghapus `dist/Jubelio Chat-linux-x64` lalu menyalin runtime Electron.
3. Menghapus `resources/default_app.asar`.
4. Menyalin `main.js` dan `build/icon.png` ke `resources/app/`.
5. Menulis `resources/app/package.json`.
6. Mengganti nama binary menjadi `Jubelio Chat`.
7. Menulis `dist/jubelio-chat.desktop`.
8. Memperingatkan jika `chrome-sandbox` butuh SUID root.

`package.sh` menghasilkan:

| Format | Nama file | Cara pasang |
|---|---|---|
| Debian/Ubuntu | `jubelio-chat_<versi>_amd64.deb` | `sudo apt install ./jubelio-chat_<versi>_amd64.deb` |
| AppImage | `Jubelio-Chat-<versi>-x86_64.AppImage` | `chmod +x` lalu jalankan langsung |
| Arch | `jubelio-chat-<versi>-1-x86_64.pkg.tar.zst` | `sudo pacman -U ./jubelio-chat-<versi>-1-x86_64.pkg.tar.zst` |
| Portable | `Jubelio-Chat-<versi>-linux-x64.tar.gz` | ekstrak lalu jalankan `Jubelio Chat` di dalamnya |

Paket `.deb`, AppImage, dan `.pkg.tar.zst` memasang binary ke
`/opt/jubelio-chat`, symlink `/usr/bin/jubelio-chat`, desktop entry, dan ikon
hicolor 512 px. `appimagetool` diunduh otomatis ke
`~/.cache/jubelio-build/` bila belum ada.

Versi mengikuti `package.json`. Untuk menaikkan versi, ubah field `version`,
lalu jalankan ulang `build.sh` dan `package.sh`. Jangan mengedit isi `dist/`
atau paket secara manual.

---

## Memori dan tab chat

Pengukuran langsung dengan `app.getAppMetrics()` memberi gambaran:

- Total ≈ 300 MB PSS untuk seluruh aplikasi (RSS lebih besar karena memory
  shared dihitung per proses).
- Renderer halaman chat ≈ 120–140 MB PSS; main ≈ 72 MB; GPU ≈ 54 MB;
  network ≈ 17 MB; audio ≈ 23 MB.
- Swap yang terpakai aplikasi ≈ 140 MB pada mesin pengujian.

Tab chat **tidak** menambah proses renderer:

- Daftar tab disimpan web app di `localStorage` (`chat-tabs`), maksimal 12.
- Hanya label tab yang dirender untuk tab non-aktif; panel percakapan aktif
  saja yang dipasang.
- Jadi pindah chat tidak membuat 12 window atau 12 renderer Electron.

Untuk memantau:

```sh
JUBELIO_MEM_LOG=1 npm start
```

Atau pada binary hasil build:

```sh
JUBELIO_MEM_LOG=1 "./dist/Jubelio Chat-linux-x64/Jubelio Chat"
```

Baris log berbentuk:

```
[jubelio-mem] 2026-11-21T... [{"pid":123,"type":"Browser","rssMb":204,...},{"type":"Tab",...}]
```

Jumlah entri `type: "Tab"` harus tetap **1** meskipun banyak chat dibuka —
ini membuktikan tab web app berbagi satu renderer. Log default mati agar tidak
mengganggu pemakaian normal.

---

## Integrasi desktop (opsional)

`build.sh` menghasilkan `dist/jubelio-chat.desktop` dengan path absolut ke
binary. Paket `.deb`, AppImage, dan `.pkg.tar.zst` sudah memasang desktop entry
sendiri.

```sh
cp "dist/jubelio-chat.desktop" ~/.local/share/applications/
update-desktop-database ~/.local/share/applications 2>/dev/null || true
```

`StartupWMClass=jubelio-chat` cocok dengan `app.setDesktopName()` di `main.js`.

---

## Konfigurasi

Konfigurasi ada di bagian atas `main.js`:

| Konstanta | Nilai | Fungsi |
|---|---|---|
| `APP_URL` | `https://chat.jubelio.com/chat` | URL saat start & target redirect |
| `ORIGIN` | `https://chat.jubelio.com` | Origin yang dipantau untuk routing |
| `ICON` | `build/icon.png` | Ikon window dan window baru |
| `EXTERNAL_PROTOCOLS` | `http:`, `https:`, `mailto:` | Protokol yang boleh dibuka ke OS |
| `MEMORY_LOG_INTERVAL_MS` | `60000` | Interval logging memori |
| `MEMORY_LOG_ENABLED` | `JUBELIO_MEM_LOG=1` | Mengaktifkan logging memori |

Nilai lain yang tertanam:

- Ukuran window: 1280×820, minimum 940×600.
- Whitelist izin: `notifications`, `media`, `fullscreen`,
  `clipboard-sanitized-write`.
- User agent: `Mozilla/5.0 (X11; Linux x86_64) ... Chrome/<versi Electron>`.
- Web preferences: `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`, `spellcheck: true`.
- Data sesi: `~/.config/Jubelio Chat`.

Untuk memakai environment Jubelio lain, ubah `APP_URL`, `ORIGIN`, dan
`isJubelioUrl()` secara konsisten, lalu build ulang.

---

## Cara kerja routing

Web app Jubelio mendarat di `/ai-credit` setelah login, padahal yang diinginkan
adalah inbox chat. `followChatRoute()` menangani ini:

1. Hanya URL dengan origin `https://chat.jubelio.com` yang diproses.
2. Path `/chat` menandai `onChat = true`.
3. Path `/login` mereset `onChat = false`, sehingga login berikutnya bisa
   diarahkan lagi.
4. Jika belum di `/chat` dan path adalah `/` atau `/ai-credit`, aplikasi
   memuat `APP_URL` sekali.

Handler dipasang pada `did-navigate` dan `did-navigate-in-page`, jadi redirect
juga bekerja untuk navigasi client-side (SPA).

Window turunan dari `window.open` dipantau lewat `did-create-window`. Jika
window tersebut kembali ke `/chat` atau `/`, window ditutup setelah 300 ms
agar tidak menyisakan renderer yang tidak dipakai. Electron 40 sudah menutup
window turunan otomatis saat window induknya ditutup (`outlivesOpener`
default `false`).

---

## Keamanan

- `nodeIntegration` dimatikan dan `sandbox` aktif; halaman web tidak punya
  akses Node.js.
- `contextIsolation` memisahkan world aplikasi dari halaman.
- Tidak ada preload script dan tidak ada IPC kustom.
- Navigasi top-level ke luar domain Jubelio dicegah dan dialihkan ke browser.
- Hanya protokol `http:`, `https:`, dan `mailto:` yang diteruskan ke OS.
- Izin dibatasi whitelist; permintaan lain ditolak.
- Guard navigasi, `window.open`, context menu, dan penutupan child window
  dipasang via `web-contents-created`, berlaku di main window maupun popup.

Web app tetap diperlakukan sebagai boundary kepercayaan: jangan menambahkan
preload atau API Node tanpa kebutuhan yang jelas.

---

## Troubleshooting

**Window putih / halaman gagal dimuat**
Periksa koneksi dan status `https://chat.jubelio.com`. Jalankan binary dari
terminal untuk melihat log Chromium/Electron.

**Tidak bisa login atau sesi rusak**
```sh
rm -rf ~/.config/"Jubelio Chat"
```

**Error `chrome-sandbox` / `SUID sandbox helper`**
```sh
sudo chown root:root "dist/Jubelio Chat-linux-x64/chrome-sandbox"
sudo chmod 4755 "dist/Jubelio Chat-linux-x64/chrome-sandbox"
```
Hindari `--no-sandbox` kecuali terpaksa.

**Log memori tidak muncul**
Pastikan menjalankan dengan `JUBELIO_MEM_LOG=1`. Log hanya aktif jika env var
persis bernilai `1`, dan muncul pertama kali setelah ~2 detik.

**AppImage gagal dijalankan (FUSE tidak tersedia)**
```sh
./Jubelio-Chat-<versi>-x86_64.AppImage --appimage-extract-and-run
```

**Link eksternal tidak terbuka**
Pastikan `xdg-open` terpasang dan ada browser default:
`xdg-settings get default-web-browser`.

**Notifikasi tidak muncul**
Izin sudah diizinkan di Electron; periksa pengaturan notifikasi desktop dan
sisi web.

**Masalah tampilan di Wayland**
Jalankan dengan `--ozone-platform=wayland` atau `--ozone-platform=x11`.

**Mikrofon/kamera tidak berfungsi**
Izin `media` sudah diberikan, tetapi akses perangkat bisa dibatasi
PipeWire/Portal atau pengaturan privasi desktop.

---

## Lisensi dan atribusi

Kode aplikasi dilisensikan **GPL-3.0**; teks lengkap ada di `LICENSE`.
Runtime Electron/Chromium membawa lisensi pihak ketiga; daftar lengkapnya ada
di `dist/Jubelio Chat-linux-x64/LICENSES.chromium.html` dan
`dist/Jubelio Chat-linux-x64/LICENSE`.

Nama, logo, dan konten Jubelio tetap milik Jubelio dan tidak tercakup lisensi
ini.
