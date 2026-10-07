import { Component } from 'react';
import type { ReactNode } from 'react';

/**
 * 광고 전용 error boundary — AdSlot이 렌더 중 throw해도 화면은 그대로 두고 광고 자리만 비운다(AC-AD-FAIL).
 * 템플릿 AdSlot은 고치지 않고 페이지에서 이것으로 감싼다.
 */
export class AdBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    /* 광고 실패는 사용자 흐름과 무관 — 조용히 비운다 */
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** 광고 그룹 ID — 콘솔 발급값(VITE_TOSS_AD_GROUP_ID). 비어 있으면 광고 영역을 그리지 않는다. */
export function adGroupId(): string {
  const v = import.meta.env.VITE_TOSS_AD_GROUP_ID;
  return typeof v === 'string' ? v.trim() : '';
}
