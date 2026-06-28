import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  mobileMenuOpen: boolean;
}

const initialState: UiState = {
  mobileMenuOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },
    openMobileMenu(state) {
      state.mobileMenuOpen = true;
    },
    closeMobileMenu(state) {
      state.mobileMenuOpen = false;
    },
  },
});

export const { setMobileMenuOpen, openMobileMenu, closeMobileMenu } =
  uiSlice.actions;

export const uiReducer = uiSlice.reducer;

export const selectMobileMenuOpen = (state: { ui: UiState }) =>
  state.ui.mobileMenuOpen;
