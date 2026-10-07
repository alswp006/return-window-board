시뮬레이션에서 빠진 것으로 나온 예외 경로 4개를 AC로 추가했습니다. 기존 AC·문구·Value Contract는 그대로 두었고, 새 AC를 Task에 연결하려고 Covers·DoD·AC Coverage만 고쳤습니다.

**추가한 AC 4개**
- **AC-AD-FAIL**: 배너 광고를 못 불러와도 화면과 기능이 그대로 동작합니다.
- **AC-STORAGE-WRITE-1**: 등록·수정 중 저장이 실패하면 시트와 입력값이 남고, 목록은 바뀌지 않습니다.
- **AC-STORAGE-WRITE-2**: 체크·항목 추가/삭제·상태 변경 저장이 실패하면 화면이 실패 전 상태로 돌아가고 Toast가 뜹니다.
- **AC-STORAGE-WRITE-3**: 삭제 저장이 실패하면 그 건이 남고 홈으로 이동하지 않습니다.

**시뮬레이션 제안과 다르게 한 부분**
- **"5MB 한계", "3초 후 자동 사라짐"은 넣지 않았습니다.** 출처가 없는 수치라서입니다. 저장 실패는 용량 대신 "쓰기 시도 시 예외"로 정의했습니다.
- **"기기 설정 > 저장소 지우기" 안내는 넣지 않았습니다.** 그렇게 하면 등록한 건이 전부 지워집니다. 대신 "보관함의 지난 건을 삭제"하라고 안내합니다.
- **배너가 실패해도 console.error를 낸다는 내용은 뺐습니다.** AC-REVIEW-2(정상 흐름 console.error 0건)와 부딪힐 수 있어서입니다.
- **AdSlot에 `onError`를 붙이는 대신 페이지에서 오류 경계로 감쌌습니다.** AdSlot은 템플릿 컴포넌트라 고치지 않고, `AdBoundary`(실패하면 아무것도 그리지 않음)로 감쌉니다.
- **저장 실패 시 "저장하기" 버튼은 활성 상태로 둡니다.** 시뮬레이션은 비활성을 제안했지만, 그러면 바로 다시 시도할 수 없어서입니다.
- **리워드 광고 경로는 추가하지 않았습니다.** 두 시뮬레이션 모두 AC-REWARD에 따라 해당 없음으로 봤습니다.

---

# Return Window Board (return-window-board)
앱 이름: 반품 마감 보드 / Return Window Board

## Mini-PRD
- **한줄 요약**: 산 지 며칠 됐더라? 온라인 주문의 반품·청약철회 마감일을 D-day로 모아 보여 줘요.
- **문제**: 기한이 상품마다 달라요. 단순 변심은 수령일부터 7일, 상품 하자나 광고와 다른 경우는 3개월이에요. 택배를 열어 보고 마음이 바뀌어도 마감을 놓치기 쉽고, 쇼핑몰 마이페이지는 쇼핑몰마다 따로 있어요.
- **목표**: 등록한 건 중 '반품 신청함' 또는 '계속 쓰기로 함'으로 마감 전에 결정한 건이 60% 이상이 되게 한다. 나머지는 '기한 지남'으로 끝난 건이다. 외부 로깅을 하지 않으므로 기기 안 보관함 상태로만 판정한다.
- **타겟 유저**: 온라인 쇼핑을 자주 하며 반품·청약철회 기한을 놓쳐 본 20~40대 소비자. 의류·가전을 사서 써 보고 결정하는 사람, 해외직구 이용자를 포함한다.
- **핵심 기능**:
  1. 상품명·구매처·수령일과 기한 유형을 등록하면 철회 마감일과 D-day를 자동으로 계산한다. 등록·수정·삭제가 된다.
     - 단순 변심 7일
     - 하자·광고와 다름 3개월
     - 구매처 자체 기한 N일
  2. D-day 보드: 마감 임박순으로 정렬하고 오늘 마감 건을 강조한다. 기한이 지났거나 처리를 마친 건은 보관함으로 자동 이동한다.
  3. 상세 화면은 세 가지를 보여 준다.
     - 수령일 기준과 사용 시작일 기준의 마감 차이
     - 사용 시 철회 제한 안내
     - 환불 신청 체크리스트(증빙·포장 상태). 프리셋을 넣어 두고 항목을 추가·삭제할 수 있다.
- **비목표**:
  - 쇼핑몰 주문 자동 연동이나 크롤링을 하지 않는다. 입력은 직접 한다.
  - 푸시 알림·리마인더를 보내지 않는다.
  - 쇼핑몰에 반품 신청을 대신 접수하거나 외부 링크로 이동시키지 않는다.
  - 법률 자문을 하지 않는다. 개별 분쟁 판단은 하지 않는다.
