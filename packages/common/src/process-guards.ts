export type ProcessGuardLogger = {
  error: (payload: Record<string, unknown>, message: string) => void;
};

export function installProcessGuards(input: { service: string; logger: ProcessGuardLogger }): void {
  process.on('unhandledRejection', (reason) => {
    input.logger.error({ err: reason, service: input.service }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    input.logger.error({ err: error, service: input.service }, 'Uncaught exception');
    process.exit(1);
  });
}
