import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TodoListPage from './TodoListPage';
import { getTodos, updateTodo, deleteTodo } from '../api/todo-api';
import { ApiError } from '../api/api-error';
import { getCategories } from '../api/category-api';
import { useTodoFilterStore } from '../store/todoFilterStore';
import type { Todo, Category } from '../types';

vi.mock('../api/todo-api');
vi.mock('../api/category-api');

const mockCategories: Category[] = [
  { id: 'cat-1', ownerId: 'owner-1', name: '기본', isDefault: true, createdAt: '2026-07-30T00:00:00.000Z' },
];

const mockTodo: Todo = {
  id: '1',
  ownerId: 'owner-1',
  categoryId: 'cat-1',
  title: '보고서 작성',
  description: null,
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  isCompleted: false,
  completedAt: null,
  status: 'NOT_STARTED',
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <TodoListPage />
    </QueryClientProvider>,
  );
}

describe('TodoListPage', () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    useTodoFilterStore.setState({ categoryId: null, status: null });
  });

  it('목록을 렌더링한다', async () => {
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    expect(await screen.findByText('보고서 작성')).toBeInTheDocument();
  });

  it('할일이 없으면 안내 문구를 노출한다', async () => {
    vi.mocked(getTodos).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('표시할 할일이 없습니다.')).toBeInTheDocument();
  });

  it('"+ 할일 추가" 클릭 시 등록 모달이 열리고 완료 체크박스가 없다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([]);
    renderPage();

    await screen.findByText('표시할 할일이 없습니다.');
    await user.click(screen.getByRole('button', { name: '+ 할일 추가' }));

    expect(screen.getByText('할일 등록')).toBeInTheDocument();
    expect(screen.queryByText('완료 처리')).not.toBeInTheDocument();
  });

  it('카드 "수정" 클릭 시 수정 모달이 열리고 기존 값이 채워진다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: '수정' }));

    expect(screen.getByText('할일 수정')).toBeInTheDocument();
    expect(screen.getByLabelText('제목')).toHaveValue('보고서 작성');
    expect(screen.getByText('완료 처리')).toBeInTheDocument();
  });

  it('체크박스 토글 시 updateTodo가 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    vi.mocked(updateTodo).mockResolvedValue({ ...mockTodo, isCompleted: true });
    renderPage();

    const checkbox = await screen.findByRole('checkbox', { name: /완료 여부/ });
    await user.click(checkbox);

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('1', { isCompleted: true });
    });
  });

  it('필터 미지정 시 categoryId/status 없이 getTodos를 호출한다', async () => {
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    expect(getTodos).toHaveBeenCalledWith({ categoryId: undefined, status: undefined });
  });

  it('카테고리 선택 시 categoryId를 포함해 getTodos를 재호출한다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('radio', { name: '기본' }));

    await waitFor(() => {
      expect(getTodos).toHaveBeenLastCalledWith({ categoryId: 'cat-1', status: undefined });
    });
  });

  it('상태 선택 시 status를 포함해 getTodos를 재호출한다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('radio', { name: '완료' }));

    await waitFor(() => {
      expect(getTodos).toHaveBeenLastCalledWith({ categoryId: undefined, status: 'COMPLETED' });
    });
  });

  it('카테고리+상태 동시 선택 시 마지막 호출에 둘 다 포함된다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('radio', { name: '기본' }));
    await user.click(screen.getByRole('radio', { name: '완료' }));

    await waitFor(() => {
      expect(getTodos).toHaveBeenLastCalledWith({ categoryId: 'cat-1', status: 'COMPLETED' });
    });
  });

  it('"전체" 재선택 시 undefined로 복원된다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('radio', { name: '기본' }));
    await user.click(screen.getByRole('radio', { name: '완료' }));

    await waitFor(() => {
      expect(getTodos).toHaveBeenLastCalledWith({ categoryId: 'cat-1', status: 'COMPLETED' });
    });

    const desktopCategory = screen.getByTestId('category-filter-desktop');
    const desktopStatus = screen.getByTestId('status-filter-desktop');
    await user.click(within(desktopCategory).getByRole('radio', { name: '전체' }));
    await user.click(within(desktopStatus).getByRole('radio', { name: '전체' }));

    await waitFor(() => {
      expect(getTodos).toHaveBeenLastCalledWith({ categoryId: undefined, status: undefined });
    });
  });

  it('"카테고리 관리" 클릭 시 카테고리 관리 모달이 열리고 닫으면 사라진다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('button', { name: '카테고리 관리' }));

    expect(screen.getByText('기본 카테고리')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByText('기본 카테고리')).not.toBeInTheDocument();
  });

  it('카드 "삭제" 클릭 시 확인 모달이 노출되고 취소하면 카드가 그대로 남는다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(
      screen.getByText(/'보고서 작성' 할일을 삭제하시겠습니까\?/),
    ).toBeInTheDocument();
    expect(deleteTodo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByText(/할일을 삭제하시겠습니까\?/)).not.toBeInTheDocument();
    expect(screen.getByText('보고서 작성')).toBeInTheDocument();
    expect(deleteTodo).not.toHaveBeenCalled();
  });

  it('삭제 확정 시 deleteTodo가 호출되고 목록이 갱신되며 모달이 닫힌다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValueOnce([mockTodo]).mockResolvedValueOnce([]);
    vi.mocked(deleteTodo).mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(deleteTodo).toHaveBeenCalledWith('1'));
    await waitFor(() => {
      expect(screen.queryByText(/할일을 삭제하시겠습니까\?/)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('표시할 할일이 없습니다.')).toBeInTheDocument();
    });
  });

  it('삭제 실패(404) 시 모달 안에 에러 메시지가 노출되고 페이지는 정상 유지된다', async () => {
    const user = userEvent.setup();
    vi.mocked(getTodos).mockResolvedValue([mockTodo]);
    vi.mocked(deleteTodo).mockRejectedValue(
      new ApiError(404, 'TODO_NOT_FOUND', '할일을 찾을 수 없습니다.'),
    );
    renderPage();

    await screen.findByText('보고서 작성');
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));

    expect(await screen.findByText('할일을 찾을 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('보고서 작성')).toBeInTheDocument();
  });
});
