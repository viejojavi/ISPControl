export interface IVendorDriver {
  identify(sysObjectID: string, sysDescr: string): boolean;
  discover(ip: string): Promise<any>;
  collectMetrics(session: any, ip: string): Promise<any>;
}
