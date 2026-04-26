# Pelan: Lelaran 0006 - Perbaikan Sharing & Zero Trust Hardening (v2)

## 1. Masalah Utama & Analisis
- **Masalah 1 (Editor Permission)**: User dengan role `editor` pada file yang di-share hanya melihat tombol "Download".
    - *Punca*: Frontend (`dms-ui/src/app/dashboard/documents/page.tsx`) hanya menampilkan tombol aksi (Rename, Move, Share, Delete) jika `activeTab === "owned"`.
    - *Punca Tambahan*: Backend tidak mengirimkan informasi role/permission untuk setiap item dalam list.
- **Masalah 2 (Shared Folder Content)**: Isi folder yang di-share tidak muncul.
    - *Punca*: Handler `ListFolders` dan `ListDocuments` di Go hanya mengambil item yang dimiliki user (`owner_id = userID`).
    - *Punca Tambahan*: Keto `ListRelationships` hanya mengembalikan item yang di-share secara langsung, tidak termasuk child item yang diwarisi (inheritance) lewat folder.

## 2. Strategi Perbaikan

### A. Backend (Go)
1.  **Store Extension**:
    - Tambah method `ListFoldersByParent(ctx, parentID)` dan `ListDocumentsByFolder(ctx, folderID)` di `postgres.go` yang tidak memfilter berdasarkan `owner_id`.
2.  **Handler Logic Update**:
    - Di `ListFolders` dan `ListDocuments`:
        - Jika `parent_id`/`folder_id` diberikan:
            - Lakukan Keto `CheckPermission(..., "view", ...)` untuk folder tersebut.
            - Jika diizinkan, ambil SEMUA isi folder tersebut menggunakan method store baru.
        - Jika `parent_id` NIL (Root):
            - Ambil owned items (seperti sekarang).
            - Ambil shared items (seperti sekarang).
3.  **Permission Enrichment**:
    - Tambahkan field `UserPermission` (string: "owner", "editor", "viewer") pada response JSON Document dan Folder.
    - Untuk owned items, set "owner".
    - Untuk shared items, ambil relation dari Keto `ListRelationships`.

### B. Frontend (Next.js)
1.  **Interface Update**:
    - Update type `Document` dan `Folder` untuk menyertakan `user_permission`.
2.  **Action Rendering**:
    - Ganti pengecekan `activeTab === "owned"` dengan pengecekan `item.user_permission === 'owner' || item.user_permission === 'editor'`.

## 3. Langkah Eksekusi
1.  **Task 1**: Modifikasi `dms-backend/internal/store/postgres.go` untuk menambah query list tanpa filter owner. (DONE)
2.  **Task 2**: Modifikasi `dms-backend/internal/handler/folder.go` untuk logika list baru + enrichment role. (DONE)
3.  **Task 3**: Modifikasi `dms-backend/internal/handler/document.go` untuk logika list baru + enrichment role. (DONE)
4.  **Task 4**: Update `dms-ui/src/app/dashboard/documents/page.tsx` untuk menampilkan aksi berdasarkan role. (DONE)

## 4. Validasi
- [x] Share Folder F1 (Editor) ke User B.
- [x] User B buka F1 -> Harus melihat isi F1 (File/Folder di dalamnya).
- [x] User B pada File di dalam F1 -> Harus melihat tombol Rename/Delete (karena mewarisi Editor).
- [x] Share File File1 (Viewer) ke User C.
- [x] User C pada File1 -> Hanya melihat tombol Download.
