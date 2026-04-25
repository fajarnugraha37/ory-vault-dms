# Pelan: Lelaran 0004 - Enterprise Identity Control Plane (Hardened)

## Objektif
Membangun antarmuka manajemen identitas yang 100% Zero-Trust, persisten, dan memiliki UX yang konsisten. Semua interaksi menggunakan **shadcn/ui**, audit dicatat ke **PostgreSQL**, dan mendukung operasional skala besar.

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
- [x] **Individual Session Revocation**: Perbaiki rute agar bisa hapus satu sesi saja (Fix 404). [DONE]
- [x] **Debug Routing Infrastructure**: Implementasi custom `NotFound` handler untuk melacak asal muasal 404. [DONE]
- [x] **Official SDK Integration**: Migrasi dari HTTP wrapper DIY ke `github.com/ory/kratos-client-go`. [DONE]
- [x] **Context Propagation**: Implementasi `r.Context()` pada seluruh layer database dan API. [DONE]
- [ ] **Extended Session Info**: Tampilkan `Authentication Methods` dan detail `User-Agent`.
- [ ] **Security Posture Audit**: Tampilkan status 2FA (TOTP/WebAuthn) secara visual.
- [ ] **Riwayat Login Terakhir**: Ekstrak dari metadata atau session data Kratos.

### Fasa E: Persistence & Infrastructure Foundation [DONE]
- [x] **Modular Refactoring**: Migrasi dari `main.go` tunggal ke struktur modular (`cmd/`, `internal/api`, `internal/handler`, `internal/store`).
- [x] **Chi Router Integration**: Menggunakan router Chi dengan middleware standar (RequestID, RealIP, Timeout). [DONE]
- [x] **SQL Audit Schema**: Inisialisasi tabel `audit_logs` di PostgreSQL. [DONE]
- [x] **RBAC Storage**: Buat tabel `roles` dan `user_roles` di PostgreSQL. [DONE]
- [x] **Backend Persistence**: Migrasi logic logging dari in-memory ke SQL dengan metadata lengkap (IP/UA). [DONE]
- [ ] **Admin Dashboard untuk Role Management**: UI untuk mengelola Role (Fasa H).
- [ ] **Pagination Logic**: Server-side pagination untuk Users, Sessions, Audit, dan Roles.

### Fasa F: UI/UX Overhaul & Metadata Support [IN PROGRESS]
- [ ] **Shadcn Integration**: Pasang Radix UI & Shadcn components.
- [ ] **RESTORE MISSING BUTTONS**:
  - [x] Manual Verification Action. [DONE]
  - [x] Generate Recovery Link Action. [DONE]
  - [x] Detailed Profile View (Read-Only). [DONE]
- [ ] **Advanced Identity Editor**:
  - [ ] **Trait Editor**: Fix bug form tidak merespon.
  - [ ] **Metadata Editor**: Form untuk mengubah JSON metadata (Admin/Public).
- [ ] **Action Confirmation**: Modal konfirmasi shadcn untuk semua aksi destruktif.
- [ ] **Styling Unification**: Samakan desain Admin Page dengan Landing/Main Page.

### Fasa G: Advanced & Bulk Operations [TODO]
- [ ] **Impersonation**: Generate session token khusus untuk login sebagai user.
- [ ] **Schema Switching**: Dropdown untuk mengganti schema identity.
- [ ] **Bulk Operations**: Import/Export CSV dan Bulk Cleanup user inactive (> X hari).

### Fasa H: Enterprise RBAC Management [TODO]
- [ ] **Role Management (CRUD)**: UI untuk **Tambah, Hapus, Ubah, dan Lihat** daftar Role sistem.
- [ ] **Role Assignment**: Fitur untuk **Assign/Revoke role** ke user tertentu.
- [ ] **Role-Based API Guard**: Backend memvalidasi izin akses berdasarkan role di DB.

---

## 5. Retrospective & Issue Log (Iteration 0004)

### Issue 1: Go Unused Import
- **Root Cause**: Package `time` tertinggal setelah refactoring.
- **Resolution**: Bersihkan import yang tidak digunakan.

### Issue 2: Rule Overlap & Ambiguity
- **Root Cause**: Pattern glob `/api/<**>` menangkap `/api/admin`.
- **Resolution**: Gunakan prefix unik `/admin-api/` dan Nginx location khusus.

