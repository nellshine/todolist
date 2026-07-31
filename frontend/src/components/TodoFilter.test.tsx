import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoFilter from './TodoFilter';
import { useTodoFilterStore } from '../store/todoFilterStore';
import type { Category } from '../types';

const categories: Category[] = [
  { id: 'cat-1', ownerId: 'owner-1', name: '업무', isDefault: false, createdAt: '2026-07-30T00:00:00.000Z' },
  { id: 'cat-2', ownerId: 'owner-1', name: '개인', isDefault: false, createdAt: '2026-07-30T00:00:00.000Z' },
];

describe('TodoFilter', () => {
  beforeEach(() => {
    useTodoFilterStore.setState({ categoryId: null, status: null });
  });

  it('데스크톱 카테고리 라디오 선택 시 store가 갱신된다', async () => {
    const user = userEvent.setup();
    render(<TodoFilter categories={categories} onManageCategories={vi.fn()} />);

    const desktopCategory = within(screen.getByTestId('category-filter-desktop'));
    await user.click(desktopCategory.getByRole('radio', { name: '업무' }));
    expect(useTodoFilterStore.getState().categoryId).toBe('cat-1');

    await user.click(desktopCategory.getByRole('radio', { name: '개인' }));
    expect(useTodoFilterStore.getState().categoryId).toBe('cat-2');

    await user.click(desktopCategory.getByRole('radio', { name: '전체' }));
    expect(useTodoFilterStore.getState().categoryId).toBeNull();
  });

  it('데스크톱 상태 토글 버튼 선택 시 store가 갱신된다', async () => {
    const user = userEvent.setup();
    render(<TodoFilter categories={categories} onManageCategories={vi.fn()} />);

    const desktopStatus = within(screen.getByTestId('status-filter-desktop'));

    await user.click(desktopStatus.getByRole('radio', { name: '시작 전' }));
    expect(useTodoFilterStore.getState().status).toBe('NOT_STARTED');

    await user.click(desktopStatus.getByRole('radio', { name: '진행중' }));
    expect(useTodoFilterStore.getState().status).toBe('IN_PROGRESS');

    await user.click(desktopStatus.getByRole('radio', { name: '완료' }));
    expect(useTodoFilterStore.getState().status).toBe('COMPLETED');

    await user.click(desktopStatus.getByRole('radio', { name: '기한초과' }));
    expect(useTodoFilterStore.getState().status).toBe('OVERDUE');

    await user.click(desktopStatus.getByRole('radio', { name: '전체' }));
    expect(useTodoFilterStore.getState().status).toBeNull();
  });

  it('모바일 카테고리 select 변경 시 store가 갱신된다', () => {
    render(<TodoFilter categories={categories} onManageCategories={vi.fn()} />);

    const mobileCategorySelect = within(screen.getByTestId('category-filter-mobile')).getByLabelText('카테고리');
    fireEvent.change(mobileCategorySelect, { target: { value: 'cat-2' } });
    expect(useTodoFilterStore.getState().categoryId).toBe('cat-2');

    fireEvent.change(mobileCategorySelect, { target: { value: '__ALL__' } });
    expect(useTodoFilterStore.getState().categoryId).toBeNull();
  });

  it('모바일 상태 select 변경 시 store가 갱신된다', () => {
    render(<TodoFilter categories={categories} onManageCategories={vi.fn()} />);

    const mobileStatusSelect = within(screen.getByTestId('status-filter-mobile')).getByLabelText('상태');
    fireEvent.change(mobileStatusSelect, { target: { value: 'COMPLETED' } });
    expect(useTodoFilterStore.getState().status).toBe('COMPLETED');

    fireEvent.change(mobileStatusSelect, { target: { value: '__ALL__' } });
    expect(useTodoFilterStore.getState().status).toBeNull();
  });

  it('"카테고리 관리" 버튼 클릭 시 onManageCategories가 호출된다', async () => {
    const user = userEvent.setup();
    const onManageCategories = vi.fn();
    render(<TodoFilter categories={categories} onManageCategories={onManageCategories} />);

    await user.click(screen.getByRole('button', { name: '카테고리 관리' }));
    expect(onManageCategories).toHaveBeenCalledTimes(1);
  });
});
