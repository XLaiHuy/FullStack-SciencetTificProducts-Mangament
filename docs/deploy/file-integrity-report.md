# File Integrity Report

Cap nhat: 2026-04-17

## Fixtures su dung

- `scripts/smoke/fixtures/pdf/*`
- `scripts/smoke/fixtures/docx/*`
- `DanhSachHoiDong_Mau.docx`
- `test-quy-trình.docx`

## Da verify trong Spring

1. Council decision upload/download:
- Upload luu file that vao `uploads/councils`.
- Download tra binary PDF stream.
2. Council minutes upload/download:
- Luu URL + metadata trong DB (`council_minutes`).
- Download tra binary stream.
3. Settlement export:
- `GET /api/settlements/{id}/export` tra binary file (excel/docx mime).

## Tieu chi integrity

1. HTTP 200 voi endpoint file.
2. `Content-Disposition` la attachment.
3. `Content-Type` hop le theo endpoint.
4. Kich thuoc file > 0.

## Con lai

- Contracts/report/template/archive export fidelity can tiep tuc doi chieu voi Node output.
