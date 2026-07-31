import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TodoForm from './TodoForm';
import { createTodo, updateTodo } from '../api/todo-api';
import { getCategories } from '../api/category-api';
import { ApiError } from '../api/api-error';
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
  title: '기존 할일',
  description: '기존 설명',
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  isCompleted: false,
  completedAt: null,
  status: 'NOT_STARTED',
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

function renderForm(props: { todo?: Todo; onSuccess?: () => void; onCancel?: () => void } = {}) {
  const queryClient = new QueryClient();
  const onSuccess = props.onSuccess ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <TodoForm todo={props.todo} onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

describe('TodoForm', () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(createTodo).mockReset();
    vi.mocked(updateTodo).mockReset();
  });

  it('등록 모드에서는 완료 체크박스가 노출되지 않고, 카테고리 미선택 제출 시 categoryId: undefined로 createTodo가 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(createTodo).mockResolvedValue(mockTodo);
    const { onSuccess } = renderForm();

    expect(screen.queryByText('완료 처리')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('제목'), '새 할일');
    await user.type(screen.getByLabelText('시작일자'), '2026-08-01');
    await user.type(screen.getByLabelText('종료일자'), '2026-08-02');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(createTodo).toHaveBeenCalledWith(
        {
          title: '새 할일',
          description: null,
          categoryId: undefined,
          startDate: '2026-08-01',
          endDate: '2026-08-02',
        },
        expect.anything(),
      );
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('수정 모드에서는 완료 체크박스가 노출되며 초기값이 채워지고, updateTodo가 올바른 인자로 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(updateTodo).mockResolvedValue(mockTodo);
    renderForm({ todo: mockTodo });

    expect(screen.getByLabelText('제목')).toHaveValue('기존 할일');
    expect(screen.getByLabelText('시작일자')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('종료일자')).toHaveValue('2026-08-05');
    const completeCheckbox = screen.getByRole('checkbox', { name: /완료 처리/ });
    expect(completeCheckbox).toBeInTheDocument();
    expect(completeCheckbox).not.toBeChecked();

    await user.click(completeCheckbox);
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(updateTodo).toHaveBeenCalledWith('1', {
        title: '기존 할일',
        description: '기존 설명',
        categoryId: 'cat-1',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        isCompleted: true,
      });
    });
  });

  it('종료일자가 시작일자보다 이전이면 에러 메시지가 노출되고 mutation이 호출되지 않는다', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('제목'), '새 할일');
    await user.type(screen.getByLabelText('시작일자'), '2026-08-05');
    await user.type(screen.getByLabelText('종료일자'), '2026-08-01');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByText('종료일자는 시작일자보다 빠를 수 없습니다.'),
    ).toBeInTheDocument();
    expect(createTodo).not.toHaveBeenCalled();
  });

  it('서버 에러 발생 시 에러 메시지가 노출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(createTodo).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', '요청이 올바르지 않습니다.'),
    );
    renderForm();

    await user.type(screen.getByLabelText('제목'), '새 할일');
    await user.type(screen.getByLabelText('시작일자'), '2026-08-01');
    await user.type(screen.getByLabelText('종료일자'), '2026-08-02');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('요청이 올바르지 않습니다.')).toBeInTheDocument();
  });
});
