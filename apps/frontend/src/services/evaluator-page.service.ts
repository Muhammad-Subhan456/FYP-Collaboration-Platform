/**
 * @deprecated Evaluator is not a portal role. Backend routes are unused by the frontend.
 */
export const evaluatorPageService = {
  getDashboard: async () => {
    throw new Error("Evaluator portal is not implemented.");
  },
  getEvaluations: async () => {
    throw new Error("Evaluator portal is not implemented.");
  },
  getResults: async () => {
    throw new Error("Evaluator portal is not implemented.");
  },
  getNotifications: async () => {
    throw new Error("Evaluator portal is not implemented.");
  },
  getProfile: async () => {
    throw new Error("Evaluator portal is not implemented.");
  },
};
