# system architecture: ory-vault dms

## 1. layer model

- **Ingress Layer**: Nginx (Port 80) sebagai traffic splitter berdasarkan domain.
- **Security Layer (Edge)**: Ory Oathkeeper (Port 4455). Bertindak sebagai Identity-Aware Proxy.
- **Identity Layer**: Ory Kratos. Mengelola pendaftaran, login, dan MFA.
- **Delegation Layer**: Ory Hydra. Mengelola token OAuth2 untuk pihak ketiga.
- **Permission Layer**: Ory Keto. Mesin evaluasi kebijakan berbasis Google Zanzibar.
- **Core Layer**: Go Backend. Logika bisnis DMS (upload/metadata).

## 2. network topology

- Network Name: `ory-network` (Docker bridge).
- DNS Resolution: Menggunakan service name (contoh: `http://kratos:4433`).
- Port Mapping:
  - 4433/4434 -> Kratos (Identity)
  - 4444/4445 -> Hydra (OAuth2)
  - 4455/4456 -> Oathkeeper (Proxy)
  - 4466/4467 -> Keto (gRPC Read/Write)

## 3. auth flow mechanics

1. User meminta data ke `api.ory-vault.test`.
2. Nginx meneruskan ke Oathkeeper.
3. Oathkeeper bertanya ke Kratos: "Apakah cookie ini punya session?"
4. Jika ya, Oathkeeper menyuntikkan `X-User-Id` dan meneruskan ke Go Backend.
5. Go Backend bertanya ke Keto via gRPC: "Apakah `X-User-Id` ini boleh baca Dokumen A?"
