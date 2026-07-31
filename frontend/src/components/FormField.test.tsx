import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormField from './FormField';

describe('FormField', () => {
  it('label이 렌더링된다', () => {
    render(<FormField label="이메일" type="email" value="" onChange={() => {}} />);
    expect(screen.getByText('이메일')).toBeInTheDocument();
  });

  it('입력 시 onChange 콜백이 호출된다', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<FormField label="이메일" type="email" value="" onChange={handleChange} />);
    const input = screen.getByLabelText('이메일');
    await user.type(input, 'a');
    expect(handleChange).toHaveBeenCalledWith('a');
  });

  it('required/type/minLength 속성이 DOM에 반영된다', () => {
    render(
      <FormField
        label="비밀번호"
        type="password"
        value=""
        onChange={() => {}}
        required
        minLength={8}
      />,
    );
    const input = screen.getByLabelText('비밀번호');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('minLength', '8');
  });
});
