/**
 * Data Store
 * Fuente de verdad en memoria para los repositorios mientras no exista BD real.
 */

const { mockData: seedMockData, users: seedUsers } = require("./mockData");

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const createInitialState = () => ({
  mockData: cloneDeep(seedMockData),
  users: cloneDeep(seedUsers),
});

const state = createInitialState();

const getMockData = () => state.mockData;
const getUsers = () => state.users;

const resetDataStore = () => {
  const initial = createInitialState();
  state.mockData = initial.mockData;
  state.users = initial.users;
};

module.exports = {
  getMockData,
  getUsers,
  resetDataStore,
};
