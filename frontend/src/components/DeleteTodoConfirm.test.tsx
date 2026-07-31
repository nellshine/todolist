import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeleteTodoConfirm from './DeleteTodoConfirm';
import { deleteTodo } from '../api/todo-api';
import { ApiError } from '../api/api-error';
import type { Todo } from '../types';

vi.mock('../api/todo-api');

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

function renderConfirm(onSuccess = vi.fn(), onCancel = vi.fn()) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteTodoConfirm todo={mockTodo} onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

describe('DeleteTodoConfirm', () => {
  beforeEach(() => {
    vi.mocked(deleteTodo).mockReset();
  });

  it('삭제 확인 문구를 렌더링한다', () => {
    renderConfirm();

    expect(screen.getByText(/할일을 삭제하시겠습니까\?/)).toBeInTheDocument();
    expect(screen.getByText(/복구할 수 없습니다\./)).toBeInTheDocument();
  });

  it('취소 클릭 시 onCancel이 호출되고 deleteTodo는 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderConfirm();

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalled();
    expect(deleteTodo).not.toHaveBeenCalled();
  });

  it('삭제 클릭 시 deleteTodo가 호출되고 성공 시 onSuccess가 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteTodo).mockResolvedValue(undefined);
    const { onSuccess } = renderConfirm();

    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(deleteTodo).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('실패 시 에러 메시지를 노출하고 재클릭이 가능하다', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteTodo).mockRejectedValue(
      new ApiError(404, 'TODO_NOT_FOUND', '할일을 찾을 수 없습니다.'),
    );
    const { onSuccess } = renderConfirm();

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(await screen.findByText('할일을 찾을 수 없습니다.')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    const deleteButton = screen.getByRole('button', { name: '삭제' });
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);
    await waitFor(() => expect(deleteTodo).toHaveBeenCalledTimes(2));
  });
});
