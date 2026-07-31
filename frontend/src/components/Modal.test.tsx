import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal', () => {
  it('title과 children을 렌더링한다', () => {
    render(
      <Modal title="테스트 모달" onClose={vi.fn()}>
        <p>내용입니다</p>
      </Modal>,
    );

    expect(screen.getByText('테스트 모달')).toBeInTheDocument();
    expect(screen.getByText('내용입니다')).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="테스트 모달" onClose={onClose}>
        <p>내용입니다</p>
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop 클릭 시 onClose가 호출된다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="테스트 모달" onClose={onClose}>
        <p>내용입니다</p>
      </Modal>,
    );

    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('모달 내부 클릭 시 onClose가 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="테스트 모달" onClose={onClose}>
        <p>내용입니다</p>
      </Modal>,
    );

    await user.click(screen.getByText('내용입니다'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
