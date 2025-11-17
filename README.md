# 🛒 Mi Tienda - Template CI/CD

Un template completo de aplicación web full-stack para tiendas online con sistema de autenticación, dashboard de métricas y pipeline CI/CD automatizado.

## 📋 Características

- ✅ **Autenticación completa** - Login/logout con validación
- 📊 **Dashboard interactivo** - Métricas de ventas con gráficos
- 🎨 **Diseño moderno** - UI responsive basada en mockups
- 🧪 **Testing completo** - Tests unitarios con Jest y React Testing Library
- 🔧 **Backend robusto** - API REST con Express.js
- 🚀 **CI/CD automatizado** - Pipeline con GitHub Actions
- 📦 **Docker ready** - Containerización incluida

## 🏗️ Arquitectura

```
├── frontend/          # React 18 + Webpack
│   ├── src/
│   │   ├── App.js          # Componente principal
│   │   ├── login.js        # Formulario de autenticación
│   │   ├── dashboard.js    # Panel de métricas
│   │   ├── styles.css      # Estilos CSS modernos
│   │   └── services/       # Servicios API
│   └── tests/         # Tests unitarios
├── backend/           # Node.js + Express
│   ├── index.js            # Servidor API
│   └── Dockerfile          # Configuración Docker
└── docs/              # Documentación
```

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 18+
- npm o yarn

### 1. Backend
```bash
cd backend
npm install
npm start
# Servidor en http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start
# Aplicación en http://localhost:3000
```

## 👤 Usuarios de Prueba

| Usuario | Contraseña | Descripción |
|---------|------------|-------------|
| `admin` | `admin123` | Administrador |
| `demo`  | `demo123`  | Usuario demo |
| `test`  | `test123`  | Usuario test |

## 📊 Dashboard Features

El dashboard incluye:
- **Ventas diarias** - Métricas principales
- **Gráficos interactivos** - Ventas por sucursal, productos y tendencias
- **Navegación** - Productos, Clientes, Configuraciones
- **Responsive** - Adaptado a móviles y tablets

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend health check
cd backend
npm test
```

### Cobertura de Tests
- ✅ Componente Login - Autenticación, validación, estados
- ✅ Componente Dashboard - Navegación, datos, logout
- ✅ Servicios API - Mocking y manejo de errores
- ✅ Estados de carga - Loading states y error handling

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Dashboard
- `GET /api/dashboard/data` - Datos de métricas

### Salud
- `GET /health` - Status del servidor

## 🎨 Diseño

La aplicación está basada en los mockups proporcionados:
- **Login page** - Formulario centrado con validación
- **Dashboard** - Layout con sidebar y gráficos
- **Responsive design** - Mobile-first approach
- **Paleta de colores** - Azul (#4F5BD8) como color principal

## 🚀 Deployment

### Docker
```bash
# Backend
cd backend
docker build -t mi-tienda-backend .
docker run -p 4000:4000 mi-tienda-backend

# Frontend
cd frontend
npm run build
# Servir build/ con tu servidor web favorito
```

### GitHub Actions
El proyecto incluye CI/CD automatizado que:
- ✅ Ejecuta tests en cada PR
- ✅ Hace linting del código
- ✅ Construye la aplicación
- ✅ Despliega automáticamente

## 📁 Scripts Disponibles

### Frontend
- `npm start` - Desarrollo con hot reload
- `npm build` - Build para producción
- `npm test` - Ejecutar tests
- `npm run lint` - Linting con ESLint

### Backend
- `npm start` - Iniciar servidor
- `npm run dev` - Desarrollo con nodemon
- `npm test` - Health check test

## 🔧 Configuración

### Variables de Entorno

#### Frontend
```env
REACT_APP_API_URL=http://localhost:4000
```

#### Backend
```env
PORT=4000
NODE_ENV=production
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [ ] Sistema de roles y permisos
- [ ] Gestión completa de productos
- [ ] Base de datos real (PostgreSQL/MongoDB)
- [ ] Notificaciones en tiempo real
- [ ] Panel de administración avanzado
- [ ] Integración con pasarelas de pago

## 📄 Licencia

Este proyecto está bajo la licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Reconocimientos

- Diseño basado en mockups proporcionados
- Icons: [Unicode emojis](https://unicode.org/emoji/)
- Charts: [Recharts](https://recharts.org/)
- Testing: [React Testing Library](https://testing-library.com/)

---

⭐ **¡Dale una estrella al proyecto si te ha sido útil!**

📧 **Contacto**: Tu email aquí
🌐 **Demo live**: [Próximamente]