- **수익 모델**: 배너 (Home 하단 1개, Result 하단 1개). 리워드 게이트는 없다. 체크리스트와 안내가 핵심 기능이라 잠글 만한 더 깊은 층이 없다.
  - 예상 월 순수익 = DAU 15 × 하루 조회 2회 × 30 × (2,648 ÷ 1,000) × 0.85 ≈ **2,026원/월**
  - 출시 직후 기저선 DAU 15명으로 계산했다. 외부 유입 채널 근거가 없어 더 큰 DAU는 쓰지 않았다.

## Value Contract
- 결과: 이 앱을 쓰고 나면 사용자는 마감 전에 안 쓸 상품을 반품할지, 그대로 쓸지 정한다.
- 바뀌는 행동: 기한이 지나 "그냥 쓰자"로 넘기던 상품에 대해, D-day가 0~2일 남았을 때 구매처 반품 신청을 한다.
- 매번 얻는 결과물: 사용자가 등록한 상품명 그대로 한 줄씩 나오는 목록이다. 각 줄에 마감일과 D-day가 붙고, 마감 임박순으로 정렬되며 오늘 마감 건은 강조된다. 상단에는 "오늘 마감 N건 · 3일 안에 M건" 요약이 나온다.
- 앱이 더하는 것:
  - 기한 유형별 법정 철회 기한을 적용한 마감일 계산
    - 수령일부터 7일 (전자상거래법 제17조 ①)
    - 공급받은 날부터 3개월 (제17조 ③)
  - 기간 계산 규칙
    - 초일 불산입 (민법 제157조)
    - 월 단위 기간에서 해당일이 없으면 그 달 말일 (민법 제160조)
  - 사용·일부 소비로 가치가 현저히 줄면 철회가 제한된다는 안내 (제17조 ②)
  - 유형별 반품 비용 부담 주체 안내 (전자상거래법 제18조)
- 앱 없이: 쇼핑몰마다 주문 내역을 열어 수령일을 확인한다. 달력에서 7일·3개월을 세어 메모나 알림에 적는다. 상품당 약 1~2분이 걸리고, 결과가 여러 곳에 흩어진다.
- Value AC: F2-AC-1

## SPEC

### F1: 반품 건 등록·수정·삭제와 마감일 계산
- AC-1: [E] 사용자가 등록 BottomSheet에서 필수값(상품명·구매처·수령일·기한 유형)을 채우고 "저장하기"를 누르면 세 가지가 일어난다.
  - 진행 중 목록에 입력한 상품명 그대로 한 줄이 추가된다.
  - 해당 건이 localStorage 키 `rwb:items:v1`에 저장된다.
  - 앱을 다시 열어도 같은 건이 같은 마감일로 표시된다.
- AC-2: [U] 기한 유형이 "단순 변심 (7일)"이면 마감일은 수령일 + 7일이다.
  - 근거: 초일 불산입(민법 제157조), 전자상거래법 제17조 ①
  - 예: 수령일 2026-10-01 → 마감 2026-10-08
- AC-3: [U] 기한 유형이 "하자·광고와 다름 (3개월)"이면 마감일은 수령일과 같은 날짜의 3개월 뒤다. 그 달에 해당일이 없으면 그 달 말일이다.
  - 근거: 민법 제160조, 전자상거래법 제17조 ③
  - 예: 2026-10-01 → 2027-01-01
  - 예: 2026-11-30 → 2027-02-28
  - 예: 2027-11-30 → 2028-02-29
- AC-4: [U] 기한 유형이 "구매처 정책"이면 일수 입력칸(정수 1~365)이 나타나고, 마감일은 수령일 + N일이다.
  - 예: 수령일 2026-10-01, N=30 → 2026-10-31
- AC-5: [E] 수정과 삭제는 다음처럼 동작한다.
  - 상세(Result)에서 "수정"을 누르면 등록과 같은 BottomSheet가 기존 값이 채워진 채로 열린다. 저장하면 마감일이 다시 계산되어 목록과 상세에 반영된다.
  - "삭제"를 누르면 AlertDialog("이 건을 삭제할까요?")가 뜬다. 확인을 누르면 저장소에서 지워지고 홈(/)으로 돌아가며, 목록에 그 건이 없다.
- AC-6: [W] 날짜 입력은 이렇게 검증한다.
  - 수령일이 오늘보다 뒤면 저장 버튼이 비활성되고, 수령일 TextField help에 "수령일은 오늘 이후일 수 없어요"가 표시된다.
  - 사용 시작일이 수령일보다 앞이면 help에 "사용 시작일은 수령일 이후여야 해요"가 표시되고 저장 버튼이 비활성된다.
- AC-7: [U] 구매처 TextField 아래에 이전에 저장한 구매처 이름이 ChipItem으로 나온다.
  - 공백을 제거하고 같은 이름은 하나만 남긴다. 최근 등록순으로 최대 5개다.
  - 칩을 탭하면 구매처 TextField 값이 그 이름으로 채워진다.
  - 저장된 건이 0개면 칩 영역을 렌더링하지 않는다.

