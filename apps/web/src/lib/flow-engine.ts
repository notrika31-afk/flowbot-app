export type FlowButton = {
  label: string;
  next?: string;
};

export type FlowStep = {
  id: string;
  type: "message";
  content: string;
  buttons?: FlowButton[];
  next?: string;
};

export type Flow = {
  steps: FlowStep[];
};

export function simulateFlowReply(flow: Flow, userInput: string) {
  if (!flow || !flow.steps) return "שגיאה: אין תסריט.";

  const map = new Map(flow.steps.map(s => [s.id, s]));
  const start = flow.steps.find(s => s.id === "start") || flow.steps[0];
  if (!start) return "שגיאה: אין start.";

  // 1. בדיקה אם המשתמש כתב טקסט שמתאים לכפתור
  const stepContainingButtons = flow.steps.find(s =>
    s.buttons?.some(b => b.label === userInput)
  );

  if (stepContainingButtons) {
    const btn = stepContainingButtons.buttons!.find(b => b.label === userInput);
    if (btn?.next) {
      const nextStep = map.get(btn.next);
      return nextStep?.content || "המשך לא נמצא.";
    }
  }

  // 2. fallback – תמיד תחזיר את ההודעה הראשונה בתסריט
  return start.content;
}