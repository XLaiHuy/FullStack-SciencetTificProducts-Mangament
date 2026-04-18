# Regression Summary

Cap nhat: 2026-04-17

## Orchestration scripts

1. `scripts/smoke/run_dual_parity_regression.ps1`
- Chay smoke API + workflow tren Node va Spring.
- Ghi log va markdown summary theo mode.
2. `scripts/ops/run_parity_db_modes.ps1`
- Chay bat buoc 2 mode DB: `clean-reset` va `seeded-business`.

## Cach chay

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ops\run_parity_db_modes.ps1 -NodeBaseUrl "http://localhost:3000" -SpringBaseUrl "http://localhost:8080"
```

## Output

- Bao cao tung lan run duoc ghi vao `docs/deploy/reports/`.
- Chi tiet PASS/FAIL theo backend + theo smoke suite.

## Gate mapping

- Dung artifact nay cho Wave 3/4 de quyet dinh freeze candidate.
