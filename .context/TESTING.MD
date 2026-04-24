# testing protocol: ory-vault

## 1. strategy: the triangle of truth

Agen junior WAJIB menyediakan bukti tes untuk setiap task:

### a. unit tests (logic core)

- fokus: validasi parsing header, transformasi metadata, dan logic internal Go.
- tool: `go test -v ./...`.

### b. integration tests (ory interaction)

- fokus: membuktikan backend bisa "berbicara" dengan Keto gRPC.
- requirement: Jalankan container Keto di background.
- tool: Script `.http` (REST Client) untuk memicu endpoint API gateway.

### c. e2e validation (manual/cli)

- setiap PR wajib disertai satu baris perintah `curl` lengkap dengan cookie palsu/asli untuk memverifikasi proteksi Oathkeeper.

## 2. mock policy

- Dilarang membuat mock Keto gRPC yang terlalu kompleks. Jika tes membutuhkan Keto, instruksikan user untuk menjalankan `docker-compose up keto` sebagai dependensi tes.

## 3. test coverage invariants

- Backend: Minimal 70% coverage pada folder `internal/logic`.
- Frontend: Cukup tes integrasi pada `AuthContext`.

## 4. step-by-step verification per task

Setiap output dari agen junior harus mengikuti format:

1. "Saya telah mengimplementasikan [Fitur X]."
2. "Cara menjalankan unit test: [Command]."
3. "Cara verifikasi manual via curl: [Command]."
4. "Log sukses yang diharapkan: [String matching]."
