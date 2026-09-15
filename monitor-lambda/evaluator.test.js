import { describe, expect, it } from 'vitest';
import { evaluateStatusChange } from './evaluator.js';

describe('evaluateStatusChange', () => {
  const secrets = { port: 2456 };
  const now = 1_000_000_000;

  it('should not notify when server status and IP match and heartbeat is recent', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      updatedTimestamp: now - 30_000 // 30 seconds ago
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(false);
    expect(result.updatedLambdaState).toBeNull();
    expect(result.messageContent).toBeNull();
  });

  it('should notify on IP address change', () => {
    const agentState = {
      ipAddress: '5.6.7.8',
      status: 'active',
      updatedTimestamp: now - 30_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('New Address: 5.6.7.8:2456');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '5.6.7.8',
      status: 'active'
    });
  });

  it('should notify when server status changes from active to inactive', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'inactive',
      updatedTimestamp: now - 30_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('Server Status: 🔴 Down');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '1.2.3.4',
      status: 'inactive'
    });
  });

  it('should notify when server status changes from inactive to active', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      updatedTimestamp: now - 30_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'inactive'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('Server Status: 🟢 Up');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '1.2.3.4',
      status: 'active'
    });
  });

  it('should notify both IP change and status change when both change', () => {
    const agentState = {
      ipAddress: '9.9.9.9',
      status: 'active',
      updatedTimestamp: now - 10_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'inactive'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('New Address: 9.9.9.9:2456');
    expect(result.messageContent).toContain('Server Status: 🟢 Up');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '9.9.9.9',
      status: 'active'
    });
  });

  it('should treat server as inactive if agent update is older than 5 minutes', () => {
    const staleTime = now - (6 * 60 * 1000); // 6 minutes ago
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      updatedTimestamp: staleTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('Server Status: 🔴 Down');
    expect(result.updatedLambdaState.status).toBe('inactive');
  });

  it('should suppress repeated notifications if server is down due to stale heartbeat and lambda already knows it is inactive', () => {
    const staleTime = now - (6 * 60 * 1000);
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      updatedTimestamp: staleTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'inactive'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(false);
  });

  it('should notify when server version is updated', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.27'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('Server was updated to version 0.217.28');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    });
  });

  it('should notify version change alongside status and IP changes', () => {
    const agentState = {
      ipAddress: '5.6.7.8',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 10_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'inactive',
      currentVersion: '0.217.27'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('New Address: 5.6.7.8:2456');
    expect(result.messageContent).toContain('Server Status: 🟢 Up');
    expect(result.messageContent).toContain('Server was updated to version 0.217.28');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '5.6.7.8',
      status: 'active',
      currentVersion: '0.217.28'
    });
  });

  it('should not notify when version, status, and IP all match', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(false);
    expect(result.updatedLambdaState).toBeNull();
    expect(result.messageContent).toBeNull();
  });

  it('should notify and record currentVersion on first run when lambdaState has no currentVersion recorded', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active'
      // currentVersion is missing / undefined
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('Server was updated to version 0.217.28');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    });
  });

  it('should notify when backup is older than 25 hours', () => {
    const staleBackupTime = now - (26 * 60 * 60 * 1000); // 26 hours ago
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000,
      lastBackupTimestamp: staleBackupTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('Missed backup - last backup was 26 hours ago');
    expect(result.updatedLambdaState.lastBackupTimestamp).toBe(staleBackupTime);
  });

  it('should suppress repeated notifications when missed backup was already alerted', () => {
    const staleBackupTime = now - (26 * 60 * 60 * 1000);
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000,
      lastBackupTimestamp: staleBackupTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      lastBackupTimestamp: staleBackupTime
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(false);
    expect(result.updatedLambdaState).toBeNull();
    expect(result.messageContent).toBeNull();
  });

  it('should not notify when backup is recent (< 25 hours)', () => {
    const recentBackupTime = now - (10 * 60 * 60 * 1000); // 10 hours ago
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000,
      lastBackupTimestamp: recentBackupTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(false);
  });

  it('should not notify when agent backup timestamp is 0 or undefined', () => {
    const agentState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 30_000,
      lastBackupTimestamp: 0
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(false);
  });

  it('should notify missed backup alongside status and IP changes', () => {
    const staleBackupTime = now - (30 * 60 * 60 * 1000); // 30 hours ago
    const agentState = {
      ipAddress: '5.6.7.8',
      status: 'inactive',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 10_000,
      lastBackupTimestamp: staleBackupTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28'
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('New Address: 5.6.7.8:2456');
    expect(result.messageContent).toContain('Server Status: 🔴 Down');
    expect(result.messageContent).toContain('Missed backup - last backup was 30 hours ago');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '5.6.7.8',
      status: 'inactive',
      currentVersion: '0.217.28',
      lastBackupTimestamp: staleBackupTime
    });
  });

  it('should notify IP change even if missed backup was already alerted', () => {
    const staleBackupTime = now - (26 * 60 * 60 * 1000);
    const agentState = {
      ipAddress: '5.6.7.8',
      status: 'active',
      currentVersion: '0.217.28',
      updatedTimestamp: now - 10_000,
      lastBackupTimestamp: staleBackupTime
    };
    const lambdaState = {
      ipAddress: '1.2.3.4',
      status: 'active',
      currentVersion: '0.217.28',
      lastBackupTimestamp: staleBackupTime
    };

    const result = evaluateStatusChange({ agentState, lambdaState, secrets, now });

    expect(result.shouldNotify).toBe(true);
    expect(result.messageContent).toContain('New Address: 5.6.7.8:2456');
    expect(result.messageContent).not.toContain('Missed backup');
    expect(result.updatedLambdaState).toEqual({
      PK: 'lambda-status',
      ipAddress: '5.6.7.8',
      status: 'active',
      currentVersion: '0.217.28',
      lastBackupTimestamp: staleBackupTime
    });
  });
});
