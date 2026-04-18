# Release Readiness

Cap nhat: 2026-04-17

## Build/Test gates

- [ ] `mvnw test`
- [ ] `mvnw -DskipTests package`
- [ ] smoke clean-reset pass
- [ ] smoke seeded-business pass

## Parity gates

- [ ] API matrix pass
- [ ] workflow parity pass (`test-quy-trình`)
- [ ] file integrity pass
- [ ] `DanhSachHoiDong` parse + role mapping + persistence pass
- [ ] RBAC/auth matrix pass

## Ops gates

- [ ] health endpoint stable
- [ ] log startup khong loi blocker
- [ ] secrets khong hardcode
- [ ] rollback playbook da duyet

## Freeze conditions

- [ ] khong con blocker
- [ ] pass rate >98%
- [ ] fail con lai duoc triage va chap nhan
