import { lazy } from "react";

export const DeckPage = lazy(() =>
  import("./pages/DeckPage").then((m) => ({ default: m.DeckPage })),
);
export const GeneratePage = lazy(() =>
  import("./pages/GeneratePage").then((m) => ({ default: m.GeneratePage })),
);
export const GenerationPage = lazy(() =>
  import("./pages/GenerationPage").then((m) => ({ default: m.GenerationPage })),
);
export const PracticePage = lazy(() =>
  import("./pages/PracticePage").then((m) => ({ default: m.PracticePage })),
);
export const QuizPage = lazy(() =>
  import("./pages/QuizPage").then((m) => ({ default: m.QuizPage })),
);
export const ReviewPage = lazy(() =>
  import("./pages/ReviewPage").then((m) => ({ default: m.ReviewPage })),
);
export const ReviewPickerPage = lazy(() =>
  import("./pages/ReviewPickerPage").then((m) => ({ default: m.ReviewPickerPage })),
);
export const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
// loaded on first visit; HomePage and LoginPage stay in the main bundle
