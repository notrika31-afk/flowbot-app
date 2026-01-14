// app/api/ai/engine/type.ts

// הוספנו 'integration' כסוג שלב כדי שהבוט ידע שיש כאן פעולה טכנית מול יומן או שיטס
export type StepType = 'text' | 'question' | 'options' | 'integration' | 'end';

// הגדרה חדשה המאפשרת לבוט להגדיר איזו אינטגרציה להפעיל ובאיזו פעולה
export interface IntegrationMetadata {
  provider: 'GOOGLE_CALENDAR' | 'GOOGLE_SHEETS' | 'MAKE' | 'STRIPE' | 'PAYPAL';
  action: 'create_event' | 'check_availability' | 'append_row' | 'trigger_webhook';
  spreadsheetId?: string; // מיועד לגוגל שיטס
}

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
  
  // *** Integration Logic (NEW) ***
  // הגדרות עבור פעולות יומן או שיטס בשלב זה
  integration_config?: IntegrationMetadata;

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
  
  // שדה עזר ל-AI לדעת מהן האינטגרציות הנדרשות ל-Flow הזה
  required_integrations?: string[];
}