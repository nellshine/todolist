import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORY_NAME } from './category';

describe('DEFAULT_CATEGORY_NAME', () => {
  it("'기본' 값을 가진다", () => {
    expect(DEFAULT_CATEGORY_NAME).toBe('기본');
  });
});
