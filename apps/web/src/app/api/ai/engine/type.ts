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
  
  // *** E-Commerce Engine ***
  // אם הסוג הוא 'question', התשובה תישמר במשתנה הזה
  variable?: string;      // למשל: "customer_name", "shipping_address"
  
  // ניווט
  options?: FlowButton[];       
  next_step_id?: string | null; 
  
  // Smart Navigation
  trigger_keywords?: string[]; 
}

export interface FlowJson {
  flowId?: string;
  businessName?: string;
  goal?: string;
  steps: FlowStep[]; // המערך הקריטי
  createdAt?: string;
  version?: number;
}