jest.mock('axios', () => {
  const mockClient = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockClient),
    },
  };
});

const { getAuthToken, setAuthToken, clearAuthToken } = require('./services/api');

beforeEach(() => {
  localStorage.clear();
});

test('auth token helpers work', () => {
  expect(getAuthToken()).toBeNull();
  setAuthToken('abc');
  expect(getAuthToken()).toBe('abc');
  clearAuthToken();
  expect(getAuthToken()).toBeNull();
});
