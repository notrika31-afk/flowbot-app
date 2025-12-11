// apps/web/src/lib/flow/engine.ts

export type FlowMessage =
  | { type: "text"; text: string }
  | { type: "buttons"; text: string; buttons: { id: string; title: string }[] }
  | { type: "image"; url: string; caption?: string }
  | { type: "redirect"; target: string }
  | { type: "end" };

export type FlowEngineResult = {
  messages: FlowMessage[];
  nextNode?: string | null;
  state?: any;
};

export async function runFlowNode(flow: any, nodeId: string, input: string, state: any): Promise<FlowEngineResult> {
  const node = flow.steps.find((s: any) => s.id === nodeId);
  if (!node) {
    return {
      messages: [{ type: "text", text: "הייתה בעיה בתסריט." }],
      nextNode: null,
    };
  }

  // Node Types
  switch (node.type) {
    case "message":
      return {
        messages: [{ type: "text", text: node.text }],
        nextNode: node.next || null,
        state,
      };

    case "buttons":
      return {
        messages: [
          {
            type: "buttons",
            text: node.text,
            buttons: node.options.map((o: any) => ({
              id: o.id,
              title: o.title,
            })),
          },
        ],
        nextNode: null, // מחכים לבחירה
        state,
      };

    case "input":
      return {
        messages: [{ type: "text", text: node.ask }],
        nextNode: null, // מחכים לקלט
        state: {
          ...state,
          waitingFor: node.field,
          nextAfterInput: node.next,
        },
      };

    default:
      return {
        messages: [{ type: "text", text: "לא מוכר סוג צעד בתסריט" }],
        nextNode: null,
      };
  }
}