# project constitution: ory-vault

## article I: identity & trust

1. semua identitas user adalah milik **Ory Kratos**. Backend dilarang memiliki tabel `users` sendiri.
2. sistem menggunakan pola **Zero-Trust**. Kehadiran di dalam jaringan `ory-network` tidak berarti memiliki akses.
3. Trust diberikan hanya jika request memiliki Signed JWT yang divalidasi oleh **Ory Oathkeeper**.

## article II: database isolation

1. PostgreSQL 16 adalah satu-satunya sumber kebenaran data.
2. Isolasi WAJIB dilakukan di tingkat **Schema**, bukan database terpisah, untuk efisiensi resource.
3. Penulisan DSN dilarang keras tanpa parameter `search_path`.

## article III: high-performance authorization

1. Pengecekan izin granular (Zanzibar) WAJIB menggunakan **gRPC** (Port 4466).
2. Dilarang melakukan hardcode role (contoh: `if role == 'admin'`). Gunakan pengecekan relasi Keto.

## article IV: stateless application

1. Backend Go dan Frontend Next.js harus **Stateless**.
2. Sesi dilarang disimpan di memori lokal atau Redis aplikasi; gunakan session cookie yang dikelola Kratos.
