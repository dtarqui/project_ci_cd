import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import Dashboard from './dashboard';

// Mock de axios
jest.mock('axios');
const mockedAxios = axios;

// Mock de recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockDashboardData = {
  dailySales: "64M",
  branchSales: [
    { name: "Sucursal Norte", value: 30 },
    { name: "Sucursal Sur", value: 25 },
  ],
  salesTrend: [
    { day: "Lun", sales: 12 },
    { day: "Mar", sales: 19 },
  ],
  productSales: [
    { product: "Producto A", quantity: 45 },
    { product: "Producto B", quantity: 30 },
  ]
};

describe('Dashboard Component', () => {
  const mockUser = { id: 1, name: 'Test User', username: 'testuser' };
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    mockOnLogout.mockClear();
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
  });

  test('renders dashboard with loading state initially', () => {
    mockedAxios.get.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);
    
    expect(screen.getByText('Cargando dashboard...')).toBeInTheDocument();
  });

  test('renders dashboard content after loading', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: mockDashboardData
    });

    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    expect(screen.getByText('64M')).toBeInTheDocument();
    expect(screen.getByText('Ventas diarias')).toBeInTheDocument();
  });

  test('navigation between sections works', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: mockDashboardData
    });

    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    // Click en Productos
    const productosButton = screen.getByText('Productos');
    fireEvent.click(productosButton);

    expect(screen.getByText('Gestión de Productos')).toBeInTheDocument();
    expect(screen.getByText('Esta sección está en desarrollo')).toBeInTheDocument();

    // Click en Dashboard para volver
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);

    expect(screen.getByText('64M')).toBeInTheDocument();
  });

  test('user menu toggle works', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: mockDashboardData
    });

    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    // El menú no debería estar visible inicialmente
    expect(screen.queryByText('Cuenta')).not.toBeInTheDocument();

    // Click en el botón del usuario
    const userButton = screen.getByText('👤');
    fireEvent.click(userButton);

    // Ahora el menú debería estar visible
    expect(screen.getByText('Cuenta')).toBeInTheDocument();
    expect(screen.getByText('Salir')).toBeInTheDocument();
  });

  test('logout functionality works', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: mockDashboardData
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true }
    });

    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    // Abrir menú de usuario
    const userButton = screen.getByText('👤');
    fireEvent.click(userButton);

    // Click en salir
    const logoutButton = screen.getByText('Salir');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockOnLogout).toHaveBeenCalled();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:4000/api/auth/logout');
  });

  test('handles API error gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error loading dashboard data:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  test('all navigation sections render correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: mockDashboardData
    });

    render(<Dashboard user={mockUser} onLogout={mockOnLogout} />);

    await waitFor(() => {
      expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    });

    // Test each navigation section
    const sections = [
      { button: 'Productos', title: 'Gestión de Productos' },
      { button: 'Clientes', title: 'Gestión de Clientes' },
      { button: 'Configuraciones', title: 'Configuraciones del Sistema' }
    ];

    for (const section of sections) {
      const navButton = screen.getByText(section.button);
      fireEvent.click(navButton);
      
      expect(screen.getByText(section.title)).toBeInTheDocument();
      expect(screen.getByText('Esta sección está en desarrollo')).toBeInTheDocument();
    }
  });
});