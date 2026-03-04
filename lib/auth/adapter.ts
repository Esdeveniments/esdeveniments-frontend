import type { AuthAdapter, AuthResult } from "types/auth";

const notConfiguredResult: AuthResult = {
  success: false,
  error: "not-configured",
};

export const noopAdapter: AuthAdapter = {
  supportedMethods: ["credentials"],

  async login() {
    return notConfiguredResult;
  },

  async register() {
    return notConfiguredResult;
  },

  async logout() {
    // noop
  },

  async getSession() {
    return null;
  },

  onAuthStateChange() {
    return () => {};
  },
};
