import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCategories } from '../queries/useCategories';
import { useCreateTodo } from '../queries/useCreateTodo';
import { useUpdateTodo } from '../queries/useUpdateTodo';
import { ApiError } from '../api/api-error';
import FormField from './FormField';
import type { Todo } from '../types';
import './TodoForm.css';

interface TodoFormProps {
  todo?: Todo;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TodoForm({ todo, onSuccess, onCancel }: TodoFormProps) {
  const isEditMode = todo != null;
  const { data: categories } = useCategories();
  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const mutation = isEditMode ? updateMutation : createMutation;

  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [categoryId, setCategoryId] = useState(todo?.categoryId ?? '');
  const [startDate, setStartDate] = useState(todo?.startDate ?? '');
  const [endDate, setEndDate] = useState(todo?.endDate ?? '');
  const [isCompleted, setIsCompleted] = useState(todo?.isCompleted ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (startDate && endDate && endDate < startDate) {
      setValidationError('종료일자는 시작일자보다 빠를 수 없습니다.');
      return;
    }
    setValidationError(null);

    if (isEditMode && todo) {
      updateMutation.mutate(
        {
          id: todo.id,
          body: {
            title,
            description: description || null,
            categoryId: categoryId || undefined,
            startDate,
            endDate,
            isCompleted,
          },
        },
        { onSuccess },
      );
    } else {
      createMutation.mutate(
        {
          title,
          description: description || null,
          categoryId: categoryId || undefined,
          startDate,
          endDate,
        },
        { onSuccess },
      );
    }
  };

  const serverError =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? '알 수 없는 오류가 발생했습니다.'
        : null;
  const errorMessage = validationError ?? serverError;

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <FormField label="제목" type="text" value={title} onChange={setTitle} required />
      <label className="todo-form__field">
        <span className="todo-form__label">설명</span>
        <textarea
          className="todo-form__textarea"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="todo-form__field">
        <span className="todo-form__label">카테고리</span>
        <select
          className="todo-form__select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">선택 안 함 (기본 적용)</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <FormField label="시작일자" type="date" value={startDate} onChange={setStartDate} required />
      <FormField label="종료일자" type="date" value={endDate} onChange={setEndDate} required />
      {errorMessage && <p className="todo-form__error">{errorMessage}</p>}
      {isEditMode && (
        <label className="todo-form__checkbox">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
          />
          완료 처리
        </label>
      )}
      <div className="todo-form__actions">
        <button type="button" className="todo-form__cancel" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="todo-form__submit" disabled={mutation.isPending}>
          저장
        </button>
      </div>
    </form>
  );
}
