import type { ReactNode } from 'react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header className="layout__header">
        <span className="layout__title">TodoList</span>
      </header>
      <main className="layout__content">{children}</main>
    </div>
  );
}
