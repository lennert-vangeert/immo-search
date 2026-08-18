import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** How the listings page renders its results. */
export type ListingsView = "table" | "cards";

type UIState = {
  /** The main horizontal margin of the app */
  mainMargin: string;
  /** isMobile boolean for responsive design */
  isMobile?: boolean;
  /** isSmallMobile boolean for responsive design */
  isSmallMobile?: boolean;
  /** isTablet boolean for responsive design */
  isTablet?: boolean;
  /** isBigTablet boolean for responsive design */
  isBigTablet?: boolean;
  /** The number of columns in the grid */
  gridCols?: number;
  /** the last page visited */
  lastPageVisited?: string;
  /** Listings page view mode (table vs cards) */
  listingsView: ListingsView;
};

/**
 * This is the initial state for the UI slice.
 */
const initialState: UIState = {
  mainMargin: "1rem",
  isMobile: false,
  isSmallMobile: false,
  isTablet: false,
  isBigTablet: false,
  gridCols: 3,
  lastPageVisited: undefined,
  listingsView: "table",
};

/**
 * This is the UI slice of the store. It contains the state and reducers for the UI.
 * @description This is the UI slice of the store. It contains the state and reducers for the UI.
 * It gets the most of its data from the pageWrapper component
 */
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setMainMargin(state, action: PayloadAction<string>) {
      state.mainMargin = action.payload;
    },
    setIsMobile(state, action: PayloadAction<boolean | undefined>) {
      state.isMobile = action.payload;
    },
    setIsSmallMobile(state, action: PayloadAction<boolean | undefined>) {
      state.isSmallMobile = action.payload;
    },
    setIsTablet(state, action: PayloadAction<boolean | undefined>) {
      state.isTablet = action.payload;
    },
    setIsBigTablet(state, action: PayloadAction<boolean | undefined>) {
      state.isBigTablet = action.payload;
    },
    setGridCols(state, action: PayloadAction<number | undefined>) {
      state.gridCols = action.payload;
    },
    setLastPageVisited(state, action: PayloadAction<string | undefined>) {
      state.lastPageVisited = action.payload;
    },
    setListingsView(state, action: PayloadAction<ListingsView>) {
      state.listingsView = action.payload;
    },
  },
});

export const {
  setMainMargin,
  setIsMobile,
  setIsSmallMobile,
  setIsTablet,
  setIsBigTablet,
  setGridCols,
  setLastPageVisited,
  setListingsView,
} = uiSlice.actions;
export default uiSlice.reducer;
