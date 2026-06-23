import { Module } from '@nestjs/common';
import { SnmpService } from './snmp/snmp.service';
import { DiscoveryService } from './discovery/discovery.service';
import { PollingService } from './polling/polling.service';

@Module({
  providers: [SnmpService, DiscoveryService, PollingService],
  exports: [SnmpService, DiscoveryService, PollingService],
})
export class NetworkMonitoringModule {}