### Issue 3: Recovery Flow 404 (Initial)
- **Root Cause**: Kratos mengalihkan ke `/auth/recovery` tetapi halaman belum ada di UI.
- **Resolution**: Buat halaman `/auth/recovery` di Next.js.

### Issue 4: Identity Update 400 (Password Hash Mismatch)
- **Root Cause**: Melakukan `PUT` dengan mengirimkan kembali objek identitas lengkap termasuk hash password.
- **Resolution**: Gunakan **JSON Patch (RFC 6902)** untuk melakukan update parsial.

### Issue 5: Recovery Redirect 404
- **Root Cause**: Setelah token valid, Kratos me-redirect ke flow settings yang belum ada halamannya di UI.
- **Resolution**: Implementasi halaman `/auth/settings`.

### Issue 6: Missing Self-Service Entry Point
- **Root Cause**: Halaman login tidak memiliki navigasi ke flow recovery.
- **Resolution**: Tambahkan link "Forgot your password?" di halaman login.

### Issue 7: Courier Worker Missing
- **Root Cause**: Email tertahan di database karena service `kratos courier watch` tidak dijalankan.
- **Resolution**: Tambahkan service `vault-kratos-courier` di Docker Compose.

### Issue 8: SMTP STARTTLS Failure
- **Root Cause**: Mailpit tidak mendukung STARTTLS secara default pada port 1025.
- **Resolution**: Tambahkan `disable_starttls=true` pada DSN SMTP di `kratos.yaml`.

### Issue 9: In-Memory Audit Logging (Fatal Design Error)
- **Root Cause**: Menggunakan slice Go untuk menyimpan log demi kecepatan lab.
- **Problem**: Data audit hilang saat container restart, melanggar kepatuhan.
- **Resolution**: Migrasi ke tabel PostgreSQL `enterprise.audit_logs`.

### Issue 10: Weak RBAC & API Access
- **Root Cause**: Hanya mengecek suffix email, bukan role resmi di DB.
- **Resolution**: Implementasi pengecekan role `admin` di metadata identity dengan fallback email suffix.

### Issue 11: UI/UX Fragmentation & Regression
- **Root Cause**: Mencoba merombak desain tapi menghapus fitur/tombol yang sudah jalan.
- **Resolution**: Restore button manual verify/recovery dan perkuat struktur UI.

### Issue 12: Broken Individual Revoke (404)
- **Root Cause**: Backend menggunakan URL salah (`/identities/{id}/sessions/{sid}`) alih-alih `/sessions/{sid}`.
- **Resolution**: Gunakan rute flat Chi dan panggil SDK resmi `DisableSession`.

### Issue 13: Scope Gap (Static Roles)
- **Root Cause**: Desain awal hanya menggunakan pengecekan email suffix untuk otorisasi admin.
- **Resolution**: Implementasi Manajemen Role Dinamis (Fasa H) dengan penyimpanan database persisten.

### Issue 14: Shell Redirection Failure
- **Root Cause**: PowerShell tidak mendukung operator `<` untuk import SQL ke Docker.
- **Resolution**: Gunakan pipe `cat file | docker exec -i ...` untuk eksekusi SQL.

### Issue 15: Go Build Failure (Unused Import)
- **Root Cause**: Package `fmt` dan `log` tertinggal di file modular setelah refactoring.
- **Resolution**: Bersihkan unused import sebelum build.

### Issue 16: Bloated Main.go
- **Root Cause**: Menumpuk seluruh logic API, database, dan middleware dalam satu file.
- **Resolution**: Refactor total ke struktur folder `internal/` menggunakan router Chi.

### Issue 17: DIY Kratos Wrapper Violation
- **Root Cause**: Mengabaikan aturan "NO DIY" dengan membuat HTTP client manual.
- **Problem**: Inkonsistensi tipe data dan pembentukan URL salah.
- **Resolution**: Migrasi total ke library resmi `github.com/ory/kratos-client-go`.

### Issue 18: Context & Error Inconsistency
- **Root Cause**: Mengabaikan request lifecycle (Context) dan menggunakan `http.Error` plain text.
- **Resolution**: Implementasi helper `respondWithJSON` dan meneruskan `r.Context()` ke seluruh layer.
