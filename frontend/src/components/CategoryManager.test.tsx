import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoryManager from './CategoryManager';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/category-api';
import { ApiError } from '../api/api-error';
import type { Category } from '../types';

vi.mock('../api/category-api');

const mockCategories: Category[] = [
  { id: 'cat-default', ownerId: 'owner-1', name: '기본', isDefault: true, createdAt: '2026-07-30T00:00:00.000Z' },
  { id: 'cat-1', ownerId: 'owner-1', name: '업무', isDefault: false, createdAt: '2026-07-30T00:00:00.000Z' },
];

function renderManager() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <CategoryManager />
    </QueryClientProvider>,
  );
}

describe('CategoryManager', () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockReset();
    vi.mocked(createCategory).mockReset();
    vi.mocked(updateCategory).mockReset();
    vi.mocked(deleteCategory).mockReset();
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
  });

  it('목록을 렌더링한다: 기본 카테고리는 배지만, 나머지는 수정/삭제 버튼', async () => {
    renderManager();

    expect(await screen.findByText('기본 카테고리')).toBeInTheDocument();
    expect(await screen.findByText('업무')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    const defaultItem = items.find((item) => item.textContent?.includes('기본'));
    const normalItem = items.find((item) => item.textContent?.includes('업무'));

    expect(defaultItem?.querySelector('button')).toBeNull();
    expect(normalItem?.textContent).toContain('수정');
    expect(normalItem?.textContent).toContain('삭제');
  });

  it('생성 폼 제출 시 createCategory가 호출되고 입력값이 초기화된다', async () => {
    const user = userEvent.setup();
    vi.mocked(createCategory).mockResolvedValue({
      id: 'cat-2',
      ownerId: 'owner-1',
      name: '개인',
      isDefault: false,
      createdAt: '2026-07-30T00:00:00.000Z',
    });
    renderManager();

    await screen.findByText('업무');
    const input = screen.getByLabelText('새 카테고리 이름');
    await user.type(input, '개인');
    await user.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() =>
      expect(createCategory).toHaveBeenCalledWith({ name: '개인' }, expect.anything()),
    );
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('인라인 수정 진입 후 제출 시 updateCategory가 호출되고 편집모드가 종료된다', async () => {
    const user = userEvent.setup();
    vi.mocked(updateCategory).mockResolvedValue({
      id: 'cat-1',
      ownerId: 'owner-1',
      name: '업무2',
      isDefault: false,
      createdAt: '2026-07-30T00:00:00.000Z',
    });
    renderManager();

    await screen.findByText('업무');
    await user.click(screen.getByRole('button', { name: '수정' }));

    const editInput = screen.getByLabelText('카테고리 이름 수정');
    await user.clear(editInput);
    await user.type(editInput, '업무2');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith('cat-1', { name: '업무2' }),
    );
    await waitFor(() => expect(screen.queryByLabelText('카테고리 이름 수정')).not.toBeInTheDocument());
  });

  it('인라인 수정 취소 시 원래 값이 유지된다', async () => {
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('업무');
    await user.click(screen.getByRole('button', { name: '수정' }));

    const editInput = screen.getByLabelText('카테고리 이름 수정');
    await user.clear(editInput);
    await user.type(editInput, '수정중');
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByLabelText('카테고리 이름 수정')).not.toBeInTheDocument();
    expect(screen.getByText('업무')).toBeInTheDocument();
    expect(updateCategory).not.toHaveBeenCalled();
  });

  it('"삭제" 클릭 시 확인 문구가 노출되고 deleteCategory는 호출되지 않는다', async () => {
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('업무');
    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(screen.getByText(/카테고리로 이동합니다/)).toBeInTheDocument();
    expect(deleteCategory).not.toHaveBeenCalled();
  });

  it('삭제 확인 화면에서 "취소" 클릭 시 목록으로 복귀하고 deleteCategory는 호출되지 않는다', async () => {
    const user = userEvent.setup();
    renderManager();

    await screen.findByText('업무');
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.getByText('업무')).toBeInTheDocument();
    expect(deleteCategory).not.toHaveBeenCalled();
  });

  it('삭제 확정 클릭 시에만 deleteCategory가 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteCategory).mockResolvedValue(undefined);
    renderManager();

    await screen.findByText('업무');
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('cat-1'));
  });

  it('생성 시 API 에러 메시지가 노출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(createCategory).mockRejectedValue(new ApiError(409, 'DUPLICATE', '이미 존재하는 카테고리입니다.'));
    renderManager();

    await screen.findByText('업무');
    const input = screen.getByLabelText('새 카테고리 이름');
    await user.type(input, '업무');
    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(await screen.findByText('이미 존재하는 카테고리입니다.')).toBeInTheDocument();
  });

  it('삭제 시 API 에러 메시지가 노출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteCategory).mockRejectedValue(new ApiError(400, 'DEFAULT_CATEGORY', '기본 카테고리는 삭제할 수 없습니다.'));
    renderManager();

    await screen.findByText('업무');
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(await screen.findByText('기본 카테고리는 삭제할 수 없습니다.')).toBeInTheDocument();
  });
});
