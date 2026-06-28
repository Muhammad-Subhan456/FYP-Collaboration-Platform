import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { uiReducer } from "@/store/slices/ui-slice";
import { workStreamUiReducer } from "@/store/slices/work-stream-ui-slice";

export const RESET_APP_STATE = "app/reset" as const;

const appReducer = combineReducers({
  ui: uiReducer,
  workStreamUi: workStreamUiReducer,
});

const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: { type: string },
) => {
  if (action.type === RESET_APP_STATE) {
    return appReducer(undefined, action);
  }

  return appReducer(state, action);
};

export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
    devTools: process.env.NODE_ENV !== "production",
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export function resetAppState(dispatch: AppDispatch) {
  dispatch({ type: RESET_APP_STATE });
}
