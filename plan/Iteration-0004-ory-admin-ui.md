# Pelan: Lelaran 0004 - Zero Trust Admin API & Dashboard (Identity Management)

## Objektif

Membangun kapabilitas manajemen identitas (Admin UI) yang 100% mematuhi prinsip **Zero Trust**. Daripada menggunakan *image* pihak ketiga yang langsung menembak API Admin Kratos (sehingga kehilangan jejak audit dan *access control*), kita akan membangun **Admin API Wrapper** di Go Backend dan antarmuka di Next.js.

Pendekatan ini memastikan semua tindakan admin melewati Oathkeeper (JWT), divalidasi oleh Go Backend (Audit/Authz), sebelum diteruskan secara internal ke Kratos Admin API.

---

## 1. Pre-flight: Repository & Integrity Audit

*Instruksi untuk AI Pelaksana: Pastikan kondisi berikut terpenuhi sebelum memodifikasi file.*

- [ ] **Kratos Admin Endpoint**: Pastikan `vault-kratos` mengekspos port admin (default: `4434`) HANYA di dalam network docker `ory-network`.
- [ ] **Oathkeeper Rules**: Kenal pasti lokasi file `rules.yaml` untuk menambah akses ke rute `/api/admin/<**>`.
- [ ] **Go Dependencies**: Pastikan Go Backend memiliki klien HTTP yang siap untuk memanggil `http://vault-kratos:4434`.

---

## 2. Proposed Tasks

### Fasa A: Go Backend Admin API Wrapper (Core Logic)

**Matlamat**: Membuat *proxy* internal di Go Backend yang mengamankan pemanggilan ke Kratos Admin API.

1. **Buat Endpoint Admin**:
   - `GET /api/admin/identities` (List users)
   - `DELETE /api/admin/identities/{id}` (Delete user)
   - `PUT /api/admin/identities/{id}` (Update user traits/division)
2. **Kratos Admin Client**: Go Backend akan membuat HTTP Request secara internal ke `http://vault-kratos:4434/admin/identities`.
3. **Hardening & Audit**:
   - Ekstrak *claim* `sub` (User ID) dari Signed JWT Oathkeeper.
   - *Sementara (sebelum Keto diimplementasikan di Iterasi 6)*: Lakukan pengecekan sederhana, misalnya memastikan user yang melakukan request memiliki trait khusus (e.g., email berakhiran `@ory-vault.admin`) dengan memanggil Kratos terlebih dahulu.
   - **Wajib Audit Log**: Cetak log terstruktur: `"Admin <sub_jwt> menghapus identitas <target_id>"`.

### Fasa B: Next.js Admin Dashboard (Frontend)

**Matlamat**: Menyediakan antarmuka manajemen pengguna yang terintegrasi di aplikasi utama.

1. **UI Komponen (`/dashboard/admin/users`)**:
   - Buat halaman tabel yang menampilkan daftar pengguna (diambil dari `/api/admin/identities`).
   - Sediakan tombol "Delete" dan "Edit Division".
2. **Data Fetching**: Gunakan `useSWR` untuk mengambil data secara dinamis dan melakukan mutasi saat data dihapus/diubah.

### Fasa C: Konfigurasi Oathkeeper (Edge Security)

**Matlamat**: Melindungi rute Admin API di level Edge.

1. **Update `rules.yaml`**:
   - Tambahkan *rule* baru untuk melindungi rute `/api/admin/<**>`.
   - Gunakan *authenticator* `cookie_session` (untuk web) atau `jwt`.
   - Gunakan *mutator* `id_token` agar Go Backend menerima Signed JWT.
   - *Opsional*: Jika memungkinkan, tambahkan pengecekan MFA (AAL2) di *authorizer* Oathkeeper di masa depan.

---

## 3. Implementation Sequence (Langkah-demi-Langkah)

1. **Langkah 1**: Update `rules.yaml` Oathkeeper untuk mengizinkan dan memodifikasi *request* ke rute `/api/admin/<**>`.
2. **Langkah 2**: Kembangkan *Admin Wrapper* di Go Backend (`dms-backend/internal/api/admin.go`).
3. **Langkah 3**: Kembangkan halaman `/dashboard/admin/users` di Next.js.
4. **Langkah 4**: Lakukan *restart* pada layanan Oathkeeper dan Backend (`docker compose restart vault-oathkeeper vault-backend`).

---

## 4. Validation Strategy (Ujian Pengesahan)

1. **Unauthorized Edge Access**:
   - Panggil `curl -I http://api.ory-vault.test/api/admin/identities` tanpa cookie/JWT.
   - **Hasil**: Wajib `401 Unauthorized` dari Oathkeeper.
2. **Backend Audit Log**:
   - Lakukan penghapusan *user* fiktif melalui halaman Next.js.
   - Cek log backend: `docker compose logs vault-backend`.
   - **Hasil**: Wajib menemukan log JSON yang mencatat ID Admin (dari JWT) dan ID User yang dihapus.
3. **Direct Kratos Admin Protection**:
   - Coba akses `http://localhost:4434/admin/identities` dari mesin *host* (di luar Docker).
   - **Hasil**: Wajib gagal (Connection Refused), membuktikan API Admin Kratos tidak bocor ke publik dan hanya bisa diakses via Go Backend.

---

## 5. Security & Zero Trust Benefits

- **Attribution & Auditability**: Setiap tindakan administratif kini memiliki jejak audit yang jelas (*siapa* melakukan *apa*).
- **Defense in Depth**: API Admin Kratos (`4434`) tetap tertutup rapat dari internet. Tidak ada *port* yang diekspos secara tidak perlu.
- **Future-Proofing**: Memudahkan transisi ke **Ory Keto** (Iterasi 6), di mana Go Backend tinggal menambahkan pemanggilan gRPC `CheckPermission(Subject: JWT_Sub, Object: "system", Relation: "admin")` sebelum meneruskan *request* ke Kratos.