### F2: D-day 보드 (Home)
- AC-1: [E] Given 진행 중 건 3개(마감까지 5일·0일·2일 남음)가 저장돼 있다. When 사용자가 Home(/)에 들어간다. Then "진행 중" 탭에 3줄이 "D-DAY → D-2 → D-5" 순서로 표시된다. 각 줄에는 사용자가 입력한 상품명, 구매처, 마감일("10월 15일 (목)" 형식), D-day 텍스트가 함께 보인다.
- AC-2: [S] 오늘 마감인 건(D-0)이 있으면 두 가지가 보인다.
  - 해당 줄에 "오늘 마감" Badge
  - 목록 위 요약 문구 "오늘 마감 {n}건 · 3일 안에 {m}건". m은 D-1~D-3 건수다.
  - 둘 다 0건이면 요약은 "가장 가까운 마감: {상품명} D-{n}"이다.
- AC-3: [S] 오늘이 마감일보다 뒤인 진행 중(active) 건은 "진행 중" 탭에 나오지 않는다. 대신 "보관함" 탭에 "기한 지남" 라벨과 함께 표시된다. 저장된 status 값은 바꾸지 않고, 날짜로 판단한다.
- AC-4: [E] 상세에서 상태를 바꾸면 보관함과 진행 중 사이를 오간다.
  - "반품 신청함" 또는 "계속 쓰기로 함"을 누르면 status가 저장되고, 그 건이 "보관함" 탭에 해당 라벨("반품 신청함"/"계속 쓰기로 함")로 표시된다.
  - 보관함 건 중 기한이 지나지 않은 건만 상세에 "진행 중으로 되돌리기" 버튼이 보인다. 누르면 "진행 중" 탭으로 돌아간다.
- AC-5: [E] 목록의 한 줄(ListRow)을 탭하면 `/result/{id}`로 이동한다.
- AC-6: [U] 마감일이 같은 건은 등록 시각(createdAt)이 빠른 순서로 정렬된다. 보관함 탭은 마감일이 늦은 순서로 정렬된다.
- AC-7: [U] Home 목록 아래에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 배너가 1개 렌더링된다. 목록 줄 사이에 끼워 넣지 않는다.

### F3: 상세 — 기한 근거·사용 시작일 차이·환불 체크리스트 (Result)
- AC-1: [U] 상세 상단(핵심 답)에 다음이 표시된다.
  - 상품명, 마감일, D-day
  - 적용 규칙과 출처 한 줄. 유형별 문구는 아래와 같다.
    - 7일: "수령일부터 7일 · 전자상거래법 제17조 ①"
    - 3개월: "공급받은 날부터 3개월 · 전자상거래법 제17조 ③"
    - 구매처 정책: "구매처 정책 {N}일 · 구매처 안내 기준"
- AC-2: [S] 수령일 기준과 사용 시작일 기준을 비교해 안내한다.
  - 사용 시작일이 입력됐고 수령일보다 뒤면 "사용 시작일로 세면 {사용시작일 기준 마감}이지만, 기한은 수령일부터 세서 실제 마감은 {마감일}이에요 — {n}일 빨라요"가 표시된다.
    - 예: 수령 10/01, 사용 시작 10/04, 7일 규칙 → "…10월 11일 (일)이지만 … 10월 8일 (목)이에요 — 3일 빨라요"
  - 사용 시작일이 없거나 수령일과 같으면 "기한은 상품을 받은 날부터 세요" 한 줄만 표시된다.
- AC-3: [U] 기한 유형이 "단순 변심 (7일)"이면 "써 보거나 일부를 소비해 가치가 크게 줄면 철회가 제한될 수 있어요. 내용 확인을 위한 포장 개봉은 예외예요 (제17조 ②)" 안내가 표시된다. 다른 유형에서는 표시되지 않는다.
- AC-4: [E] 환불 체크리스트는 이렇게 동작한다.
  - 건을 처음 저장하면 프리셋 항목이 시드된다. 하자·광고와 다름 유형에는 "하자 부위 사진·영상 남기기"가 하나 더 붙는다.
  - 항목마다 체크 토글이 즉시 저장된다. 다시 진입해도 체크 상태가 유지된다.
  - 하단 TextField + "추가" 버튼으로 항목을 추가할 수 있다. 1~30자이고, 빈 값이면 추가 버튼이 비활성된다.
  - 항목별 "삭제"로 지울 수 있다.
  - 제목 옆에 "{완료}/{전체} 완료"가 표시된다.
- AC-5: [U] 반품 비용 안내 한 줄을 표시한다. 유형별 문구는 아래와 같다.
  - 단순 변심: "반품 배송비는 보통 내가 부담해요 (전자상거래법 제18조)"
  - 하자·광고와 다름: "반품 비용은 판매자가 부담해요 (전자상거래법 제18조)"
  - 구매처 정책: "배송비 부담은 구매처 안내를 확인하세요"
