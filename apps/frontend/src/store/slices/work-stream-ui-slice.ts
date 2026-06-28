import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Work Stream UI state only — never store announcements, deliverables,
 * comments, or other API data here (TanStack Query owns server state).
 */
export interface WorkStreamUiState {
  supervisorTeamFilterIds: string[];
}

const initialState: WorkStreamUiState = {
  supervisorTeamFilterIds: [],
};

const workStreamUiSlice = createSlice({
  name: "workStreamUi",
  initialState,
  reducers: {
    setSupervisorTeamFilterIds(state, action: PayloadAction<string[]>) {
      state.supervisorTeamFilterIds = action.payload;
    },
    clearSupervisorTeamFilter(state) {
      state.supervisorTeamFilterIds = [];
    },
  },
});

export const { setSupervisorTeamFilterIds, clearSupervisorTeamFilter } =
  workStreamUiSlice.actions;

export const workStreamUiReducer = workStreamUiSlice.reducer;

export const selectSupervisorTeamFilterIds = (state: {
  workStreamUi: WorkStreamUiState;
}) => state.workStreamUi.supervisorTeamFilterIds;
