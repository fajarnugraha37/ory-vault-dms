# system architecture: ory-vault dms

## 1. layer model

- **Ingress Layer**: Nginx (Port 443 HTTPS) sebagai traffic splitter berdasarkan domain.
- **Security Layer (Edge)**: Ory Oathkeeper (Port 4455). Bertindak sebagai Identity-Aware Proxy.
- **Identity Layer**: Ory Kratos. Mengelola pendaftaran, login, dan MFA.
- **Delegation Layer**: Ory Hydra. Mengelola token OAuth2 untuk pihak ketiga.
- **Permission Layer**: Ory Keto. Mesin evaluasi kebijakan berbasis Google Zanzibar.
- **Core Layer**: Go Backend. Logika bisnis DMS (upload/metadata).

## 2. network topology

- Network Name: `ory-network` (Docker bridge).
- DNS Resolution: Menggunakan service name (contoh: `https://kratos:4433`).
- Port Mapping:
  - 4433/4434 -> Kratos (Identity)
  - 4444/4445 -> Hydra (OAuth2)
  - 4455/4456 -> Oathkeeper (Proxy)
  - 4466/4467 -> Keto (gRPC Read/Write)

- **Domain Separation (Iteration 7)**:
  - `api.ory-vault.test`: Khusus First-party (UI). Menggunakan Cookie Auth.
  - `ext-api.ory-vault.test`: Khusus Third-party (External Apps). Menggunakan Bearer Token Auth.
  - `auth.ory-vault.test`: SSO Hub (Login, Registration, Consent).

## 3. auth flow mechanics

1. User meminta data ke `api.ory-vault.test`.
2. Nginx meneruskan ke Oathkeeper.
3. Oathkeeper bertanya ke Kratos: "Apakah cookie ini punya session?"
4. Jika ya, Oathkeeper mentransformasi session menjadi **Signed RS256 JWT (ID Token)** dan meneruskan ke Go Backend.
5. Go Backend memvalidasi signature JWT secara kriptografis (Zero Trust) dan mengekstrak subjek identitas.
## 4. data model: unified nodes

Untuk mendukung skalabilitas dan sorting yang efisien, sistem menggunakan model **Unified Nodes**:

- **Tabel `app.nodes`**: Menyimpan struktur hierarki (folder dan file) dalam satu tabel. Mendukung Server-Side Sorting dan Pagination.
- **Tabel `app.file_metadata`**: Extension table untuk menyimpan metadata spesifik file (mime_type, size, storage_path).
- **Soft Delete**: Seluruh resource menggunakan flag `is_deleted` untuk keamanan data. Penghapusan folder bersifat rekursif terhadap seluruh isinya (database & MinIO).

## 5. security invariants (zero trust)

1. **Anti-IDOR**: Backend TIDAK PERNAH mempercayai ID dari URL. Setiap request wajib divalidasi via Keto CheckPermission (nodes namespace).
2. **Secure Signal**: Akses publik menggunakan token non-guessable `sig_...`. Direct access menggunakan UUID file dilarang.
3. **Fail-Fast**: Aplikasi akan crash saat startup jika konfigurasi keamanan (Keto URL, Secret) tidak ditemukan di environment.
