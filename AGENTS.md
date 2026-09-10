# Workspace Custom Rules & Guidelines

## 1. Strict Direct Database Querying Policy (가상/Mock 데이터 사용 금지)
- **가상 데이터(Mock/Dummy) 사용 절대 금지**: 모든 UI 화면, 대시보드, 통계, 목록 및 수치 표시 작업 시 임의의 가상 데이터나 샘플 하드코딩 객체를 만들어 표출하는 것을 엄격히 금지합니다.
- **실제 DB 100% 실측 조회 필수**: 모든 화면은 Supabase DB 및 백엔드 API를 통해 실제 연동된 실측 데이터만을 조회하여 표출해야 합니다.
- **0건 미발생 상태의 명확한 표출**: 실제 DB에 데이터가 존재하지 않을 경우, 가상 숫자를 채워 넣지 말고 `0`, `0원`, `0건` 또는 "등록된 내역이 없습니다"라는 0건 상태를 명확하고 정직하게 표출해야 합니다.

## 2. Prohibition of Hardcoding & Fallback Data (하드코딩 및 Fallback 데이터 원칙적 금지)
- **특정 테넌트/단체 식별자 하드코딩 금지**: `tenantId || 'dream'`, `tenantSlug || 'gakwonsa'`, `tenantSlug === 'dream' ? ...` 등 임의의 단체 식별자를 Fallback 기본값으로 주입하는 행위 엄격 금지. 누락 시 404 안내 페이지나 명시적 에러 처리를 수행해야 합니다.
- **개인정보/연락처 하드코딩 금지**: `phone || '01071404795'`, `donorName || '홍길동 성도'` 등 특정 개인의 연락처나 인적사항을 Fallback 기본값으로 코드에 심는 행위 엄격 금지.
- **결제/정산 상태 왜곡 금지**: PG 결제 검증 없이 임의로 `paymentStatus: 'completed'`를 부여하거나 실패 건을 성공으로 처리하는 Fallback 코드 작성 금지. 결제 내역 조회 및 집계 시 반드시 성공 건(`completed`)만을 엄격하게 필터링해야 합니다.
- **상용 서비스 안정성 원칙**: 데모 환경에서는 문제가 없어 보이는 Fallback 값이 상용 서비스(Production)에서는 오결제, 타 단체 정산 왜곡, 개인정보 노출 등 치명적인 장애를 유발하므로 절대 공용 비즈니스 로직에 Fallback을 삽입하지 않습니다. 결측치는 그럴듯한 가짜 데이터로 메우지 말고 에러 처리 또는 명시적인 빈 상태(0, 0원, 0건)로 정직하게 표출해야 합니다.

## 3. Commit Message Rule (이중 언어 커밋 - 한국어 우선)
- **커밋 메시지 언어 순서**: 모든 git 커밋 메시지는 반드시 **한국어(Korean)를 먼저 작성하고, 그 다음 영문(English)** 순서로 작성해야 합니다.
  - 제목(첫 행) 및 본문 설명 모두 **한국어 ➔ 영어** 순으로 기술합니다.
  - 예시:
    ```
    feat(결제): 정기결제 즉시 승인 기능 추가 / feat(payment): add on-demand recurring billing

    - 나노페이 샌드박스 연동 정기결제 즉시 청구 지원
    - Support on-demand recurring charge via NanoPay sandbox
    ```

## 4. Branch Management Rule (main 브랜치 임의 머지 금지)
- **개발 및 작업은 오직 `dev` 브랜치에서만 수행**: 모든 신규 기능, 버그 수정, 스타일 변경 및 테스트 작업은 오직 `dev` 브랜치에만 커밋하고 푸시합니다.
- **`main` 브랜치 머지 통제**: `main`은 상용(Production) 배포 브랜치이므로, Dev 환경에서 사용자의 실측 테스트가 완전히 완료된 후 **사용자가 명시적으로 "main으로 머지해줘"라고 요청할 때에만** `dev` -> `main` 머지를 수행합니다. AI가 임의로 `main`으로 머지하거나 푸시하는 행위를 엄격히 금지합니다.
