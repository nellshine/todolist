import { useTodoFilterStore } from '../store/todoFilterStore';
import { TODO_STATUS } from '../constants/todo-status';
import { STATUS_LABEL } from '../constants/todo-status-label';
import type { Category, TodoStatus } from '../types';
import './TodoFilter.css';

const ALL_VALUE = '__ALL__';

interface TodoFilterProps {
  categories: Category[];
  onManageCategories: () => void;
}

export default function TodoFilter({ categories, onManageCategories }: TodoFilterProps) {
  const { categoryId, status, setCategoryId, setStatus } = useTodoFilterStore();
  const statuses = Object.values(TODO_STATUS);

  return (
    <div className="todo-filter">
      {/* 카테고리 - 데스크톱: 라디오 그룹 */}
      <fieldset
        className="todo-filter__category todo-filter__category--desktop"
        data-testid="category-filter-desktop"
      >
        <legend>카테고리</legend>
        <label>
          <input
            type="radio"
            name="category-desktop"
            checked={categoryId === null}
            onChange={() => setCategoryId(null)}
          />
          전체
        </label>
        {categories.map((c) => (
          <label key={c.id}>
            <input
              type="radio"
              name="category-desktop"
              checked={categoryId === c.id}
              onChange={() => setCategoryId(c.id)}
            />
            {c.name}
          </label>
        ))}
      </fieldset>

      {/* 카테고리 - 모바일: select */}
      <label
        className="todo-filter__category todo-filter__category--mobile"
        data-testid="category-filter-mobile"
      >
        카테고리
        <select
          aria-label="카테고리"
          value={categoryId ?? ALL_VALUE}
          onChange={(e) => setCategoryId(e.target.value === ALL_VALUE ? null : e.target.value)}
        >
          <option value={ALL_VALUE}>전체</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="todo-filter__manage" onClick={onManageCategories}>
        카테고리 관리
      </button>

      {/* 상태 - 데스크톱: 토글 버튼 그룹 */}
      <div
        className="todo-filter__status todo-filter__status--desktop"
        role="radiogroup"
        aria-label="상태"
        data-testid="status-filter-desktop"
      >
        <button
          type="button"
          role="radio"
          aria-checked={status === null}
          className={status === null ? 'is-active' : ''}
          onClick={() => setStatus(null)}
        >
          전체
        </button>
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            className={status === s ? 'is-active' : ''}
            onClick={() => setStatus(s)}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* 상태 - 모바일: select */}
      <label
        className="todo-filter__status todo-filter__status--mobile"
        data-testid="status-filter-mobile"
      >
        상태
        <select
          aria-label="상태"
          value={status ?? ALL_VALUE}
          onChange={(e) =>
            setStatus(e.target.value === ALL_VALUE ? null : (e.target.value as TodoStatus))
          }
        >
          <option value={ALL_VALUE}>전체</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
