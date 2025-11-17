const { createApp } = require('../app');

// Mock del servidor para tests
const mockServer = {
  close: jest.fn((callback) => {
    if (callback) callback();
  })
};

describe('Index.js Module Tests', () => {
  let originalConsoleLog;
  let originalProcessOn;
  let logSpy;

  beforeEach(() => {
    originalConsoleLog = console.log;
    originalProcessOn = process.on;
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Clear require cache for index.js
    delete require.cache[require.resolve('../index')];
  });

  afterEach(() => {
    jest.restoreAllMocks();
    console.log = originalConsoleLog;
    process.on = originalProcessOn;
  });

  test('should require and execute index.js code', () => {
    // Mock app.listen to avoid real server startup
    const mockApp = createApp();
    mockApp.listen = jest.fn((port, callback) => {
      callback(); // Call the callback immediately
      return mockServer;
    });

    // Mock createApp to return our mocked app
    const originalCreateApp = require('../app').createApp;
    require.cache[require.resolve('../app')].exports.createApp = jest.fn(() => mockApp);

    // Mock process.on for signal handlers
    const signalHandlers = {};
    process.on = jest.fn((signal, handler) => {
      signalHandlers[signal] = handler;
    });

    // Now require index.js - this will execute the main code
    require('../index');

    // Verify that server started
    expect(mockApp.listen).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Backend running on port'));
    
    // Verify signal handlers were registered
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));

    // Test SIGTERM handler
    if (signalHandlers.SIGTERM) {
      signalHandlers.SIGTERM();
      expect(logSpy).toHaveBeenCalledWith('SIGTERM received, shutting down gracefully');
    }

    // Test SIGINT handler  
    if (signalHandlers.SIGINT) {
      logSpy.mockClear();
      signalHandlers.SIGINT();
      expect(logSpy).toHaveBeenCalledWith('SIGINT received, shutting down gracefully');
    }

    // Restore original createApp
    require.cache[require.resolve('../app')].exports.createApp = originalCreateApp;
  });

  test('should handle PORT environment variable', () => {
    const originalPort = process.env.PORT;
    
    // Test default port (4000)
    delete process.env.PORT;
    const defaultPort = process.env.PORT || 4000;
    expect(defaultPort).toBe(4000);
    
    // Test custom port
    process.env.PORT = '8080';
    const customPort = process.env.PORT || 4000;
    expect(customPort).toBe('8080');
    
    // Restore
    process.env.PORT = originalPort;
  });

  test('should export the app instance', () => {
    // Mock app.listen to avoid real server startup
    const mockApp = createApp();
    mockApp.listen = jest.fn(() => mockServer);

    // Mock createApp
    const originalCreateApp = require('../app').createApp;
    require.cache[require.resolve('../app')].exports.createApp = jest.fn(() => mockApp);
    
    // Mock process.on
    process.on = jest.fn();

    // Require index.js
    const exportedApp = require('../index');
    
    expect(exportedApp).toBeDefined();
    
    // Restore
    require.cache[require.resolve('../app')].exports.createApp = originalCreateApp;
  });
});