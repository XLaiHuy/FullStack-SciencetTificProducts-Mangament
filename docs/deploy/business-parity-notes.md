# Business Parity Notes

Cap nhat: 2026-04-17

## Wave 1 da chot

1. Council members khong con luu RAM; da persistence qua table `council_memberships`.
2. Council decision/minutes luu file that vao `uploads/councils` + luu URL de survive restart.
3. Council remove member la soft-delete theo membership.
4. Settlement supplement/confirm giu side effects:
- dedupe notification theo message.
- update project status sang `da_thanh_ly` khi xac nhan.

## Edge cases da xu ly

1. Parse members fallback role mapping day du 5 vai tro khi file parse text khong du.
2. `Map.of` null crash duoc chan o add-member flow.
3. Council score-summary lay `totalMembers` tu DB thay vi RAM state.

## Con mo (Wave 2/3)

1. So khop 100% message text/error code giua Node va Spring cho tat ca module.
2. File export advanced format (docx/xlsx fidelity) cho reports/contracts/templates.
3. Full parity token lifecycle edge cases voi invalid/expired/rotated refresh token.
