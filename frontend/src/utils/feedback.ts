export type FeedbackMoment = "flip" | "correct" | "wrong" | "sessionDone" | "quizDone";

export type FeedbackDetail = { total: number; correct?: number; perfect?: boolean };

export type FeedbackListener = (moment: FeedbackMoment, detail?: FeedbackDetail) => void;

type FeedbackPayload = { moment: FeedbackMoment; detail?: FeedbackDetail };

const EVENT_NAME = "feedback";
const target = new EventTarget();

export function emitFeedback(moment: FeedbackMoment, detail?: FeedbackDetail) {
  target.dispatchEvent(
    new CustomEvent<FeedbackPayload>(EVENT_NAME, { detail: { moment, detail } }),
  );
}

export function onFeedback(listener: FeedbackListener) {
  const handle = (event: Event) => {
    const { moment, detail } = (event as CustomEvent<FeedbackPayload>).detail;
    listener(moment, detail);
  };
  target.addEventListener(EVENT_NAME, handle);
  return () => target.removeEventListener(EVENT_NAME, handle);
}
