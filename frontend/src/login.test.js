import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import Login from './login';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock console.error para tests limpios
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe('Login Component', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
    mockedAxios.post.mockClear();
  });

  test('renders login form correctly', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido a mi tienda online')).toBeInTheDocument();
    expect(screen.getByText('Inicio de sesión')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  test('shows error when submitting empty form', async () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const submitButton = screen.getByRole('button', { name: /ingresar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Por favor ingresa usuario y contraseña')).toBeInTheDocument();
    });
    
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  test('allows user input', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const usernameInput = screen.getByPlaceholderText('Usuario');
    const passwordInput = screen.getByPlaceholderText('Contraseña');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('testpass');
  });

  test('successful login calls onLogin with user data', async () => {
    const mockUser = { id: 1, name: 'Test User', username: 'testuser' };
    const mockToken = 'mock-token';
    
    mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken }
    });

    render(<Login onLogin={mockOnLogin} />);
    
    const usernameInput = screen.getByPlaceholderText('Usuario');
    const passwordInput = screen.getByPlaceholderText('Contraseña');
    const submitButton = screen.getByRole('button', { name: /ingresar/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith(mockUser, mockToken);
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/login',
      { username: 'testuser', password: 'testpass' }
    );
  });

  test('demo button fills form with demo credentials', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const demoButton = screen.getByText('Llenar datos de demo');
    fireEvent.click(demoButton);

    const usernameInput = screen.getByPlaceholderText('Usuario');
    const passwordInput = screen.getByPlaceholderText('Contraseña');

    expect(usernameInput.value).toBe('demo');
    expect(passwordInput.value).toBe('demo123');
  });

  // Test original actualizado
  test('login calls onLogin with user', async () => {
    const mockUser = { id: 1, name: 'Juan', username: 'juan' };
    const mockToken = 'mock-token';
    
    mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken }
    });

    const handle = jest.fn();
    render(<Login onLogin={handle} />);
    
    const input = screen.getByLabelText('Usuario');
    fireEvent.change(input, { target: { value: 'juan' } });
    
    const passwordInput = screen.getByLabelText('Contraseña');
    fireEvent.change(passwordInput, { target: { value: 'test123' } });
    
    fireEvent.click(screen.getByText('Ingresar'));
    
    await waitFor(() => {
      expect(handle).toHaveBeenCalled();
    });
  });
});
