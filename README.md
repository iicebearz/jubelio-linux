# Jubelio Chat for Linux

Jubelio Chat versi desktop untuk Linux. Proyek ini membungkus web app resmi [Jubelio Chat](https://chat.jubelio.com) menggunakan Electron, jadi kamu bisa menjalankannya sebagai aplikasi desktop tanpa harus membuka chat lewat browser.

Ini bukan port dari aplikasi Windows Jubelio. Installer Windows menggunakan Flutter AOT (`app.so`) dan tidak menyertakan source Dart yang bisa digunakan untuk membangun ulang UI di Linux. Karena itu, aplikasi ini menggunakan web app Jubelio yang sama, lalu menyediakan desktop window, routing, dan integrasi Linux di sekelilingnya.

## Info aplikasi

| | |
|---|---|
| Versi | 1.1.29 |
| Runtime | Electron 40 |
| Target | Linux x64 |
| Lisensi | GPL-3.0 |
| Download | [GitHub Releases](https://github.com/iicebearz/jubelio-linux/releases) |

## Fitur

- Membuka langsung halaman chat (`/chat`), bukan halaman AI Credit.
- Mengarahkan kembali ke inbox chat setelah login jika web app masuk ke `/` atau `/ai-credit`.
- Membuka link Jubelio di window aplikasi, sementara link di luar Jubelio diteruskan ke browser default.
- Menyimpan sesi login, cookie, dan web storage di `~/.config/Jubelio Chat`.
- Single-instance: saat aplikasi dibuka lagi, window yang sudah berjalan akan difokuskan.
- Izin web dibatasi untuk notifikasi, media, fullscreen, dan penulisan clipboard yang disanitasi.
- Context menu native untuk cut, copy, paste, copy selection, dan select all.
- Dukungan Wayland dengan fallback X11.
- Logging penggunaan memori opsional.

## Teknologi dan cara kerja

Aplikasi ini menggunakan Electron 40 (Chromium dan Node.js). Entry point-nya adalah `main.js`, file CommonJS sederhana tanpa bundler. File tersebut menangani window, routing, user agent, izin, context menu, dan aturan navigasi.

Tidak ada UI lokal yang dibuat ulang di repo ini. Tampilan chat berasal dari web app Jubelio dan dirender oleh Chromium. Berdasarkan inspeksi bundle web app, UI-nya menggunakan React, Vite, Tailwind CSS, Radix UI, TanStack Query, dan Zustand.

| Bagian | Teknologi |
|---|---|
| UI web | React + Vite |
| Styling | Tailwind CSS |
| Komponen | Radix UI |
| Data server | TanStack Query |
| State lokal | Zustand, sebagian disimpan di `localStorage` |
| Desktop wrapper | Electron 40 |

Dengan pendekatan ini, repo hanya mengelola desktop wrapper: ukuran window, navigasi, izin, dan perilaku link. Perubahan UI utama tetap mengikuti web app Jubelio.

Tab chat juga merupakan fitur web app, bukan tab Electron. Daftarnya disimpan di `localStorage` dengan key `chat-tabs`, maksimal 12 tab. Hanya percakapan yang sedang aktif yang dirender.

## Persyaratan

- Linux x64 dengan glibc (musl/Alpine tidak didukung).
- Node.js 22.12+ dan npm, jika ingin build dari source.
- Koneksi internet, karena UI diambil dari web app Jubelio.
- Sekitar 600 MB ruang disk untuk `node_modules` dan `dist`; sekitar 1,2 GB jika membuat seluruh paket sekaligus.
- `xdg-open` dan desktop environment untuk membuka link eksternal dan integrasi desktop.
- `dpkg-deb` untuk paket `.deb`, `zstd` untuk `.pkg.tar.zst`, dan `curl` untuk mengunduh `appimagetool` saat membuat AppImage.

## Struktur proyek

```text
jubelio-chat-linux/
├── main.js              # Electron entry point
├── package.json         # Metadata dan script aplikasi
├── package-lock.json    # Lock dependency (Electron ^40.0.0)
├── build.sh            # Membuat build ke dist/
├── package.sh          # Membuat paket distribusi
├── build/
│   └── icon.png       # Ikon aplikasi (512 px)
├── dist/               # Output build (dibuat ulang)
└── node_modules/       # Dependency Electron
```

## Menjalankan aplikasi

### Menjalankan binary hasil build

```sh
"./dist/Jubelio Chat-linux-x64/Jubelio Chat"
```

Gunakan tanda kutip karena nama binary mengandung spasi.

### Menjalankan dari source

```sh
npm install
node node_modules/electron/install.js
npm start
```

Langkah `electron/install.js` diperlukan pada setup npm 12 yang memblokir postinstall Electron.

## Build dan packaging

Untuk membuat build dan paket distribusi:

```sh
./build.sh
./package.sh
```

`build.sh` membuat folder `dist/` dengan cara menyalin runtime Electron, memasukkan `main.js`, ikon, dan metadata aplikasi, lalu menyiapkan desktop entry. Script ini juga memberi peringatan jika `chrome-sandbox` membutuhkan pengaturan SUID root.

`package.sh` membuat empat format paket:

| Format | File | Instalasi / penggunaan |
|---|---|---|
| Debian/Ubuntu | `jubelio-chat_<versi>_amd64.deb` | `sudo apt install ./jubelio-chat_<versi>_amd64.deb` |
| AppImage | `Jubelio-Chat-<versi>-x86_64.AppImage` | `chmod +x`, lalu jalankan |
| Arch Linux | `jubelio-chat-<versi>-1-x86_64.pkg.tar.zst` | `sudo pacman -U ./jubelio-chat-<versi>-1-x86_64.pkg.tar.zst` |
| Portable | `Jubelio-Chat-<versi>-linux-x64.tar.gz` | Ekstrak dan jalankan binary `Jubelio Chat` |

Paket `.deb`, AppImage, dan `.pkg.tar.zst` memasang aplikasi ke `/opt/jubelio-chat`, membuat symlink `/usr/bin/jubelio-chat`, desktop entry, serta ikon hicolor 512 px. Jika `appimagetool` belum tersedia, script akan mengunduhnya ke `~/.cache/jubelio-build/`.

Versi aplikasi mengikuti `package.json`. Untuk merilis versi baru, ubah nilai `version`, lalu jalankan ulang build dan packaging. Hindari mengedit isi `dist/` atau paket hasil build secara manual.

## Tab chat dan penggunaan memori

Pengukuran menggunakan `app.getAppMetrics()` pada mesin pengujian menunjukkan penggunaan sekitar 300 MB PSS untuk keseluruhan aplikasi. Angka ini dapat berbeda tergantung sistem, sesi, dan aktivitas chat.

Perkiraan saat pengujian:

- Renderer chat: 120–140 MB PSS
- Main process: sekitar 72 MB
- GPU process: sekitar 54 MB
- Network process: sekitar 17 MB
- Audio process: sekitar 23 MB
- Swap yang digunakan aplikasi: sekitar 140 MB

Membuka beberapa tab chat tidak membuat aplikasi menjalankan banyak renderer. Tab disimpan oleh web app di `localStorage`, maksimal 12 tab, dan hanya panel percakapan aktif yang dipasang. Jadi, berpindah chat tidak berarti membuat 12 window atau 12 renderer Electron.

Logging memori bisa diaktifkan saat menjalankan aplikasi:

```sh
JUBELIO_MEM_LOG=1 npm start
```

Atau untuk binary hasil build:

```sh
JUBELIO_MEM_LOG=1 "./dist/Jubelio Chat-linux-x64/Jubelio Chat"
```

Log ditulis setiap 60 detik dan mencakup informasi proses, misalnya:

```text
[jubelio-mem] 2026-11-21T... [{"pid":123,"type":"Browser","rssMb":204,...},{"type":"Tab",...}]
```

Dalam penggunaan normal, logging ini dimatikan. Saat logging aktif, jumlah proses `Tab` diharapkan tetap satu meskipun kamu membuka beberapa chat.

## Integrasi desktop (opsional)

`build.sh` membuat desktop entry di `dist/jubelio-chat.desktop`. Paket `.deb`, AppImage, dan `.pkg.tar.zst` sudah menyertakan desktop entry masing-masing.

Jika ingin memasang desktop entry dari build lokal:

```sh
cp "dist/jubelio-chat.desktop" ~/.local/share/applications/
update-desktop-database ~/.local/share/applications 2>/dev/null || true
```

`StartupWMClass=jubelio-chat` disesuaikan dengan `app.setDesktopName()` di `main.js`.

## Konfigurasi

Konfigurasi utama berada di bagian atas `main.js`.

| Konstanta | Nilai | Keterangan |
|---|---|---|
| `APP_URL` | `https://chat.jubelio.com/chat` | URL awal dan target redirect |
| `ORIGIN` | `https://chat.jubelio.com` | Origin yang digunakan untuk routing |
| `ICON` | `build/icon.png` | Ikon window dan window baru |
| `EXTERNAL_PROTOCOLS` | `http:`, `https:`, `mailto:` | Protokol yang boleh dibuka melalui OS |
| `MEMORY_LOG_INTERVAL_MS` | `60000` | Interval logging memori |
| `MEMORY_LOG_ENABLED` | `JUBELIO_MEM_LOG=1` | Mengaktifkan logging memori |

Pengaturan lainnya:

- Ukuran window awal 1280×820, minimum 940×600.
- Izin yang diizinkan: `notifications`, `media`, `fullscreen`, dan `clipboard-sanitized-write`.
- User agent desktop menggunakan versi Chrome bawaan Electron.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, dan `spellcheck: true`.
- Data sesi disimpan di `~/.config/Jubelio Chat`.

Jika ingin menggunakan environment Jubelio lain, sesuaikan `APP_URL`, `ORIGIN`, dan `isJubelioUrl()` secara konsisten, lalu build ulang.

## Routing

Setelah login, web app Jubelio terkadang masuk ke `/ai-credit`, sementara aplikasi ini ditujukan untuk inbox chat. `followChatRoute()` memastikan halaman kembali ke `/chat`.

Secara garis besar:

1. Routing hanya memproses URL dari `https://chat.jubelio.com`.
2. Saat path `/chat` terbuka, status chat dianggap aktif.
3. Path `/login` mereset status tersebut agar redirect setelah login bisa berjalan lagi.
4. Jika halaman masih berada di `/` atau `/ai-credit`, aplikasi akan membuka `APP_URL` satu kali.

Handler dipasang pada `did-navigate` dan `did-navigate-in-page`, sehingga navigasi dan redirect dari SPA ikut ditangani.

Window yang dibuat melalui `window.open` juga dipantau. Jika window tersebut kembali ke `/chat` atau `/`, window akan ditutup setelah 300 ms agar tidak meninggalkan renderer yang tidak dibutuhkan. Pada Electron 40, child window juga akan ditutup ketika window induk ditutup (default `outlivesOpener: false`).

## Keamanan

Pengaturan keamanan Electron yang digunakan:

- `nodeIntegration` dimatikan dan sandbox aktif, sehingga halaman web tidak memiliki akses Node.js.
- `contextIsolation` memisahkan konteks aplikasi dan halaman.
- Tidak menggunakan preload script maupun IPC kustom.
- Navigasi top-level keluar dari domain Jubelio dicegah dan link eksternal dialihkan ke browser.
- Hanya protokol `http:`, `https:`, dan `mailto:` yang diteruskan ke OS.
- Izin web menggunakan whitelist; permintaan lainnya ditolak.
- Guard navigasi, `window.open`, context menu, dan penanganan child window diterapkan melalui `web-contents-created`, termasuk pada popup.

Web app Jubelio tetap menjadi batas kepercayaan utama. Preload atau API Node sebaiknya tidak ditambahkan tanpa kebutuhan yang jelas.

## Troubleshooting

**Window putih atau halaman tidak termuat**  
Periksa koneksi internet dan status [chat.jubelio.com](https://chat.jubelio.com). Jalankan binary dari terminal untuk melihat log Electron/Chromium.

**Login gagal atau sesi bermasalah**  
Hapus data sesi untuk memulai ulang login:

```sh
rm -rf ~/.config/"Jubelio Chat"
```

**Error `chrome-sandbox` / `SUID sandbox helper`**

```sh
sudo chown root:root "dist/Jubelio Chat-linux-x64/chrome-sandbox"
sudo chmod 4755 "dist/Jubelio Chat-linux-x64/chrome-sandbox"
```

Hindari menggunakan `--no-sandbox` kecuali benar-benar terpaksa.

**Log memori tidak muncul**  
Pastikan aplikasi dijalankan dengan `JUBELIO_MEM_LOG=1`. Logging hanya aktif jika nilai environment variable tepat `1`. Log pertama biasanya muncul setelah sekitar dua detik.

**AppImage gagal karena FUSE tidak tersedia**

```sh
./Jubelio-Chat-<versi>-x86_64.AppImage --appimage-extract-and-run
```

**Link eksternal tidak terbuka**  
Pastikan `xdg-open` tersedia dan browser default sudah disetel:

```sh
xdg-settings get default-web-browser
```

**Notifikasi tidak muncul**  
Izin notifikasi sudah disediakan oleh Electron. Periksa pengaturan notifikasi desktop dan pengaturan dari sisi web app.

**Tampilan bermasalah di Wayland**  
Coba jalankan dengan salah satu opsi berikut:

```sh
--ozone-platform=wayland
--ozone-platform=x11
```

**Mikrofon atau kamera tidak berfungsi**  
Izin `media` sudah diberikan, tetapi akses perangkat masih bisa dipengaruhi oleh PipeWire/Portal atau pengaturan privasi desktop.

## Lisensi dan atribusi

Kode aplikasi ini menggunakan lisensi **GPL-3.0**. Teks lisensi tersedia di `LICENSE`.

Electron dan Chromium menyertakan lisensi pihak ketiga. Daftar lisensinya tersedia di:

- `dist/Jubelio Chat-linux-x64/LICENSES.chromium.html`
- `dist/Jubelio Chat-linux-x64/LICENSE`

Nama, logo, dan konten Jubelio tetap merupakan milik Jubelio dan tidak termasuk dalam lisensi proyek ini.
