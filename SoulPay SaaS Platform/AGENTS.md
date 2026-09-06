# Workspace Custom Rules & Guidelines

## 1. Strict Direct Database Querying Policy (가상/Mock 데이터 사용 금지)
- **가상 데이터(Mock/Dummy) 사용 절대 금지**: 모든 UI 화면, 대시보드, 통계, 목록 및 수치 표시 작업 시 임의의 가상 데이터나 샘플 하드코딩 객체를 만들어 표출하는 것을 엄격히 금지합니다.
- **실제 DB 100% 실측 조회 필수**: 모든 화면은 Supabase DB 및 백엔드 API를 통해 실제 연동된 실측 데이터만을 조회하여 표출해야 합니다.
- **0건 미발생 상태의 명확한 표출**: 실제 DB에 데이터가 존재하지 않을 경우, 가상 숫자를 채워 넣지 말고 `0`, `0원`, `0건` 또는 "등록된 내역이 없습니다"라는 0건 상태를 명확하고 정직하게 표출해야 합니다.

## 2. Commit Message Rule (이중 언어 커밋)
- All git commit messages must be written in both English and Korean.