- AC-6: [W] `/result/{id}`의 id가 저장소에 없으면 "찾을 수 없는 건이에요" 문구와 "목록으로" 버튼을 표시한다. 버튼을 누르면 /로 이동한다.
- AC-7: [U] 기한 유형이 "하자·광고와 다름 (3개월)"이면 "하자를 안 날(알 수 있었던 날)부터 30일 이내라는 조건도 함께 있어요 (제17조 ③)" 안내가 표시된다. 앱은 이 30일을 계산하지 않는다(Open Questions 2).

### 필수 AC (모든 QuickApp에 포함)
- AC-INPUT-1: [W] 필수값(상품명·구매처·수령일·기한 유형, 구매처 정책이면 일수)이 하나라도 비어 있으면 처리는 이렇다.
  - "저장하기" CTA가 비활성된다.
  - SubmitFooter hint에 첫 번째 빈 항목 이유가 한 줄로 표시된다. 예: "상품명을 입력해 주세요"
  - TextField hasError는 해당 칸을 한 번 건드린(blur) 뒤에만 true다. 시트가 처음 열릴 때는 빨간 칸이 0개다.
- AC-INPUT-2: [W] 범위 밖 입력은 help 텍스트로 안내한다.
  - 상품명이 40자를 넘으면 "40자 이내로 입력해 주세요"
  - 구매처 정책 일수가 0 이하·365 초과·정수 아님이면 "1~365일 사이 숫자로 입력해 주세요"
  - 날짜 범위 오류는 F1-AC-6을 따른다.
- AC-EMPTY: [S] 저장된 건이 0개면 Home에 Empty State(TDS Pattern E)가 표시된다. 문구는 "아직 등록한 주문이 없어요" / "받은 날만 넣으면 반품 마감일을 계산해 드려요"이고, 버튼은 "첫 주문 등록하기"다. 보관함 탭이 비어 있으면 "보관함이 비어 있어요"가 표시된다.
- AC-LOADING: [S] 저장소를 처음 읽는 동안 Home과 Result에 Skeleton(또는 Spinner)이 표시되고, 목록·상세는 렌더링되지 않는다.
- AC-ERROR: [W] 저장소 JSON 파싱에 실패하는 등 예외가 나면 다음이 표시된다.
  - "저장된 목록을 불러오지 못했어요" 문구
  - "다시 시도" 버튼: 저장소를 다시 읽는다.
  - 앱이 흰 화면으로 멈추지 않는다.
- AC-A11Y-1: [U] 모든 Button·TextField·ChipItem·체크 항목에 aria-label이 있다. 예: `aria-label="저장하기"`, `aria-label="수령일"`
- AC-A11Y-2: [U] 모든 터치 타겟은 최소 44×44px이다. TDS 기본 크기를 쓰고, 크기를 덮어쓰는 커스텀 스타일은 0개다.
- AC-A11Y-3: [U] 색상은 vars.color 토큰만 쓴다. `src/` 안에 `#[0-9a-fA-F]{3,6}` HEX 하드코딩이 0건이다.
- AC-REWARD: [U] 이 앱은 TossRewardAd 게이트를 두지 않는다. 체크리스트·안내는 무료 핵심 기능이고 잠글 만한 더 깊은 층이 없다. `src/pages`에서 `TossRewardAd` import가 0건이고, 수익은 배너(AdSlot)만으로 낸다.
- AC-FORMAT: [U] 화면의 숫자와 날짜 형식은 다음과 같다.
  - 건수·일수 숫자: formatNumber 사용
  - 날짜: `formatKoreanDate`로 "10월 15일 (목)" 형식. 올해가 아니면 "2027년 1월 1일 (금)"
- AC-REVIEW-1: [W] 외부 도메인 링크(`<a href="http…">`, `window.open`, `location.href = 외부`)가 0건이다.
- AC-REVIEW-2: [U] 정상 흐름(등록→목록→상세→체크→상태 변경→삭제)에서 console.error가 0건이다.
- AC-REVIEW-3: [W] GA·Amplitude 등 외부 로깅 SDK import와 네트워크 호출이 0건이다.
- AC-KEYBOARD: [E] BottomSheet 안 TextField에 포커스가 가면 해당 칸이 `scrollIntoView({ block: 'center' })`로 보이는 위치에 온다. "저장하기" 버튼이 키보드에 가려지지 않는다(SubmitFooter가 키보드 위에 표시됨).
- AC-AD-FAIL: [W] 배너 광고를 불러오지 못해도 화면은 그대로 동작한다. 실패 상황은 광고 응답 없음, AdSlot 내부 예외, `VITE_TOSS_AD_GROUP_ID` 빈 값이다.
  - Home의 요약·Tab·목록·"반품 건 추가" 버튼과 Result의 핵심 답·안내·체크리스트·상태 버튼이 정상 표시되고 동작한다.
  - AC-ERROR 화면("저장된 목록을 불러오지 못했어요")으로 바뀌지 않고, 흰 화면으로 멈추지 않는다.
  - 광고 자리에 깨진 이미지 아이콘이나 오류 문구가 보이지 않는다. 광고 영역은 아무것도 렌더링하지 않는다.
  - 템플릿 AdSlot은 고치지 않는다. 페이지에서 `AdBoundary`(React error boundary, fallback `null`)로 감싼다.
  - 검증: AdSlot이 렌더 중 throw하도록 mock하면 위 세 조건이 모두 성립한다.
