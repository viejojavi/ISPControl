import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PollingService {
  private readonly logger = new Logger(PollingService.name);

  // Example poll frequency
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Polling network devices...');
  }
}
