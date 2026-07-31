import type { Todo } from '../types';
import { STATUS_LABEL } from '../constants/todo-status-label';
import './TodoCard.css';

interface TodoCardProps {
  todo: Todo;
  categoryName?: string;
  onToggleComplete: (todo: Todo, isCompleted: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export default function TodoCard({
  todo,
  categoryName,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoCardProps) {
  return (
    <div className={`todo-card todo-card--${todo.status.toLowerCase()}`}>
      <input
        type="checkbox"
        checked={todo.isCompleted}
        onChange={(e) => onToggleComplete(todo, e.target.checked)}
        aria-label={`${todo.title} 완료 여부`}
      />
      <div className="todo-card__body">
        <h3 className="todo-card__title">{todo.title}</h3>
        {categoryName && <span className="todo-card__category">{categoryName}</span>}
        <span className="todo-card__period">
          {todo.startDate} ~ {todo.endDate}
        </span>
        <span className={`todo-card__status todo-card__status--${todo.status.toLowerCase()}`}>
          {STATUS_LABEL[todo.status]}
        </span>
      </div>
      <div className="todo-card__actions">
        <button type="button" className="todo-card__edit" onClick={() => onEdit(todo)}>
          수정
        </button>
        <button type="button" className="todo-card__delete" onClick={() => onDelete(todo)}>
          삭제
        </button>
      </div>
    </div>
  );
}