- AC-STORAGE-WRITE-1: [W] 등록·수정 중 "저장하기"에서 저장소 쓰기가 실패하면(`localStorage.setItem`이 `QuotaExceededError` 등 예외를 던짐) 다음처럼 처리한다.
  - ItemFormSheet가 닫히지 않고, 입력값이 그대로 남는다.
  - SubmitFooter hint에 "저장하지 못했어요. 보관함의 지난 건을 삭제한 뒤 다시 시도해 주세요"가 표시된다.
  - 진행 중 목록에 새 줄이 추가되지 않는다. 수정이면 목록과 상세가 수정 전 값과 마감일 그대로다.
  - 저장소 값(`rwb:items:v1`)이 실패 전과 같다(일부만 쓰인 상태 없음).
  - "저장하기"는 활성 상태로 남아 다시 누를 수 있다.
- AC-STORAGE-WRITE-2: [W] Result에서 체크 토글, 항목 추가·삭제, 상태 변경("반품 신청함"/"계속 쓰기로 함"/"진행 중으로 되돌리기") 중 저장소 쓰기가 실패하면 화면을 실패 전 상태로 되돌린다.
  - 체크 토글: Switch가 원래 위치로 돌아가고 "{완료}/{전체} 완료" 숫자도 원래 값이다.
  - 항목 추가: 목록에 새 항목이 없고, 추가 TextField 입력값은 남는다.
  - 항목 삭제: 지운 항목이 같은 자리에 다시 보인다.
  - 상태 변경: 상태 버튼과 탭 위치가 바뀌지 않는다(보관함으로 이동하거나 진행 중으로 돌아가지 않음).
  - TDS Toast로 "저장하지 못했어요. 다시 시도해 주세요"가 표시된다.
  - 새로고침하면 실패 전 값이 보인다.
- AC-STORAGE-WRITE-3: [W] 삭제 AlertDialog에서 확인을 눌렀는데 저장소 쓰기가 실패하면 다음처럼 처리한다.
  - 홈(/)으로 이동하지 않고 Result에 그 건이 그대로 표시된다.
  - AlertDialog가 닫히고 TDS Toast로 "삭제하지 못했어요. 다시 시도해 주세요"가 표시된다.
  - Home 목록에도 그 건이 남아 있다.

### Screen Definitions

#### Home (/)
- `Top`: 제목 "반품 마감 보드"
- 요약 `Paragraph.Text` (F2-AC-2)
- `Tab`: "진행 중 {n}" / "보관함 {n}"
- `ListRow` 목록. 각 줄은 다음으로 구성된다.
  - 주 텍스트: 상품명
  - 보조 텍스트: 구매처 · 마감일
  - 오른쪽: D-day 텍스트, D-0이면 Badge "오늘 마감", 보관함이면 상태 라벨
- `Spacing` 뒤에 `AdSlot` (`AdBoundary`로 감쌈, AC-AD-FAIL)
- 하단 고정 `Button` "반품 건 추가" → `ItemFormSheet`(BottomSheet) 열기
- `ItemFormSheet`(등록·수정 공용 BottomSheet)
  - 입력 칸
    - TextField 상품명
    - TextField 구매처 + 최근 구매처 Chip/ChipItem
    - TextField(type="date") 수령일. 기본값은 오늘.
    - 기한 유형 Chip: "단순 변심 7일" · "하자·광고와 다름 3개월" · "구매처 정책"
    - (구매처 정책일 때) TextField 일수
    - TextField(type="date") 사용 시작일 (선택)
  - 미리보기 한 줄: "마감: 10월 15일 (목) · D-7"
  - SubmitFooter "저장하기" (쓰기 실패 시 hint, AC-STORAGE-WRITE-1)
- 상태: 로딩(Skeleton) · Empty · 목록 · 오류(재시도)
- 네비게이션: 줄 탭 → `/result/:id`

#### Result (/result/:id)
- `Top`: 상품명
- 핵심 답 (무료): 마감일 · D-day · 적용 규칙과 출처 (F3-AC-1)
- 수령일 vs 사용 시작일 안내 (F3-AC-2), 사용 제한 안내 (F3-AC-3) 또는 30일 조건 안내 (F3-AC-7)
- 반품 비용 안내 (F3-AC-5)
- 체크리스트 섹션 (F3-AC-4)
  - 체크 토글 항목은 `ListRow` + `Switch`
  - 추가: `TextField` + `Button`
