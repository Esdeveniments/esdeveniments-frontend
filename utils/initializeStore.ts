import useStore, { StoreState } from "@store";

export const initializeStore = (initialState: Partial<StoreState>): void => {
  const initialize = useStore.getState().initializeStore;
  initialize(initialState);
};
