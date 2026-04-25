# Pelan: Lelaran 0004 - Enterprise Identity Control Plane (Hardened)

## Objektif

Membangun antarmuka manajemen identitas yang 100% Zero-Trust, persisten, dan memiliki UX yang konsisten. Semua interaksi menggunakan **shadcn/ui**, audit dicatat ke **PostgreSQL**, dan mendukung operasional skala besar.

---

## 1. Pre-flight: Repository & Integrity Audit [DONE]

- [x] **Kratos Admin Endpoint**: Port `4434` ditutup dari host (Internal Only).
- [x] **Routing Fix**: Menggunakan prefix unik `/admin-api/` dan Nginx location `/admin-api/`.
- [x] **Edge Security**: Oathkeeper mengamankan rute admin dengan `id_token`.

---

## 2. Completed Tasks

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
- [x] **Self-Service UI**: Implementasi halaman `/auth/settings`, `/auth/recovery`, `/auth/verification`, dan `/auth/error`.

### Fasa D: Hardened Security Audit & Granular Sessions [DONE]

- [x] **Individual Session Revocation**: Penggunaan rute flat `/admin/sessions/{sid}` via Official SDK.
- [x] **Debug Routing Infrastructure**: Implementasi custom `NotFound` handler untuk melacak 404.
- [x] **Official SDK Integration**: Migrasi total ke `github.com/ory/kratos-client-go`.
- [x] **Context Propagation**: Implementasi `r.Context()` pada seluruh layer database dan API.
- [x] **Extended Session Info**: Tampilkan detail IP dan User-Agent.
- [x] **Security Posture Audit**: Tampilkan status 2FA (TOTP) dan Email Verification secara visual.

### Fasa E: Persistence & Infrastructure Foundation [DONE]

- [x] **Modular Refactoring**: Migrasi ke struktur modular Go (`cmd/server`, `internal/handler`, etc).
- [x] **SQL Persistence**: Migrasi Audit Timeline ke tabel PostgreSQL `enterprise.audit_logs`.
- [x] **RBAC Storage**: Inisialisasi tabel `enterprise.roles` dan `enterprise.user_roles`.
- [x] **Backend Hardening**: Middleware Chi (RealIP, RequestID, Timeout) dan JSON Error Handling.

### Fasa F: UI/UX Overhaul & Metadata Support [DONE]

- [x] **Shadcn Integration**: Migrasi total ke komponen Radix UI & Shadcn.
- [x] **No Native Popups**: Seluruh konfirmasi aksi menggunakan **Shadcn Dialog**.
- [x] **Metadata Support**: Tampilan Read-only untuk `metadata_admin` dan `metadata_public`.
- [x] **Styling Unification**: Desain Admin Dashboard seragam dengan standar Landing Page.

### Fasa G: Advanced & Bulk Operations [DONE]

- [x] **Impersonation**: Generate magic link khusus untuk troubleshoot sebagai user.
- [x] **Bulk Cleanup**: Logika deaktifasi user inactive (> X hari) via API & UI.
- [x] **Pagination Ready**: API mendukung `limit` dan `offset` untuk skalabilitas.

### Fasa H: Enterprise RBAC Management [DONE]

- [x] **Role Management (CRUD)**: UI & API untuk mengelola daftar Role sistem secara dinamis.
- [x] **Role Assignment**: Fitur untuk Assign/Revoke role ke user langsung dari sidebar.
- [x] **Dynamic Authz**: Middleware mengecek role di database PostgreSQL.

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

- **Root Cause**: Desain malas menggunakan slice Go untuk logging demi kecepatan lab.
- **Problem**: Data audit hilang saat container restart, melanggar kepatuhan.
- **Resolution**: Migrasi ke tabel PostgreSQL `enterprise.audit_logs`.

### Issue 10: Weak RBAC & API Access

- **Root Cause**: Hanya mengecek suffix email, bukan role resmi di DB.
- **Resolution**: Implementasi pengecekan role `admin` di metadata identity dengan fallback email suffix.

### Issue 11: UI/UX Fragmentation & Regression

- **Root Cause**: Mencoba merombak desain tapi menghapus fitur/tombol yang sudah jalan.
- **Resolution**: Restore button manual verify/recovery dan adopsi penuh **shadcn/ui**.

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

### Issue 19: Build Failure (asChild & Slots)

- **Root Cause**: Menggunakan prop `asChild` pada Shadcn Button tanpa menginstal `@radix-ui/react-slot`.
- **Resolution**: Instalasi dependensi Radix Slot dan update komponen Button.

---

## 6. Evaluation & Completion Check

- **Zero Mock Policy**: Seluruh data ditarik langsung dari Kratos API atau PostgreSQL. [PASSED]
- **Persistence Check**: Audit log dan Role tetap ada setelah `docker compose restart`. [PASSED]
- **Security Check**: Request tanpa JWT yang valid atau Role yang tepat ditolak oleh middleware. [PASSED]
- **UX Consistency**: Tidak ada elemen native browser (alert/confirm) yang tersisa. [PASSED]
