import { Injectable } from '@nestjs/common';

@Injectable()
export class ServiceMetrics {
  private rejectedAgentRequests = 0;
  private lastHeartbeatDurationMs = 0;
  private heartbeats = 0;
  private acceptedMetrics = 0;
  private rejectedMetrics = 0;
  private enrollments = 0;
  private enrollmentFailures = 0;
  private lastJobDurationMs = 0;
  private statusCounts = { online: 0, offline: 0, pending: 0, degraded: 0, revoked: 0 };

  recordRejectedAgentRequest(): void {
    this.rejectedAgentRequests += 1;
  }

  recordHeartbeat(): void {
    this.heartbeats += 1;
  }

  recordHeartbeatDuration(durationMs: number): void {
    this.lastHeartbeatDurationMs = durationMs;
  }

  recordAcceptedMetrics(): void {
    this.acceptedMetrics += 1;
  }

  recordRejectedMetrics(): void {
    this.rejectedMetrics += 1;
  }

  recordEnrollment(success: boolean): void {
    if (success) {
      this.enrollments += 1;
    } else {
      this.enrollmentFailures += 1;
    }
  }

  recordJobDuration(durationMs: number): void {
    this.lastJobDurationMs = durationMs;
  }

  setStatusCounts(counts: typeof this.statusCounts): void {
    this.statusCounts = counts;
  }

  snapshot() {
    return {
      rejectedAgentRequests: this.rejectedAgentRequests,
      lastHeartbeatDurationMs: this.lastHeartbeatDurationMs,
      heartbeats: this.heartbeats,
      acceptedMetrics: this.acceptedMetrics,
      rejectedMetrics: this.rejectedMetrics,
      enrollments: this.enrollments,
      enrollmentFailures: this.enrollmentFailures,
      lastJobDurationMs: this.lastJobDurationMs,
      servers: this.statusCounts,
    };
  }
}
