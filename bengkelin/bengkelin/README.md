# Bengkelin (mobile web)

Bengkel panggilan on-demand untuk Purwakarta. HTML + CSS + JavaScript murni, tanpa build tool.

## Menjalankan di VS Code
1. Buka folder `bengkelin` di VS Code (File > Open Folder).
2. Install ekstensi **Live Server**, klik kanan `index.html` > *Open with Live Server*.
   (Atau di terminal: `npx serve .` / `python -m http.server 5500`.)
3. Buka di browser, tekan F12 lalu mode perangkat (Ctrl+Shift+M) untuk tampilan HP.

Share location butuh `localhost` atau HTTPS.

## Struktur
- `index.html`  kerangka halaman
- `css/style.css`  tema (variabel warna di `:root`)
- `js/app.js`  semua logika. Edit `MASALAH`, `BENGKEL`, `CENTER`, `MAX_KM` di bagian atas.

## Akun demo
`pelanggan` / `1234` dan `montir` / `1234`. Data tersimpan di localStorage (hapus lewat DevTools > Application untuk reset).

## Ide lanjutan untuk vibe coding
- Hubungkan montir ke bengkel tertentu saat daftar
- Peta Leaflet/OpenStreetMap dengan lingkaran radius 7 km
- Backend (Supabase/Firebase) supaya pesanan real-time antar perangkat
- Daftar ulasan per bengkel (rating sudah ada)
