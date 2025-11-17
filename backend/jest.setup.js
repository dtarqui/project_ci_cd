// Jest setup file
// Este archivo se ejecuta antes de todos los tests

// Configurar timeout global
jest.setTimeout(10000);

// Mock console para tests más limpios
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args) => {
    if (
      args[0] && 
      typeof args[0] === 'string' && 
      args[0].includes('Backend running on')
    ) {
      return; // Suprimir logs del servidor
    }
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    // Suprimir warnings específicos si es necesario
    originalWarn.apply(console, args);
  };

  console.log = (...args) => {
    if (
      args[0] && 
      typeof args[0] === 'string' && 
      args[0].includes('Backend running on')
    ) {
      return; // Suprimir logs del servidor
    }
    originalLog.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

// Variables globales para tests
global.testPort = 3001; // Puerto diferente para tests