- 상태 버튼
  - 진행 중일 때: "반품 신청함" · "계속 쓰기로 함"
  - 보관함이고 기한 전일 때: "진행 중으로 되돌리기"
- "수정"(ItemFormSheet 재사용), "삭제"(AlertDialog)
- 쓰기 실패 `Toast` (AC-STORAGE-WRITE-2, AC-STORAGE-WRITE-3)
- `AdSlot` 1개 (하단, `AdBoundary`로 감쌈, AC-AD-FAIL)
- TossRewardAd 없음 (AC-REWARD)
- 상태: 로딩 · 상세 · 찾을 수 없음 (F3-AC-6) · 오류
- "목록으로" → `/`

### Data Model
```typescript
// src/lib/types.ts

// 법정 기준 + 사용자 지정 일수 — 법정 공개 기준(제17조 ①③)이라 닫힌 집합 예외. 사용자 분류 아님.
export type DeadlineRule = 'change_of_mind_7d' | 'mismatch_3m' | 'store_policy_days';

// 앱 로직이 쓰는 처리 상태 (사용자 분류 아님). 'expired'는 저장하지 않고 날짜로 파생.
export type ItemStatus = 'active' | 'returned' | 'kept';

export interface ChecklistItem {
  id: string;
  label: string;      // 1~30자, 사용자 수정·추가·삭제 가능
  done: boolean;
}

export interface ReturnItem {
  id: string;
  productName: string;      // 1~40자
  store: string;            // 구매처 자유 입력 (닫힌 목록 아님)
  receivedDate: string;     // 'YYYY-MM-DD' (로컬 날짜)
  useStartDate?: string;    // 'YYYY-MM-DD', >= receivedDate
  rule: DeadlineRule;
  storePolicyDays?: number; // rule === 'store_policy_days'일 때 1~365 정수
  checklist: ChecklistItem[];
  status: ItemStatus;
  closedAt?: string;        // status 변경 시각 ISO
  createdAt: string;        // ISO
}

export interface ItemFormInput {
  productName: string;
  store: string;
  receivedDate: string;
  useStartDate: string;     // '' = 미입력
  rule: DeadlineRule | null;
  storePolicyDays: string;  // TextField 원문
}

export interface DeadlineInfo {
  deadline: string;         // 'YYYY-MM-DD'
  dDay: number;             // deadline - today (일), 음수 = 지남
  isToday: boolean;
  isExpired: boolean;
  useStartBasedDeadline?: string; // 사용 시작일로 셌을 때 (안내용)
  daysEarlier?: number;           // useStartBased - deadline
}

export type BoardSection = 'active' | 'archive';
export type ArchiveReason = 'returned' | 'kept' | 'expired';

// Route params (react-router) — 새로고침에도 유지되도록 state 대신 URL id + 저장소 조회
export interface ResultParams { id: string }
```

## TASK

### Epic 1: Data Layer

**Task 1: 타입 정의**
- Files: `src/lib/types.ts`
- Covers: F1-AC-1 (저장 형태)
- DoD:
  - 위 Data Model이 그대로 export된다.
  - `tsc --noEmit` 오류 0
  - 사용자 분류용 유니온 타입은 0개다. 구매처·체크리스트는 string/목록이다.

**Task 2: 마감일 계산 (순수 함수)**
- Files: `src/lib/deadline.ts`
- Covers: F1-AC-2, F1-AC-3, F1-AC-4, F2-AC-3, F2-AC-6, F3-AC-2, AC-FORMAT(날짜)
- 함수와 DoD
  - `addDays(date, n)`, `addMonthsClamped(date, n)`
  - `computeDeadline(item, today)`는 DeadlineInfo를 반환한다. today를 인자로 받아 테스트할 수 있게 한다.
  - `sortActive(items, today)`, `sortArchive(items, today)`, `archiveReason(item, today)`
  - `formatKoreanDate(date, today)`
  - 아래 표의 결과가 모두 일치한다.

| 수령일 | 규칙 | 기대 마감 |
|---|---|---|
| 2026-10-01 | 7일 | 2026-10-08 |
| 2026-10-01 | 3개월 | 2027-01-01 |
| 2026-11-30 | 3개월 | 2027-02-28 |
| 2027-11-30 | 3개월 | 2028-02-29 |
| 2026-10-01 | 정책 30일 | 2026-10-31 |

  - 사용 시작일 10-04, 7일 규칙이면 useStartBasedDeadline은 2026-10-11, daysEarlier는 3이다.
  - Date 객체 대신 'YYYY-MM-DD' 정수 연산을 쓴다. UTC로 바뀌면서 날짜가 하루 밀리면 안 된다.

