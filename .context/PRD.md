# prd: ory-vault secure document management system

## problem statement

organisasi membutuhkan sistem manajemen dokumen (dms) yang memisahkan data identitas, logika izin akses granular, dan delegasi akses pihak ketiga. solusi yang ada sering kali mencampurkan otorisasi di dalam kode aplikasi (rbac hardcoded), yang menyebabkan kesulitan audit dan ketidakmampuan untuk melakukan delegasi akses (oauth2) secara aman ke vendor luar.

## solution

membangun **ory-vault**, sebuah dms yang menggunakan ekosistem ory secara utuh. sistem ini mendelegasikan autentikasi ke ory kratos, otorisasi granular (zanzibar model) ke ory keto via gRPC, delegasi akses ke ory hydra, dan penegakan kebijakan di tingkat edge menggunakan ory oathkeeper.

---

## user stories

1. **sebagai user baru**, saya ingin mendaftar akun dengan rincian nama dan divisi, agar saya bisa mulai menyimpan dokumen.
2. **sebagai user terdaftar**, saya ingin login menggunakan email dan password untuk mengakses dashboard pribadi saya.
3. **sebagai pemilik dokumen**, saya ingin mengunggah file dan secara otomatis memiliki hak akses `owner` di dalam sistem.
4. **sebagai pemilik dokumen**, saya ingin membagikan akses `viewer` ke rekan kerja menggunakan email mereka tanpa memberikan password saya.
5. **sebagai manager divisi**, saya ingin secara otomatis memiliki akses baca terhadap dokumen yang diunggah oleh anggota divisi saya (inheritance).
6. **sebagai pengembang aplikasi pihak ketiga**, saya ingin mendapatkan akses baca ke dokumen user tertentu via oauth2 (authorization code flow) untuk melakukan proses audit otomatis.
7. **sebagai user**, saya ingin dashboard memberitahu saya secara eksplisit jika sesi saya berakhir dan mengarahkan saya kembali ke halaman login.

---

## implementation decisions

### 1. infrastructure & database isolation

* **storage**: menggunakan postgresql 16 dengan strategi **multi-schema**.
  * schema `kratos`: data identitas dan session.
  * schema `keto`: data relation tuples (zanzibar).
  * schema `hydra`: data token dan client registration.
  * schema `app`: metadata dokumen (nama file, s3 link, dsb).
* **network**: semua komponen berjalan di dalam `ory-network` terisolasi. hanya port 80 (nginx) yang diekspos ke host luar.

### 2. identity & session management (ory kratos)

* menggunakan shared cookie pada domain `.ory-vault.test`.
* registrasi mencakup traits: `email`, `first_name`, `last_name`, dan `division`.
* login flow dikelola sepenuhnya oleh kratos public api.

### 3. edge security (ory oathkeeper)

* bertindak sebagai **zero-trust proxy**.
* tugas: memvalidasi session cookie kratos atau jwt token hydra.
* output: menyuntikkan header `X-User-Id` (subject) ke dms-backend. backend dilarang melakukan pengecekan session sendiri.

### 4. granular permissions (ory keto)

* **protocol**: komunikasi dms-backend ke keto wajib menggunakan **gRPC** pada port 4466 (read) dan 4467 (write).
* **logic**: setiap akses ke dokumen harus melalui fungsi `CheckPermission` yang memanggil keto.
* **opl schema**: mendefinisikan hubungan antar objek (document, folder, division) dan user.

---

## testing decisions

1. **unauthenticated access test**: memanggil `GET api.ory-vault.test/api/documents` tanpa cookie harus mengembalikan `401 Unauthorized` (enforced by oathkeeper).
2. **unauthorized access test**: user A mencoba mengakses dokumen milik user B harus mengembalikan `403 Forbidden` (enforced by backend-keto check).
3. **gRPC connectivity test**: dms-backend harus gagal startup (panic) jika tidak bisa melakukan dial ke `keto:4466`.
4. **oauth2 flow test**: menggunakan postman untuk mendapatkan access token dari hydra dan menggunakannya untuk menembus oathkeeper.

---

## out of scope

* implementasi penyimpanan fisik file (storage engine). backend hanya mengelola metadata.
* manajemen sertifikat ssl asli (menggunakan `http` di lokal atau `self-signed` di nginx).
* manajemen ui login kratos yang kompleks (menggunakan default self-service ui atau headless sederhana).

---

## further notes

* **junior dev focus**: pengembang hanya perlu fokus pada penulisan middleware di go yang membaca header `X-User-Id` dan memanggil gRPC keto. jangan biarkan pengembang memodifikasi konfigurasi `oathkeeper.yaml` tanpa supervisi architect.
* **ai agent usage**: gunakan file `GEMINI.md` dan `MASTER_SPEC.md` untuk mengunci konteks agen agar tidak terjadi "config drift".
