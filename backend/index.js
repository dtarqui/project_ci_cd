const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

// Mock data para el dashboard
const mockData = {
  dailySales: "64M",
  branchSales: [
    { name: "Sucursal Norte", value: 30 },
    { name: "Sucursal Sur", value: 25 },
    { name: "Sucursal Este", value: 20 },
    { name: "Sucursal Oeste", value: 25 }
  ],
  salesTrend: [
    { day: "Lun", sales: 12 },
    { day: "Mar", sales: 19 },
    { day: "Mié", sales: 15 },
    { day: "Jue", sales: 25 },
    { day: "Vie", sales: 22 },
    { day: "Sáb", sales: 30 },
    { day: "Dom", sales: 28 }
  ],
  productSales: [
    { product: "Producto A", quantity: 45 },
    { product: "Producto B", quantity: 30 },
    { product: "Producto C", quantity: 35 },
    { product: "Producto D", quantity: 20 }
  ]
};

// Usuarios mock para autenticación
const users = [
  { id: 1, username: "admin", password: "admin123", name: "Administrador" },
  { id: 2, username: "demo", password: "demo123", name: "Usuario Demo" },
  { id: 3, username: "test", password: "test123", name: "Usuario Test" }
];

app.get('/health', (req, res) => {
  return res.json({ status: 'ok' });
});

// Endpoint de autenticación
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.json({ 
      success: true, 
      user: userWithoutPassword,
      token: 'mock-jwt-token-' + user.id
    });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// Endpoint para datos del dashboard
app.get('/api/dashboard/data', (req, res) => {
  res.json(mockData);
});

// Endpoint para cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
