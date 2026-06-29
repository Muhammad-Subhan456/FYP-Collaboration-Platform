import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Work Stream UI state only — never store announcements, deliverables,
 * comments, or other API data here (TanStack Query owns server state).
 */
export interface WorkStreamUiState {
  supervisorTeamFilterId: string | null;
}

const initialState: WorkStreamUiState = {
  supervisorTeamFilterId: null,
};

const workStreamUiSlice = createSlice({
  name: "workStreamUi",
  initialState,
  reducers: {
    setSupervisorTeamFilterId(
      state,
      action: PayloadAction<string | null>,
    ) {
      state.supervisorTeamFilterId = action.payload;
    },
    clearSupervisorTeamFilter(state) {
      state.supervisorTeamFilterId = null;
    },
  },
});

export const { setSupervisorTeamFilterId, clearSupervisorTeamFilter } =
  workStreamUiSlice.actions;

export const workStreamUiReducer = workStreamUiSlice.reducer;

export const selectSupervisorTeamFilterId = (state: {
  workStreamUi: WorkStreamUiState;
}) => state.workStreamUi.supervisorTeamFilterId;
