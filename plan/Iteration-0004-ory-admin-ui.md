# Pelan: Lelaran 0004 - Enterprise Identity Control Plane (Hardened)

## Objektif

Membangun antarmuka manajemen identitas yang 100% Zero-Trust, persisten, dan memiliki UX yang konsisten. Semua interaksi menggunakan **shadcn/ui**, audit dicatat ke **PostgreSQL**, dan mendukung operasional skala besar serta **Manajemen RBAC Dinamis**.

---

## 1. Pre-flight: Repository & Integrity Audit [DONE]

- [x] **Kratos Admin Endpoint**: Port `4434` ditutup dari host (Internal Only).
- [x] **Routing Fix**: Menggunakan prefix unik `/admin-api/` dan Nginx location `/admin-api/`.
- [x] **Edge Security**: Oathkeeper mengamankan rute admin dengan `id_token`.

---

## 2. Proposed Tasks

### Fasa A: MVP Admin (Core Logic) [DONE]

- [x] List Identities (GET `/admin-api/identities`)
- [x] Delete Identity (DELETE `/admin-api/identities/{id}`)
- [x] UI Tabel di Next.js (`/dashboard/admin/users`)

### Fasa B: Account Lifecycle & State Management [DONE]

- [x] **State Toggle**: Update identity state (`active` <-> `inactive`) via `PATCH`.
- [x] **Session Revocation**: Fitur "Logout dari semua perangkat".
- [x] **Identity Detail View**: Sidebar detail profil dasar.

### Fasa C: Identity Details Extension & Trait Editor [DONE]

- [x] **Manual Recovery**: Generate recovery link bagi admin.
- [x] **Trait Editor**: Form untuk mengubah nama, divisi user.
- [x] **Manual Verification**: Tombol untuk menandai email user sebagai "Verified".
- [x] **Self-Service UI**: Implementasi halaman `/auth/settings` dan `/auth/recovery`.

### Fasa D: Hardened Security Audit & Granular Sessions [IN PROGRESS]

- [ ] **Individual Session Revocation**: Perbaiki rute agar bisa hapus satu sesi saja (Fix 404).
- [ ] **Extended Session Info**: Tampilkan `Authentication Methods` dan detail `User-Agent`.
- [ ] **Security Posture Audit**:
  - [ ] Tampilkan status 2FA (TOTP/WebAuthn) secara visual.
  - [ ] **Riwayat Login Terakhir**: Ekstrak dari metadata atau session data Kratos.

### Fasa E: Persistence & Infrastructure Foundation [TODO]

- [ ] **SQL Audit Schema**: Inisialisasi tabel `audit_logs` di PostgreSQL.
- [ ] **RBAC Storage**:
  - [ ] Buat tabel `roles` dan `user_roles` di PostgreSQL untuk manajemen role dinamis.
  - [ ] Backend memverifikasi klaim `role: admin` dari JWT Identity Metadata.
  - [ ] Admin Dashboard untuk Role Management and assigment
- [ ] **Pagination Logic**: Server-side pagination untuk Users, Sessions, Audit, dan Roles.

### Fasa F: UI/UX Overhaul & Metadata Support [TODO]

- [ ] **Shadcn Integration**: Pasang Radix UI & Shadcn components.
- [ ] **RESTORE MISSING BUTTONS**:
  - [ ] Manual Verification Action.
  - [ ] Generate Recovery Link Action.
- [ ] **Detailed Profile View (Read-Only)**:
  - [ ] Tampilkan **Custom Metadata** (Admin & Public).
  - [ ] Tampilkan Traits lengkap.
- [ ] **Advanced Identity Editor**:
  - [ ] **Trait Editor**: Fix bug form tidak merespon.
  - [ ] **Metadata Editor**: Form untuk mengubah JSON metadata (Admin/Public).
- [ ] **Action Confirmation**: Modal konfirmasi shadcn untuk semua aksi destruktif.
- [ ] **Styling Unification**: Samakan desain Admin Page dengan Landing/Main Page.

### Fasa G: Advanced & Bulk Operations [TODO]

- [ ] **Impersonation**: Generate session token khusus untuk login sebagai user.
- [ ] **Schema Switching**: Dropdown untuk mengganti schema identity.
- [ ] **Bulk Operations**:
- [ ] **Bulk Operations**:
  - [ ] Import/Export user via CSV.
  - [ ] **Bulk Cleanup**: Logika hapus/deaktivasi user yang tidak aktif selama > X hari.

### Fasa H: Enterprise RBAC Management [TODO]

- [ ] **Role Management (CRUD)**:
  - UI untuk **Tambah, Hapus, Ubah, dan Lihat** daftar Role sistem (e.g. `SuperAdmin`, `Editor`, `Viewer`).
- [ ] **Role Assignment**:
  - Fitur untuk **Assign/Revoke role** ke user tertentu dari detail profile.
  - Dukungan multi-role per user.
- [ ] **Role-Based API Guard**:
  - Backend memvalidasi izin akses berdasarkan role yang tersimpan di DB, bukan sekadar suffix email.

---

## 5. Retrospective & Issue Log (Iteration 0004)

### Issue 6: Missing Self-Service Entry Point

- **Root Cause**: Halaman login tidak memiliki navigasi ke flow recovery.
- **Resolution**: Tambahkan link "Forgot your password?" di halaman login.

### Issue 7: Courier Worker Missing

- **Root Cause**: Email tertahan di database (courier queue) karena service `kratos courier watch` tidak dijalankan.
- **Resolution**: Tambahkan service `vault-kratos-courier` di Docker Compose.

### Issue 8: SMTP STARTTLS Failure

- **Root Cause**: Mailpit tidak mendukung STARTTLS secara default pada port 1025.
- **Resolution**: Tambahkan `disable_starttls=true` pada DSN SMTP di `kratos.yaml`.

### Issue 9: In-Memory Audit Logging (Fatal Design Error)

- **Root Cause**: Menggunakan slice Go untuk menyimpan log demi kecepatan lab.
- **Problem**: Data audit hilang saat container restart.
- **Resolution**: Migrasi ke tabel PostgreSQL.

### Issue 10: Weak RBAC & API Access

- **Root Cause**: Hanya mengecek suffix email, bukan role resmi.
- **Resolution**: Implementasi pengecekan role `admin` di metadata identity.

### Issue 11: UI/UX Fragmentation & Regression

- **Root Cause**: Mencoba merombak desain tapi menghapus fitur/tombol yang sudah jalan (Recovery, Verify, Detail View).
- **Resolution**: Adopsi penuh **shadcn/ui** dan restore seluruh button/fungsi yang hilang.

### Issue 12: Missing Metadata & Bulk Logic

- **Root Cause**: Pengabaian fitur operasional (Metadata editor & Inactive Cleanup).
- **Resolution**: Penambahan task spesifik di Fasa F dan G.

### Issue 13: Scope Gap (Static Roles)

- **Root Cause**: Desain awal hanya menggunakan pengecekan email suffix untuk otorisasi admin.
- **Problem**: Tidak fleksibel dan tidak mendukung pembagian tugas (*separation of duties*).
- **Resolution**: Implementasi Manajemen Role Dinamis (Fasa H) dengan penyimpanan database persisten.
