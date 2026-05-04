import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { login } from '@/services/ant-design-pro/api';
import Login from './index';

jest.mock('@umijs/max', () => {
  const react = require('react');
  return {
    Helmet: ({ children }: any) => react.createElement(react.Fragment, null, children),
    useModel: () => ({
      initialState: {
        fetchUserInfo: jest.fn().mockResolvedValue({
          id: 'admin',
          name: 'Admin',
          access: 'admin',
        }),
      },
      setInitialState: jest.fn(),
    }),
  };
});

jest.mock('@/services/ant-design-pro/api', () => ({
  login: jest.fn(),
}));

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (login as jest.Mock).mockResolvedValue({
      status: 'error',
    });
  });

  it('should show login form', async () => {
    render(React.createElement(Login));

    expect(await screen.findByText('Hami ERP')).toBeTruthy();
    expect(screen.getByText('公司内部系统')).toBeTruthy();
    expect(screen.getByPlaceholderText('用户名')).toBeTruthy();
    expect(screen.getByPlaceholderText('密码')).toBeTruthy();
  });

  it('should submit credentials', async () => {
    render(React.createElement(Login));

    fireEvent.change(await screen.findByPlaceholderText('用户名'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByPlaceholderText('密码'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          password: 'secret',
          autoLogin: true,
        }),
      ),
    );
  });
});
