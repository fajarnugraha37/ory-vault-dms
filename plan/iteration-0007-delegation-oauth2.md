# Pelan: Lelaran 0007 - Delegasi & Integrasi Pihak Ketiga (Ory Hydra) - FINAL

## 1. Objektif
Mengimplementasikan delegasi akses menggunakan Ory Hydra untuk mengizinkan aplikasi pihak ketiga (Web/Mobile) maupun integrasi server-to-server (Script/Bot) mengakses DMS secara aman menggunakan protokol OAuth2.

## 2. Arsitektur & Keputusan Teknis
- **Login & Consent Bridge**: Go Backend bertindak sebagai wrapper aman untuk Hydra Admin API. Frontend Next.js memanggil Backend, bukan Hydra Admin langsung.
- **Dual-Auth Strategy (Oathkeeper)**: Satu rule API mendukung `cookie_session` (UI) dan `oauth2_introspection` (Third-party).
- **Scope Enforcement**: Middleware Go memvalidasi scope `nodes.read`, `nodes.write`, dan `nodes.share` dari JWT claims.
- **Client Management**: Implementasi Self-Service UI agar user bisa mendaftarkan aplikasi mereka sendiri. Data kepemilikan dicatat di tabel `app.oauth2_clients`.
- **Subject Mapping**: Untuk *Client Credentials Flow*, middleware akan memetakan `client_id` ke `owner_id` (pendaftar aplikasi) agar pengecekan Keto tetap berfungsi.

## 3. Langkah Implementasi

### A. Infrastruktur & Database
- [ ] **SQL**: Buat tabel `app.oauth2_clients` (id, client_id, owner_id, created_at).
- [ ] **Docker**: Daftarkan `HYDRA_ADMIN_URL` di `vault-backend` dan `vault-ui`.
- [ ] **Hydra Config**: Set `urls.login` dan `urls.consent` ke endpoint UI kita.

### B. Backend Bridge (Go)
- [ ] Implementasi `POST /api/oauth2/login/accept`: Menerima `login_challenge`, validasi session Kratos, panggil Hydra `acceptLoginRequest`.
- [ ] Implementasi `GET /api/oauth2/consent`: Menerima `consent_challenge`, panggil Hydra `getConsentRequest` untuk ambil info client/scopes.
- [ ] Implementasi `POST /api/oauth2/consent/accept`: Kirim persetujuan user ke Hydra.
- [ ] Implementasi `POST /api/nodes/clients`: Endpoint untuk mendaftarkan OAuth2 Client baru ke Hydra sekaligus mencatat di DB kita.

### C. Frontend (Next.js)
- [ ] **Client Registration UI**: Halaman untuk user mengelola aplikasi mereka (Create/List/Delete OAuth2 Client).
- [ ] **Login Bridge**: Logika di `/auth/login` untuk meneruskan flow ke Hydra jika ada `login_challenge`.
- [ ] **Consent Page (`/auth/consent`)**: UI untuk menampilkan permintaan izin akses pihak ketiga.

### D. Security & Oathkeeper
- [ ] Konfigurasi `oauth2_introspection` di `oathkeeper.yaml`.
- [ ] Update `rules.yaml` agar rule API memiliki dua authenticator.
- [ ] **Scope Middleware**: Buat middleware di Go untuk validasi scope berdasarkan HTTP Method.

## 4. Mekanisme Testing

### Test Flow 1: Authorization Code (Aplikasi Web/Interaktif)
1. **Initiate**: Gunakan browser untuk membuka:
   `https://auth.ory-vault.test/oauth2/auth?client_id=<CLIENT_ID>&response_type=code&scope=nodes.read&redirect_uri=<CALLBACK>`
2. **Login**: Harus di-redirect ke login page kita -> Login via Kratos.
3. **Consent**: Harus muncul halaman persetujuan -> Klik "Allow".
4. **Exchange**: Ambil `code` dari URL callback, lalu tukar ke token via `curl` ke Hydra `/oauth2/token`.
5. **Access**: Panggil `GET /api/nodes` menggunakan `Authorization: Bearer <token>`.
6. **Verify**: Harus return data file milik user tersebut.

### Test Flow 2: Client Credentials (Integrasi Script/Bot)
1. **Request Token**: Panggil Hydra `/oauth2/token` langsung menggunakan `client_id` & `client_secret` (tanpa interaksi user).
   `scope` yang diminta: `nodes.read nodes.write`.
2. **Access (Success)**: Panggil `POST /api/nodes` (Create Folder) menggunakan token tersebut.
3. **Verify owner**: Cek di DB, folder yang dibuat harus memiliki `owner_id` yang sesuai dengan user yang mendaftarkan aplikasi tersebut.
4. **Access (Forbidden)**: Coba hapus file orang lain menggunakan token bot tersebut -> Harus return **403 Forbidden** (Keto check).

## 5. Status: READY TO EXECUTE
Semua keputusan arsitektur sudah final. Saya siap memulai dari **Task A: Infrastruktur & Database**.
