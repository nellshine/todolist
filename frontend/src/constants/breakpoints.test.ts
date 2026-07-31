import { describe, it, expect } from 'vitest';
import { BREAKPOINT_TABLET, BREAKPOINT_DESKTOP } from './breakpoints';

describe('breakpoints', () => {
  it('태블릿/데스크톱 브레이크포인트 값이 PRD 7.4절 기준과 일치한다', () => {
    expect(BREAKPOINT_TABLET).toBe(768);
    expect(BREAKPOINT_DESKTOP).toBe(1024);
  });
});
