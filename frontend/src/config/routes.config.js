/**
 * Route Configuration
 * Centralized routing definitions for the application
 */

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  PRODUCTS: '/dashboard/products',
  CUSTOMERS: '/dashboard/customers',
  SALES: '/dashboard/sales',
  
  // Error routes
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/401',
};

/**
 * Navigation items for sidebar/menu
 */
export const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: '📊',
  },
  {
    id: 'products',
    label: 'Products',
    path: ROUTES.PRODUCTS,
    icon: '📦',
  },
  {
    id: 'customers',
    label: 'Customers',
    path: ROUTES.CUSTOMERS,
    icon: '👥',
  },
  {
    id: 'sales',
    label: 'Sales',
    path: ROUTES.SALES,
    icon: '💰',
  },
];

export default {
  ROUTES,
  NAVIGATION_ITEMS,
};
