# Iteration 0005: Zero Trust Implementation (Detailed Plan)

## 1. Goal
Mencapai postur Zero Trust dengan mengaktifkan HTTPS pada Gateway (Nginx) dan memperkenalkan Signed JWT (ID Token) dari Oathkeeper ke Backend dengan verifikasi kriptografis dinamis.

## 2. Phase 1: Gateway HTTPS [DONE]
- [x] Tambahkan sidecar `vault-gateway-certs` di `docker-compose.yaml` untuk men-generate sertifikat domain multi-SAN.
- [x] Update `docker-compose.yaml` untuk mengekspos port 443 pada `vault-gateway`.
- [x] Update `contrib/nginx/default.conf` untuk mendukung SSL dan redirect HTTP ke HTTPS.
- [x] **Global Protocol Update**: Sinkronisasi seluruh URL ke `https://` di Frontend, Config, dan Dokumentasi.
- [x] **Permission Fix**: Perbaikan izin akses file sertifikat (`chmod 755/644`) melalui container sidecar.

## 3. Phase 2: Oathkeeper ID Token & JWKS [DONE]
- [x] Generate RSA key pair (JWKS) menggunakan `step-cli` di `./contrib/config/oathkeeper/jwks.json`.
- [x] Update `oathkeeper.yaml` untuk mengaktifkan mutator `id_token` dengan `issuer_url` dan `jwks_url`.
- [x] Update `rules.yaml` untuk beralih dari mutator `header` ke `id_token` pada seluruh rute API.
- [x] **Dynamic Exposure**: Oathkeeper mengekspos JWKS secara dinamis di port `4456`.

## 4. Phase 3: Go Backend JWT Validation [DONE]
- [x] Tambahkan library `github.com/MicahParks/keyfunc/v3` dan `github.com/golang-jwt/jwt/v5`.
- [x] **Dynamic JWKS Fetching**: Implementasi middleware yang menarik public keys secara otomatis dari Oathkeeper via network dengan background refresh (setiap 10 menit).
- [x] **Cryptographic Guard**: Backend sekarang menolak request tanpa JWT valid atau signature yang tidak cocok.
- [x] **Context Injection**: ID User diekstrak dari klaim `sub` JWT dan dimasukkan ke dalam Go `context.Context`.

## 5. Validation Results
- [x] **HTTPS Handshake**: Verified via browser & curl (OryVaultCA trusted).
- [x] **Protocol Consistency**: Mixed Content & CSRF mismatch resolved.
- [x] **JWT Integrity**: Backend menolak manipulasi header `X-User-Id` manual.
- [x] **Dynamic Update**: Backend tidak butuh restart jika signing keys di Oathkeeper dirotasi.

---

## 6. Retrospective & Issue Log (Iteration 0005)

### Issue 1: Mixed Content Error
- **Root Cause**: Frontend (Next.js) memuat halaman via HTTPS tetapi melakukan API call ke Kratos menggunakan URL `http://`.
- **Resolution**: Update `dms-ui/src/lib/ory.ts` dan `dms-ui/src/app/page.tsx` untuk menggunakan `https://`.
- **Lesson Learned**: Perubahan protokol Gateway wajib diikuti dengan audit total pada level SDK/Client.

### Issue 2: Persistent Permission Denied pada Root CA
- **Root Cause**: User `ory` di dalam container Oathkeeper tidak memiliki izin baca pada file sertifikat yang di-mount dari Windows (UID/GID mismatch).
- **Resolution**: Menjalankan "Permissions Fixer" sidecar menggunakan alpine untuk melakukan `chmod -R 755/644` pada folder config.
- **Lesson Learned**: Pada environment Windows-Docker, izin file Linux seringkali tidak terpeta dengan benar; otomasi `chmod` di sidecar adalah solusi paling handal.

### Issue 3: Syntax Error pada Keyfunc v3
- **Root Cause**: Mencoba menggunakan opsi konfigurasi `keyfunc` versi lama pada library `v3` yang memiliki struktur berbeda.
- **Resolution**: Refactor `main.go` menggunakan `keyfunc.NewDefault` yang lebih sederhana dan idiomatik untuk versi 3.
- **Lesson Learned**: Selalu periksa dokumentasi versi spesifik library Go (`/v3`) sebelum implementasi.

### Issue 4: Kratos Configuration Schema (v1.1)
- **Root Cause**: Menaruh `trusted_proxies` di bawah `serve.public` menyebabkan crash karena pelanggaran skema YAML.
- **Resolution**: Memindahkan konfigurasi ke Environment Variable `SERVE_TRUSTED_PROXIES`.
- **Lesson Learned**: Environment variables lebih tangguh terhadap perubahan skema YAML minor di stack Ory.

### Issue 5: Oathkeeper 404 Rule Mismatch (Scheme Mismatch)
- **Root Cause**: Oathkeeper menerima traffic HTTP dari Nginx tetapi rule menggunakan `https://`, menyebabkan 404 karena skema tidak cocok.
- **Resolution**: Aktifkan `serve.proxy.trust_forwarded_headers: true` di `oathkeeper.yaml`.
- **Lesson Learned**: Saat di belakang reverse proxy SSL, Oathkeeper wajib dikonfigurasi untuk mempercayai header `X-Forwarded-*`.

### Issue 6: Kratos 500 Error pada Registrasi (Timeout)
- **Root Cause**: Password validator `haveibeenpwned` mencoba memanggil API eksternal dan mengalami timeout.
- **Resolution**: Menonaktifkan `haveibeenpwned_enabled` di `kratos.yaml`.
- **Lesson Learned**: Matikan pengecekan eksternal yang memblokir flow di environment lab/dev.
