# prompt pipeline (execution order)

## [step 01] base infrastructure

prompt: "baca MASTER_SPEC.md dan GEMINI.md. buatkan `docker-compose.yaml` awal yang berisi postgres:16-alpine dan nginx:alpine. buatkan file `./contrib/db/init-db.sql` untuk membuat schema: kratos, keto, hydra, app. konfigurasi nginx untuk meroute `auth.ory-vault.test` ke kratos:4433."

## [step 02] identity implementation (kratos)

prompt: "tambahkan ory kratos v1.1.0 ke `docker-compose.yaml`. buatkan file `./contrib/config/kratos/kratos.yaml` dan `./contrib/config/kratos/identity.schema.json`. pastikan dsn menggunakan `search_path=kratos`. buatkan script `migrate.sh` untuk menjalankan migrasi kratos sql."

## [step 03] edge protection (oathkeeper)

prompt: "tambahkan ory oathkeeper v0.40 ke `docker-compose.yaml`. buatkan `oathkeeper.yaml` (global) dan `oathkeeper.rules.yaml`. rule wajib: kunci `/api/<.*>` menggunakan handler `cookie_session` dan mutator `header` untuk mengirim `X-User-Id`."

## [step 04] granular permissions (keto)

prompt: "tambahkan ory keto v0.11 ke `docker-compose.yaml` dengan flag `--serve-grpc`. buatkan `./contrib/config/keto/namespaces.opl` yang mendefinisikan hubungan `Document` dengan relasi `owners` dan `viewers`."

## [step 05] backend logic (go)

prompt: "buatkan folder `./dms-backend`. buat `main.go` yang menginisialisasi grpc client ke `keto:4466`. implementasikan middleware untuk membaca header `X-User-Id` dan buat satu endpoint `GET /api/documents/:id` yang mengecek izin ke keto."
