# sprint 03: keto granular permissions (grpc)

## goal

mengaktifkan pengecekan izin berbasis hubungan (rebac) via grpc.

## tasks

1. **TASK-301**: definisikan namespaces di `namespaces.opl` (Document, Folder, Division).
2. **TASK-302**: setup gRPC client di backend go (connect to `keto:4466`).
3. **TASK-303**: implementasi fungsi `IsAllowed(user, action, document)`.
4. **TASK-304**: implementasi logic 'sharing' (insert tuple ke `keto:4467`).

## definition of done (dod)

- [ ] `grpcurl` dapat memanggil keto dari dalam container backend.
- [ ] user A mencoba akses dokumen user B -> 403 Forbidden.
- [ ] manager divisi dapat melihat dokumen stafnya (inheritance test).
