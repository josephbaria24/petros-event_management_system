// Queue job types
export type EmailJobType = "evaluation" | "certificate";

export type EmailJobStatus = "pending" | "processing" | "sent" | "failed";

export interface EmailQueueJob {
  id: number;
  attendee_id: number | null;
  email: string;
  type: EmailJobType;
  payload: EvaluationPayload | CertificatePayload;
  status: EmailJobStatus;
  attempt: number;
  last_attempt_at: string | null;
  created_at: string;
}

export interface EvaluationPayload {
  referenceId: string;
  eventId: number;
}

export interface CertificatePayload {
  referenceId: string;
  templateType: "participation" | "awardee" | "attendance";
}

// Attendee with event relation for email sending
export interface AttendeeWithEvent {
  id: number;
  personal_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  reference_id: string;
  hassentevaluation: boolean;
  hasevaluation: boolean;
  events: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    venue: string | null;
  };
}

// Worker response types
export interface WorkerSuccessResponse {
  status: "success";
  jobId: number;
  type: EmailJobType;
  email: string;
  emailsSentThisHour: number;
}

export interface WorkerRateLimitResponse {
  status: "rate_limited";
  message: string;
  emailsSent: number;
  maxPerHour: number;
}

export interface WorkerIdleResponse {
  status: "idle";
  message: string;
}

export interface WorkerRetryResponse {
  status: "retry";
  jobId: number;
  attempt: number;
  maxRetries: number;
  error: string;
}

export interface WorkerFailedResponse {
  status: "failed";
  jobId: number;
  error: string;
  message: string;
}

export interface WorkerErrorResponse {
  status: "error";
  error: string;
}

export type WorkerResponse =
  | WorkerSuccessResponse
  | WorkerRateLimitResponse
  | WorkerIdleResponse
  | WorkerRetryResponse
  | WorkerFailedResponse
  | WorkerErrorResponse;