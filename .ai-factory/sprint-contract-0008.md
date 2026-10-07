# Sprint Contract — 패킷 0008
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

# Sprint Contract: Routing & Integration — App 라우트 연결과 검수 점검

## 만들 항목
- **src/App.tsx**: react-router-dom Routes 구성 ('/' → Home, '/result/:id' → Result, 그 외 → Navigate to='/' replace), Provider 구조 유지

## 사용할 TypeScript 타입
- ReturnItem, DeadlineInfo (types.ts에서 import 후 '/result/:id'에서 저장소 조회)

## 검증 방법
1. **라우팅 동작**: Home 접속 확인 → ListRow 탭 → '/result/{id}' URL 변경 확인 → Result 렌더링 확인 → '/unknown' 접속 → '/' 리다이렉트 확인
2. **새로고침 유지**: '/result/{id}'에서 F5 새로고침 → 같은 건 표시 (location.state 의존 금지, URL id로만 저장소 조회)
3. **Grep 검증**: `grep -r "#[0-9a-fA-F]{3,6}" src/` 외 5가지 패턴 모두 0건
4. **접근성**: src/pages, src/components 모든 TDS Button/TextField/ChipItem/Switch에 aria-label 필수, 인라인 width/height/padding 0건 (Skeleton height 제외)
5. **수동 흐름**: 등록 → 목록 → 상세 → 체크 → 반품 신청 → 보관함 → 진행 중 복원 → 삭제 → 홈 (console.error 0건)

## 절대 하면 안 되는 것
- main.tsx 수정 금지
- 기존 Provider 구조 변경 금지
- FloatingTabBar 추가 금지
- location.state 의존 금지 (새로고침 시 손실)
