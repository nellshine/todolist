import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCategories } from '../queries/useCategories';
import { useCreateCategory } from '../queries/useCreateCategory';
import { useUpdateCategory } from '../queries/useUpdateCategory';
import { useDeleteCategory } from '../queries/useDeleteCategory';
import { ApiError } from '../api/api-error';
import type { Category } from '../types';
import './CategoryManager.css';

function toErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError) return error.message;
  if (error) return '알 수 없는 오류가 발생했습니다.';
  return null;
}

export default function CategoryManager() {
  const { data: categories } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name: newName }, { onSuccess: () => setNewName('') });
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = (e: FormEvent, id: string) => {
    e.preventDefault();
    updateMutation.mutate({ id, body: { name: editName } }, { onSuccess: () => setEditingId(null) });
  };

  if (deleteTarget) {
    return (
      <div className="category-manager__confirm">
        <p>
          &apos;{deleteTarget.name}&apos; 카테고리를 삭제하면 소속 할일은 모두 &apos;기본&apos;
          카테고리로 이동합니다.
        </p>
        {toErrorMessage(deleteMutation.error) && (
          <p className="category-manager__error">{toErrorMessage(deleteMutation.error)}</p>
        )}
        <div className="category-manager__confirm-actions">
          <button
            type="button"
            className="category-manager__secondary"
            onClick={() => setDeleteTarget(null)}
          >
            취소
          </button>
          <button
            type="button"
            className="category-manager__danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
          >
            삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-manager">
      <ul className="category-manager__list">
        {categories?.map((category) => (
          <li key={category.id} className="category-manager__item">
            {editingId === category.id ? (
              <form className="category-manager__edit-form" onSubmit={(e) => handleUpdate(e, category.id)}>
                <input
                  className="category-manager__input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  minLength={1}
                  aria-label="카테고리 이름 수정"
                />
                <button type="submit" className="category-manager__primary" disabled={updateMutation.isPending}>
                  저장
                </button>
                <button type="button" className="category-manager__secondary" onClick={cancelEdit}>
                  취소
                </button>
              </form>
            ) : (
              <>
                <span className="category-manager__name">{category.name}</span>
                {category.isDefault ? (
                  <span className="category-manager__badge">기본 카테고리</span>
                ) : (
                  <span className="category-manager__actions">
                    <button type="button" className="category-manager__secondary" onClick={() => startEdit(category)}>
                      수정
                    </button>
                    <button
                      type="button"
                      className="category-manager__secondary"
                      onClick={() => setDeleteTarget(category)}
                    >
                      삭제
                    </button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="category-manager__create" onSubmit={handleCreate}>
        <input
          className="category-manager__input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          minLength={1}
          placeholder="새 카테고리 이름"
          aria-label="새 카테고리 이름"
        />
        <button type="submit" className="category-manager__primary" disabled={createMutation.isPending}>
          추가
        </button>
      </form>
      {toErrorMessage(createMutation.error) && (
        <p className="category-manager__error">{toErrorMessage(createMutation.error)}</p>
      )}
    </div>
  );
}
