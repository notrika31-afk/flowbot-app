// app/api/ai/engine/type.ts

export type StepType = 'text' | 'question' | 'options' | 'end';

export interface FlowButton {
  text: string;
  next_step_id: string | null;
  label?: string;
  go?: string;
}

export interface FlowStep {
  id: string;
  type: StepType;
  title: string;
  content: string;

  // Smart NLP Engine — REQUIRED FOR SKIP LOGIC
  variable?: string;          // example: "date", "time", "service"
  entityType?: string;        // example: "date" | "time" | "service" | "product"
  required?: boolean;         // critical for knowing what must be asked

  // Navigation
  options?: FlowButton[];
  next_step_id?: string | null;

  // Trigger keywords (NLP fallback)
  trigger_keywords?: string[];
}

export interface FlowJson {
  flowId?: string;
  businessName?: string;
  goal?: string;
  steps: FlowStep[];
  createdAt?: string;
  version?: number;
}