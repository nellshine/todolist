import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';

describe('Layout', () => {
  it('헤더에 TodoList 타이틀이 렌더링된다', () => {
    render(
      <Layout>
        <p>content</p>
      </Layout>,
    );
    expect(screen.getByText('TodoList')).toBeInTheDocument();
  });

  it('children이 layout__content 영역 안에 렌더링된다', () => {
    render(
      <Layout>
        <p>content</p>
      </Layout>,
    );
    const content = screen.getByText('content');
    expect(content.closest('.layout__content')).not.toBeNull();
  });
});
