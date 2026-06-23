import snmp from 'net-snmp';

export class SnmpService {
  private prepareSession(host: string, community: string, port: number) {
    return snmp.createSession(host, community, {
      port: port,
      retries: 3,
      timeout: 10000,
      version: snmp.Version2c
    });
  }

  public async get(host: string, community: string, port: number, oids: string[]): Promise<any> {
    const session = this.prepareSession(host, community, port);
    
    return new Promise((resolve, reject) => {
      session.get(oids, (error, varbinds) => {
        session.close();
        if (error) {
          reject(error);
        } else {
          resolve(varbinds);
        }
      });
    });
  }
}