**Task 3: 저장소 모듈**
- Files: `src/lib/itemsStore.ts`, `src/lib/checklistPresets.ts`
- Covers: F1-AC-1, F1-AC-5(저장·삭제), F1-AC-7(recentStores), F3-AC-4(시드·변경), F2-AC-4(status 변경), AC-ERROR(파싱 실패 throw), AC-STORAGE-WRITE-1~3(쓰기 실패 throw·원자성)
- 함수와 DoD
  - 템플릿 `storage.ts`를 쓴다. 키는 `rwb:items:v1`이다.
  - `loadItems()`, `addItem(input)`, `updateItem(id, input)`, `deleteItem(id)`, `setStatus(id, status)`
  - 체크리스트: `toggleCheck(id, checkId)`, `addCheck(id, label)`, `removeCheck(id, checkId)`
  - `recentStores(items)`는 공백을 제거하고 같은 이름을 하나로 합친 뒤 최근순 최대 5개를 반환한다.
  - 프리셋 시드
    - 주문번호·결제 내역 캡처해 두기
    - 받은 상태 사진 찍기 (상자·상품·구성품)
    - 구성품·사은품·포장재 모두 챙기기
    - 택·라벨 떼지 않기
    - 구매처 반품 메뉴에서 신청 접수하기
    - mismatch_3m이면 "하자 부위 사진·영상 남기기"를 추가한다.
  - JSON이 깨졌으면 `StoreReadError`를 throw한다. 저장소를 덮어쓰지 않는다.
  - 쓰기 함수 8개(add·update·delete·setStatus·toggle·addCheck·removeCheck 포함)는 다음을 지킨다.
    - 새 배열을 다 만든 뒤 한 번만 `setItem`한다.
    - `setItem`이 throw하면 `StoreWriteError`를 throw하고, 메모리 캐시와 저장소 값을 실패 전과 같게 둔다.
    - 테스트: `setItem`을 `QuotaExceededError`로 throw하게 mock하면 각 함수가 `StoreWriteError`를 던지고 `loadItems()` 결과가 호출 전과 같다.

### Epic 2: Pages

**Task 4: 등록·수정 BottomSheet**
- Files: `src/components/ItemFormSheet.tsx`, `src/lib/validateForm.ts`
- Covers: F1-AC-4(일수 칸 노출), F1-AC-5(수정 시 기존값), F1-AC-6, F1-AC-7(칩 UI), AC-INPUT-1, AC-INPUT-2, AC-KEYBOARD, AC-A11Y-1(폼), AC-STORAGE-WRITE-1
- DoD
  - 화면 정의의 필드를 TDS BottomSheet·TextField·Chip/ChipItem·SubmitFooter로만 구성한다.
  - `validateForm(input, today)`가 `{ valid, firstHint, fieldErrors }`를 반환한다.
  - touched 상태를 추적해 blur 전에는 hasError가 false다.
  - 마감 미리보기 한 줄을 표시한다(Task 2의 computeDeadline 사용).
  - focus 시 scrollIntoView를 호출한다.
  - `mode: 'create' | 'edit'`와 `initial?: ReturnItem`을 받는다.
  - 저장 중 `StoreWriteError`를 받으면 시트를 닫지 않는다. 입력값을 유지하고 AC-STORAGE-WRITE-1 hint 문구를 표시하며, 버튼은 활성 상태로 둔다.

**Task 5: Home (D-day 보드)**
- Files: `src/pages/Home.tsx`, `src/components/AdBoundary.tsx`
- Covers: F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-6, F2-AC-7, AC-EMPTY, AC-LOADING, AC-ERROR, AC-FORMAT, AC-AD-FAIL(Home)
- DoD
  - 진행 중/보관함 Tab, 정렬, 오늘 마감 Badge, 요약 문구를 구현한다.
  - 보관함 라벨은 "반품 신청함"/"계속 쓰기로 함"/"기한 지남"이다.
  - Empty State, Skeleton, 오류 + "다시 시도"를 구현한다.
  - "반품 건 추가"로 ItemFormSheet(create)를 열고, 저장하면 목록이 즉시 갱신된다.
  - 목록 아래에 AdSlot이 1개 있다.
  - 여백은 Spacing만 쓰고, 인라인 padding/margin은 0개다.
  - `AdBoundary`는 class 컴포넌트 error boundary이고, 오류가 나면 `null`을 렌더링한다. AdSlot은 이것으로 감싼다. AdSlot 자체는 수정하지 않는다.
  - AdSlot throw를 mock해도 목록·Tab·"반품 건 추가"가 보이고, AC-ERROR 화면이 뜨지 않는다.

