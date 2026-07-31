import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoCard from './TodoCard';
import type { Todo } from '../types';

const baseTodo: Todo = {
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

describe('TodoCard', () => {
  it('제목, 기간, 상태 라벨을 렌더링한다', () => {
    render(
      <TodoCard todo={baseTodo} onToggleComplete={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('보고서 작성')).toBeInTheDocument();
    expect(screen.getByText('2026-08-01 ~ 2026-08-05')).toBeInTheDocument();
    expect(screen.getByText('시작 전')).toBeInTheDocument();
  });

  it('체크박스 클릭 시 onToggleComplete가 호출된다', async () => {
    const user = userEvent.setup();
    const onToggleComplete = vi.fn();
    render(
      <TodoCard todo={baseTodo} onToggleComplete={onToggleComplete} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole('checkbox'));
    expect(onToggleComplete).toHaveBeenCalledWith(baseTodo, true);
  });

  it('수정 버튼 클릭 시 onEdit이 호출된다', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<TodoCard todo={baseTodo} onToggleComplete={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '수정' }));
    expect(onEdit).toHaveBeenCalledWith(baseTodo);
  });

  it('삭제 버튼 클릭 시 onDelete가 호출된다', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<TodoCard todo={baseTodo} onToggleComplete={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(onDelete).toHaveBeenCalledWith(baseTodo);
  });

  it('OVERDUE 상태일 때 todo-card--overdue 클래스가 부여된다', () => {
    const overdueTodo: Todo = { ...baseTodo, status: 'OVERDUE' };
    const { container } = render(
      <TodoCard todo={overdueTodo} onToggleComplete={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(container.querySelector('.todo-card--overdue')).toBeInTheDocument();
  });
});
