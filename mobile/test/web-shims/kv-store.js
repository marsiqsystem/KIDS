// Test-only: the exam's on-phone store, as localStorage.
const Storage = {
  getItemSync: (k) => localStorage.getItem(k),
  setItemSync: (k, v) => localStorage.setItem(k, v),
  removeItemSync: (k) => (localStorage.removeItem(k), true),
};
export default Storage;