**Task 6: Result (상세)**
- Files: `src/pages/Result.tsx`
- Covers: F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-7, F2-AC-4, F1-AC-5(수정·삭제 진입), AC-LOADING, AC-ERROR, AC-FORMAT, AC-AD-FAIL(Result), AC-STORAGE-WRITE-2, AC-STORAGE-WRITE-3
- DoD
  - `useParams` id로 저장소를 조회한다.
  - 핵심 답(마감·D-day·출처)을 화면 맨 위에 둔다.
  - 유형별 안내 문구가 F3 AC 문구와 글자 단위로 일치한다.
  - 체크리스트 토글·추가·삭제가 새로고침 후에도 유지된다.
  - 상태 버튼은 노출 조건(F2-AC-4)을 지킨다.
  - 삭제 AlertDialog에서 확인하면 `/`로 navigate한다.
  - 하단 AdSlot이 1개 있고, TossRewardAd는 없다.
  - 하단 AdSlot을 `AdBoundary`로 감싼다.
  - 체크·항목·상태 변경에서 `StoreWriteError`가 나면 화면 상태를 실패 전 값으로 되돌리고 Toast "저장하지 못했어요. 다시 시도해 주세요"를 표시한다. 항목 추가 실패 시 입력값은 유지한다.
  - 삭제에서 `StoreWriteError`가 나면 navigate하지 않는다. AlertDialog를 닫고 Toast "삭제하지 못했어요. 다시 시도해 주세요"를 표시한다.

### Epic 3: Integration

**Task 7: 라우팅 연결과 검수 점검**
- Files: `src/App.tsx`
- Covers: F2-AC-5, AC-REWARD, AC-REVIEW-1, AC-REVIEW-2, AC-REVIEW-3, AC-A11Y-1(전체), AC-A11Y-2, AC-A11Y-3
- DoD
  - Routes는 `/` → Home, `/result/:id` → Result다. 알 수 없는 경로는 `/`로 Navigate한다.
  - 줄을 탭하면 이동한다.
  - grep 결과가 모두 0건이다.
    - HEX 색상
    - `http` 링크와 `window.open`
    - `TossRewardAd` (pages 안)
    - GA·Amplitude
    - aria-label 없는 Button/TextField
  - 수동 흐름(등록→목록→상세→체크→반품 신청함→보관함→되돌리기→삭제)에서 console.error가 0건이다.

## AC Coverage
- 전체: 39개 (F1 7 · F2 7 · F3 7 · 필수 18)
- 커버: 39개 (100%)
- 미커버: 0개

| AC | Task |
|---|---|
| F1-AC-1 | T1, T3 |
| F1-AC-2~4 | T2 (F1-AC-4 노출은 T4) |
| F1-AC-5 | T3, T4, T6 |
| F1-AC-6 | T4 |
| F1-AC-7 | T3, T4 |
| F2-AC-1~3, F2-AC-6~7 | T5 (정렬·판정 로직 T2) |
| F2-AC-4 | T3, T6 |
| F2-AC-5 | T7 |
| F3-AC-1~7 | T6 (F3-AC-2 계산 T2, F3-AC-4 저장 T3) |
| AC-INPUT-1/2, AC-KEYBOARD | T4 |
| AC-EMPTY | T5 |
| AC-LOADING, AC-ERROR | T5, T6 (AC-ERROR throw는 T3) |
| AC-FORMAT | T2, T5, T6 |
| AC-A11Y-1 | T4, T7 |
| AC-A11Y-2/3, AC-REWARD, AC-REVIEW-1~3 | T7 |
| AC-AD-FAIL | T5 (AdBoundary), T6 |
| AC-STORAGE-WRITE-1 | T3, T4 |
| AC-STORAGE-WRITE-2, AC-STORAGE-WRITE-3 | T3, T6 |

## Open Questions
1. **공휴일 연장**: 마감일이 공휴일이면 다음 날 만료된다는 규칙(민법 제161조)을 MVP는 적용하지 않는다. 더 이른 날짜를 보여 주는 쪽이 놓칠 위험이 적기 때문이다. 공휴일 데이터를 내장해 반영할지 정해야 한다.
2. **제17조 ③의 30일 조건**: "그 사실을 안 날부터 30일" 조건을 지금은 안내 문구로만 보여 준다. '하자 발견일' 입력을 받아 3개월과 30일 중 어떤 기준을 마감으로 보여 줄지 정해야 한다. 법 해석이 필요하다.
3. **해외직구**: 해외 판매처에 전자상거래법 철회 규정이 적용되는지 이 앱은 판단하지 않는다. 해외직구 건은 '구매처 정책' 유형을 권장하는 안내를 넣을지 정해야 한다.
4. **서면 수령일이 더 늦은 경우**: 제17조 ①은 계약서면을 받은 날과 공급일이 다를 때 늦은 날을 기준으로 할 수 있다. MVP는 수령일만 기준으로 한다. 별도 입력이 필요한지 정해야 한다.
5. **결제 금액 입력**: 결제 금액을 받아 "마감 전에 결정할 금액 합계"나 "기한이 지나 못 돌려받은 금액"을 보여 줄지 정해야 한다. 브리프에 없는 기능이라 넣지 않았다.

---
참고: claude.ai Canva 커넥터는 인증이 필요해 이 세션에서는 쓸 수 없습니다. 쓰려면 claude.ai 커넥터 설정에서 Canva를 연결해 주세요. 이번 작업에는 필요하지 않았습니다.