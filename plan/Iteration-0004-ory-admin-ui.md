# Pelan: Lelaran 0004 - Zero Trust Admin API & Dashboard (Identity Management)

## Objektif

Membangun kapabilitas manajemen identitas (Admin UI) yang 100% mematuhi prinsip **Zero Trust**. Seluruh tindakan admin melewati Oathkeeper (JWT), divalidasi oleh Go Backend (Audit/Authz), sebelum diteruskan secara internal ke Kratos Admin API.

---

## 1. Pre-flight: Repository & Integrity Audit [DONE]

- [x] **Kratos Admin Endpoint**: Port `4434` ditutup dari host (Internal Only).
- [x] **Routing Fix**: Menggunakan prefix unik `/admin-api/` dan Nginx location `/admin-api/` untuk menghindari ambiguitas rule.
- [x] **Edge Security**: Oathkeeper mengamankan rute admin dengan `cookie_session` dan mutasi ke `id_token`.

---

## 2. Proposed Tasks

### Fasa A: MVP Admin (Core Logic) [DONE]
- [x] List Identities (GET `/admin-api/identities`)
- [x] Delete Identity (DELETE `/admin-api/identities/{id}`)
- [x] UI Tabel di Next.js (`/dashboard/admin/users`)

### Fasa B: Account Lifecycle & State Management [DONE]
- [x] **State Toggle**: Update identity state (`active` <-> `inactive`) via `PATCH`.
- [x] **Session Revocation**: Fitur "Logout dari semua perangkat" (DELETE `/admin-api/identities/{id}/sessions`).
- [x] **Identity Detail View**: Sidebar detail untuk melihat `traits` dan status user.

### Fasa C: Identity Details Extension & Trait Editor [DONE]
- [x] **Manual Recovery**: Generate recovery link bagi admin (POST `/admin-api/identities/{id}/recovery`).
- [x] **Trait Editor**: Form untuk mengubah nama, divisi user (PATCH `/admin-api/identities/{id}/traits`).
- [x] **Manual Verification**: Tombol untuk menandai email user sebagai "Verified" secara manual (POST `/admin-api/identities/{id}/verify`).

### Fasa D: Security Audit & Future RBAC [IN PROGRESS]
- [ ] **Active Sessions List**: Melihat detail device/browser yang sedang login.
- [ ] **Security Posture Audit**: Tampilkan status 2FA (TOTP/WebAuthn).
- [ ] **Audit Timeline**: Tampilkan daftar tindakan admin (siapa mengubah apa).

---

## 3. Implementation Details (Backend Wrapper)

Setiap fitur baru di atas akan diimplementasikan sebagai endpoint di `dms-backend` yang memanggil Kratos Admin API internal:
- **State Change**: `PATCH /admin/identities/{id}` (JSON Patch RFC 6902) [DONE]
- **Trait Editor**: `PATCH /admin/identities/{id}` (JSON Patch RFC 6902) [DONE]
- **Recovery**: `POST /admin/recovery/link` [DONE]
- **Verify**: `PATCH /admin/identities/{id}` (Update verifiable_addresses) [DONE]

---

## 4. Validation Strategy [ONGOING]

1. **Access Control**: Pastikan hanya user dengan email `@ory-vault.*` yang bisa memanggil endpoint `/admin-api/*`. [PASSED]
2. **Audit Logging**: Setiap tindakan administratif (State change, Revoke, Edit) mencatat log ke stdout backend. [PASSED]
3. **Zero Trust Integrity**: Pastikan backend memvalidasi JWT Signature sebelum melakukan request ke Kratos Admin port. [PASSED]

---

## 6. Retrospective & Issue Log (Iteration 0004)

### Issue 1: Go Unused Import
- **Root Cause**: Lupa menghapus package `time` setelah refactoring.
- **Resolution**: Hapus import `time`.

### Issue 2: Rule Overlap & Ambiguity
- **Root Cause**: Pattern glob `/api/<**>` menangkap `/api/admin`. Penggunaan Regexp di YAML memerlukan escape character yang rumit.
- **Resolution**: Gunakan prefix unik `/admin-api/` dan Nginx location khusus.

### Issue 3: Recovery Flow 404
- **Root Cause**: Kratos mengalihkan ke `/auth/recovery` tetapi halaman belum ada, dan fitur recovery belum diaktifkan di `kratos.yaml`.
- **Resolution**: Aktifkan flow recovery di Kratos config dan buat halaman `/auth/recovery` di `dms-ui`.

### Issue 4: Identity Update 400 (Password Hash Mismatch)
- **Root Cause**: Melakukan `PUT` dengan mengirimkan kembali objek identitas lengkap termasuk hash password yang tidak dikenal formatnya oleh Kratos.
- **Resolution**: Gunakan **JSON Patch (RFC 6902)** untuk melakukan update parsial hanya pada field yang dibutuhkan.

### Issue 5: Recovery Redirect 404
- **Root Cause**: Setelah link recovery berhasil divalidasi, Kratos me-redirect user ke flow settings, tetapi halaman `/auth/settings` belum diimplementasikan.
- **Resolution**: Implementasi halaman `/auth/settings` di Next.js untuk menangani perubahan password pasca-recovery.

### Issue 6: Missing Self-Service Entry Point
- **Root Cause**: Halaman login tidak memiliki navigasi ke flow recovery, menyulitkan user yang lupa password.
- **Resolution**: Tambahkan link "Forgot your password?" di halaman login yang mengarah ke `/auth/recovery`.
