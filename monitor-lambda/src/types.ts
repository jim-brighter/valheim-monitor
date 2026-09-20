export interface AgentState {
  PK?: string;
  ipAddress?: string;
  status?: string;
  currentVersion?: string;
  lastBackupTimestamp?: number;
  updatedTimestamp?: number;
  [key: string]: unknown;
}

export interface LambdaState {
  PK?: string;
  ipAddress?: string;
  status?: string;
  currentVersion?: string;
  lastBackupTimestamp?: number;
  [key: string]: unknown;
}

export interface MonitorSecrets {
  channel_id: string;
  token: string;
  user_agent?: string;
  port?: string | number;
  public_key?: string;
  [key: string]: unknown;
}

export interface EvaluateStatusChangeParams {
  agentState?: Partial<AgentState>;
  lambdaState?: Partial<LambdaState>;
  secrets?: Partial<MonitorSecrets>;
  now?: number;
}

export interface EvaluationResult {
  shouldNotify: boolean;
  updatedLambdaState: LambdaState | null;
  messageContent: string | null;
}
