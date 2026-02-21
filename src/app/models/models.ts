export interface IncidentReport {
  incidentType: string;
  description: string;
  amountLost?: number;
  incidentTime: string;
  paymentPlatform?: string;
}

export interface EvidenceItem {
  id: number;
  text: string;
  checked: boolean;
}

export interface LegalProtection {
  title: string;
  section: string;
  explanation: string;
  howItHelps: string;
}

export interface ActionStep {
  timeframe: string;
  label: string;
  description: string;
  steps: string[];
  done: boolean;
}

export interface RecoveryWindow {
  percentage: number;
  message: string;
  hoursRemaining: number;
  encouragement: string;
}

export interface Helpline {
  bankPlatform: string;
  fraudHelpline: string;
  nodalOfficerEmail: string;
  chargebackWindow: string;
  officialPortal: string;
}

export interface CaseResult {
  whatHappened: {
    crimeType: string;
    summary: string;
    reassurance: string;
  };
  evidenceChecklist: EvidenceItem[];
  legalProtections: LegalProtection[];
  recoveryWindow: RecoveryWindow;
  actionPlan: ActionStep[];
  complaintDraft: string;
  helplines: Helpline[];
}

export interface FollowUpMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface FollowUpRequest {
  completedSteps: string[];
  currentPhase: string;
  crimeType: string;
  paymentPlatform?: string;
  amountLost?: number;
  incidentTime: string;
  userMessage: string;
}

export interface FollowUpResponse {
  message: string;
  nextSteps: string[];
  encouragement: string;
}
