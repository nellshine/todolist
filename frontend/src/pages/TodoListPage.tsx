import { useState } from 'react';
import { useTodos } from '../queries/useTodos';
import { useCategories } from '../queries/useCategories';
import { useUpdateTodo } from '../queries/useUpdateTodo';
import { useTodoFilterStore } from '../store/todoFilterStore';
import Modal from '../components/Modal';
import TodoForm from '../components/TodoForm';
import TodoCard from '../components/TodoCard';
import TodoFilter from '../components/TodoFilter';
import CategoryManager from '../components/CategoryManager';
import DeleteTodoConfirm from '../components/DeleteTodoConfirm';
import type { Todo } from '../types';
import './TodoListPage.css';

export default function TodoListPage() {
  const { categoryId, status } = useTodoFilterStore();
  const { data: todos, isLoading } = useTodos({
    categoryId: categoryId ?? undefined,
    status: status ?? undefined,
  });
  const { data: categories } = useCategories();
  const updateMutation = useUpdateTodo();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>(undefined);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);

  const categoryNameById = new Map(categories?.map((c) => [c.id, c.name]) ?? []);

  const openCreateForm = () => {
    setEditingTodo(undefined);
    setFormOpen(true);
  };
  const openEditForm = (todo: Todo) => {
    setEditingTodo(todo);
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);
  const handleToggleComplete = (todo: Todo, isCompleted: boolean) => {
    updateMutation.mutate({ id: todo.id, body: { isCompleted } });
  };

  return (
    <div className="todo-list-page">
      <div className="todo-list-page__header">
        <h1 className="todo-list-page__title">할일 목록</h1>
        <button type="button" className="todo-list-page__add" onClick={openCreateForm}>
          + 할일 추가
        </button>
      </div>
      <div className="todo-list-page__body">
        <TodoFilter
          categories={categories ?? []}
          onManageCategories={() => setCategoryManagerOpen(true)}
        />
        <div className="todo-list-page__list">
          {isLoading && <p>불러오는 중...</p>}
          {!isLoading && todos?.length === 0 && <p>표시할 할일이 없습니다.</p>}
          {todos?.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              categoryName={categoryNameById.get(todo.categoryId)}
              onToggleComplete={handleToggleComplete}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      </div>
      {formOpen && (
        <Modal title={editingTodo ? '할일 수정' : '할일 등록'} onClose={closeForm}>
          <TodoForm todo={editingTodo} onSuccess={closeForm} onCancel={closeForm} />
        </Modal>
      )}
      {categoryManagerOpen && (
        <Modal title="카테고리 관리" onClose={() => setCategoryManagerOpen(false)}>
          <CategoryManager />
        </Modal>
      )}
      {deleteTarget && (
        <Modal title="할일 삭제" onClose={() => setDeleteTarget(null)}>
          <DeleteTodoConfirm
            todo={deleteTarget}
            onSuccess={() => setDeleteTarget(null)}
            onCancel={() => setDeleteTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
}
