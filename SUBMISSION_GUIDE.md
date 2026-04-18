# Submission Guide (Code-Only)

Thu muc nop bai code-only da duoc tao san:

- `submission/source/front`
- `submission/source/back`

## Cach tai tao nhanh

Chay lenh sau tai root workspace:

```powershell
./scripts/ops/prepare_submission_source.ps1
```

Script se:

- Copy source tu `src/front` va `src/back`
- Loai bo cac thu muc runtime/build: `node_modules`, `dist`, `test-results`, `uploads`
- Loai bo file runtime artifacts: `*.pid`, `*.log`, `*.err`, `*.out`
- Tao file `submission/source/SUBMISSION_MANIFEST.txt`

## To chuc workspace sau khi gom file

- Source code chinh: `src/front`, `src/back`
- Goi nop bai code-only: `submission/source`
- File khong phai code o root da gom vao: `non-code/root-artifacts`
