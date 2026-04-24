# Pelan: Lelaran 0005 - Implementasi Zero Trust Backend & Otomatisasi HTTPS (Infra Hardening)

## Objektif

Mencapai postur **Zero Trust** penuh dengan mengamankan pintu masuk utama (Nginx) menggunakan HTTPS, mengaktifkan rotasi sertifikat otomatis melalui **Step-CA**, dan memastikan Backend Go memvalidasi identitas secara kriptografis menggunakan **Signed JWT (ID Token)** dari Oathkeeper.

---

## 1. Audit Awal (Instruksi untuk AI Pelaksana)

*Sebelum memulakan tugas, pastikan anda menyemak perkara berikut dalam repositori:*

- [ ] **Docker Network**: Pastikan semua perkhidmatan berada dalam `ory-network`.
- [ ] **Config Path**: Kenal pasti lokasi folder `./contrib/config/oathkeeper/` dan `./contrib/nginx/`.
- [ ] **Port Check**: Pastikan port `443` belum digunakan oleh perkhidmatan lain pada hos.
- [ ] **Go Dependencies**: Pastikan fail `go.mod` tersedia untuk menambah library JWT validation.

---

## 2. Proposed Tasks

### Fasa A: Otomatisasi PKI dengan Step-CA (Infrastructure)

**Matlamat**: Menjalankan server CA internal untuk menjana dan merotasi sertifikat secara automatik.

1. **Tambah Perkhidmatan `vault-ca`**: Sertakan service `smallstep/step-ca` dalam `docker-compose.yaml`.
2. **Tambah Cert-Rotator Sidecar**: Gunakan imej `smallstep/step-cli` sebagai sidecar untuk Nginx.
    - **Mechanics**: Sidecar ini akan memanggil `step ca certificate` setiap kali dijalankan atau secara berkala untuk merotasi sertifikat di volume kongsi (`shared-certs`).
3. **Shared Volume**: Pastikan volume `shared-certs` di-mount ke `vault-gateway` (Nginx) dan `vault-ca-rotator`.

### Fasa B: Hardening Nginx Reverse Proxy (HTTPS)

**Matlamat**: Mengaktifkan TLS pada pintu masuk utama.

1. **Kemaskini `nginx/default.conf`**:
    - Ubah `listen 80` kepada `listen 443 ssl`.
    - Tambah arahan `ssl_certificate` dan `ssl_certificate_key` menunjuk ke folder certs yang dijana Step-CA.
    - Tambah server block untuk redirect HTTP (80) ke HTTPS (443).
2. **Inject Headers**: Pastikan Nginx meneruskan header `Authorization` dan `Host` dengan tepat ke Oathkeeper.

### Fasa C: Konfigurasi Oathkeeper ID_TOKEN (Security)

**Matlamat**: Mengubah Oathkeeper supaya menghantar JWT yang ditandatangani (signed) ke backend.

1. **Jana Signing Keys**: Gunakan `step crypto jwk create` untuk menghasilkan pasangan kunci RSA/ECDSA bagi Oathkeeper.
2. **Kemaskini `oathkeeper.yaml`**:
    - Tukar `mutator` daripada `header` kepada `id_token`.
    - Konfigurasi `issuer_url` dan `jwks_url` (menunjuk ke fail kunci tadi).
3. **Kemaskini `rules.yaml`**: Pastikan rute backend menggunakan mutator `id_token`.

### Fasa D: Middleware Zero Trust di Go Backend (Backend)

**Matlamat**: Backend menuntut bukti kriptografis sebelum memproses request.

1. **Implementasi JWT Middleware**:
    - Gunakan library `github.com/MicahParks/keyfunc` untuk mengambil public keys dari endpoint JWKS Oathkeeper secara dinamik.
    - Validasi tanda tangan JWT, `exp` (expiry), dan `iss` (issuer).
    - Ekstrak `sub` (UserID) dan masukkan ke dalam `context.Context`.
2. **Hardening Endpoint**: Pastikan fungsi `main.go` membungkus semua rute API dengan middleware ini.

---

## 3. Implementation Sequence (Step-by-Step)

1. **Langkah 1**: Pasang dan konfigurasi `vault-ca` dalam Docker Compose. Ambil fingerprint CA.
2. **Langkah 2**: Setup sidecar `vault-ca-rotator` untuk menjana certs bagi domain `api.ory-vault.test` dan `ory-vault.test`.
3. **Langkah 3**: Konfigurasi Nginx untuk membaca certs tersebut dan aktifkan SSL.
4. **Langkah 4**: Ubah mutator Oathkeeper kepada `id_token` dan mount fail JWK.
5. **Langkah 5**: Tambah kod middleware di Backend Go dan kemaskini perkhidmatan.
6. **Langkah 6**: Jalankan `docker compose up -d --build`.

---

## 4. Validation Strategy (Ujian Pengesahan)

1. **HTTPS Handshake**:
    - Jalankan `curl -kI https://api.ory-vault.test/health`.
    - **Hasil**: Harus mendapat `HTTP 200 OK` melalui port 443 dengan sertifikat yang dikeluarkan oleh "OryVaultCA".
2. **JWT Verification**:
    - Perhatikan log Backend Go semasa membuat panggilan protected API.
    - **Hasil**: Log harus menunjukkan subjek user yang berjaya didekod daripada JWT.
3. **Bypass Attempt (Crucial)**:
    - Cuba hantar header `X-User-Id` palsu terus ke backend (bypass Nginx/Oathkeeper).
    - **Hasil**: Backend **MESTI** menolak dengan `401 Unauthorized` kerana tiada JWT yang sah.
4. **Rotation Check**:
    - Jalankan `docker compose restart vault-ca-rotator`. Semak timestamp fail cert di folder volume.
    - **Hasil**: Fail sertifikat baru harus tercipta secara automatik.

---

## 5. Failure Modes & Risks (Bluntruth)

- **Circular Dependency**: Jika `vault-ca` lambat untuk *healthy*, Nginx mungkin gagal bermula kerana fail sertifikat belum wujud.
  - *Mitigasi*: Gunakan `restart: on-failure` dan pastikan sidecar bermula sebelum Nginx.
- **Clock Skew**: Jika masa antara hos Windows dan container Docker tidak sekata, validasi JWT akan gagal (`Token used before issued` atau `Token expired`).
  - *Mitigasi*: Pastikan sinkronisasi masa aktif di WSL2/Docker Desktop.
- **JWKS Access**: Backend Go mesti dapat mencapai port `4456` Oathkeeper melalui network internal Docker.

**Instruksi Akhir**: "Model Murah" yang melaksanakan pelan ini dilarang keras menukar port `443` atau `80` tanpa persetujuan, dan dilarang mematikan flag `withCredentials: true` di frontend.
