import { useDeleteTodo } from '../queries/useDeleteTodo';
import { ApiError } from '../api/api-error';
import type { Todo } from '../types';
import './DeleteTodoConfirm.css';

interface DeleteTodoConfirmProps {
  todo: Todo;
  onSuccess: () => void;
  onCancel: () => void;
}

function toErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError) return error.message;
  if (error) return '알 수 없는 오류가 발생했습니다.';
  return null;
}

export default function DeleteTodoConfirm({ todo, onSuccess, onCancel }: DeleteTodoConfirmProps) {
  const deleteMutation = useDeleteTodo();
  const errorMessage = toErrorMessage(deleteMutation.error);

  return (
    <div className="delete-todo-confirm">
      <p className="delete-todo-confirm__message">
        &apos;{todo.title}&apos; 할일을 삭제하시겠습니까?
        <br />
        삭제한 할일은 복구할 수 없습니다.
      </p>
      {errorMessage && <p className="delete-todo-confirm__error">{errorMessage}</p>}
      <div className="delete-todo-confirm__actions">
        <button type="button" className="delete-todo-confirm__secondary" onClick={onCancel}>
          취소
        </button>
        <button
          type="button"
          className="delete-todo-confirm__danger"
          disabled={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate(todo.id, { onSuccess })}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
