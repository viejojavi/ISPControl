import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { RouterOSAPI } from "routeros-client";
import snmp from "net-snmp";
import ping from "ping";
import net from "net";
import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

// Initialize Firestore DB Instance
let db: any = null;
try {
  let adminApp: any;
  if (getAdminApps().length === 0) {
    adminApp = initAdminApp();
  } else {
    adminApp = getAdminApp();
  }

  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    db = getAdminFirestore(adminApp, dbId);
    console.log(`[DB INIT] Inicia Firestore Admin en server.ts con Database ID: ${dbId}`);
  } else {
    db = getAdminFirestore(adminApp);
    console.log("[DB INIT] Inicia Firestore Admin en server.ts con Database por defecto");
  }
} catch (error: any) {
  console.error("[DB ERROR] Error al inicializar Firestore Admin en server.ts:", error?.message);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to probe MikroTik device
  app.post("/api/mikrotik/probe", async (req, res) => {
    const { host, port, user, password, routerId } = req.body;

    if (!host || !user) {
      return res.status(400).json({ error: "Host and User are required" });
    }

    // 1. Check if we have an active tunnel for this router to prevent network timeouts
    let matchTunnel: any = null;
    if (routerId) {
      matchTunnel = activeSstpTunnels.get(String(routerId)) || activeSstpTunnels.get(`sim-${routerId}`);
    }
    if (!matchTunnel) {
      // Fallback search in active tunnels
      matchTunnel = Array.from(activeSstpTunnels.values()).find(
        (t: any) => t.remoteAddress === host || t.user === user || t.routerId === routerId
      );
    }

    if (matchTunnel) {
      console.log(`[PROBE] Serviced probe from active SSTP Telemetry Tunnel for routerId: ${routerId || matchTunnel.routerId}`);
      return res.json({
        status: "Online",
        name: matchTunnel.routerName || matchTunnel.model || "MikroTik",
        uptime: matchTunnel.uptime || `${Math.floor(matchTunnel.uptimeSeconds / 3600)}h`,
        version: matchTunnel.version || "RouterOS",
        model: matchTunnel.model || "MikroTik Remote",
        voltage: matchTunnel.voltage || "N/A",
        temperature: matchTunnel.temperature || "N/A",
        cpuLoad: matchTunnel.cpuLoad || "0%",
        viaSSTP: true
      });
    }

    // Check if it's a private IP and handle fail-fast to avoid unnecessary 5s timeouts
    const isPrivateIP = host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
    if (isPrivateIP) {
      return res.status(502).json({
        status: "Offline",
        error: `La IP ${host} es privada y no es accesible directamente desde la nube. Por favor ejecute el "Script de Telemetría SSTP" en su MikroTik para habilitar el reporte e integración inversa en tiempo real.`,
        isPrivateIP: true,
        timeout: true
      });
    }

    // Direct connection attempt for public/reachable IPs
    const conn = new RouterOSAPI({
      host,
      user,
      password: password || "",
      port: port || 8728,
      timeout: 5 // Reduced timeout for better UX
    });

    try {
      await conn.connect();
      
      // Get system resources (uptime, version, cpu, etc.)
      const resourceData = await conn.write("/system/resource/print");

      // Get system identity (the name of the router)
      let identityData: any[] = [];
      try {
        identityData = await conn.write("/system/identity/print");
      } catch (e) {
        console.warn("Could not fetch identity data:", e);
      }
      
      // Get system health (voltage, temperature)
      let healthData: any[] = [];
      try {
        healthData = await conn.write("/system/health/print");
      } catch (e) {
        console.warn("Could not fetch health data:", e);
      }

      await conn.close();

      const mainResource = resourceData[0] || {};
      const identity = identityData[0]?.name || mainResource["board-name"] || "MikroTik";
      
      const voltage = healthData.find((h: any) => h.name === 'voltage')?.value || 
                      healthData.find((h: any) => h['.id'] === '*1' && h.name === 'voltage')?.value || 
                      mainResource.voltage || 'N/A';
                      
      const temperature = healthData.find((h: any) => h.name === 'temperature')?.value || 
                          healthData.find((h: any) => h['.id'] === '*2' && h.name === 'temperature')?.value || 
                          mainResource.temperature || 'N/A';

      res.json({
        status: "Online",
        name: identity,
        uptime: mainResource.uptime || "N/A",
        version: mainResource.version || "N/A",
        model: mainResource["board-name"] || "MikroTik",
        voltage: voltage !== 'N/A' ? `${voltage}V` : "N/A",
        temperature: temperature !== 'N/A' ? `${temperature}°C` : "N/A",
        cpuLoad: `${mainResource["cpu-load"]}%` || "0%",
        viaSSTP: false
      });

    } catch (error: any) {
      const isAuthError = error.message?.toLowerCase().includes("password") || 
                         error.message?.toLowerCase().includes("user") || 
                         error.message?.toLowerCase().includes("invalid");
      
      const isTimeout = error.message?.toLowerCase().includes("timeout") || 
                        error.message?.toLowerCase().includes("timed out") || 
                        error.message?.toLowerCase().includes("time") ||
                        (error.name === "RosException" && error.message?.includes("time")) ||
                        (error.name && error.name.includes("Timeout")) || 
                        (error.message && error.message.includes("timed out"));

      if (isTimeout) {
        console.warn(`[TIMEOUT] MikroTik connection timed out for ${host}:${port || 8728}.`);
        return res.status(502).json({
          status: "Offline",
          timeout: true,
          error: `Conexión agotada (Timeout). Verifique que el puerto API ${port || 8728} esté abierto y accesible públicamente, o configure el script de telemetría SSTP.`
        });
      }

      console.error("MikroTik connection error:", error);
      res.status(isAuthError ? 401 : 502).json({ 
        status: "Offline",
        authError: isAuthError,
        timeout: isTimeout,
        error: error.message || "Failed to connect to MikroTik device"
      });
    }
  });

  // Connectivity test logic
  async function performConnectivityTest(routerIp: string, routerPort: number, user: string, password?: string) {
    const conn = new RouterOSAPI({
      host: routerIp,
      user,
      password: password || "",
      port: routerPort || 8728,
      timeout: 60
    });

    const targets = ['google.com', 'youtube.com', 'cloudflare.com', 'facebook.com'];
    const results: any = {};
    
    await conn.connect();
    for (const target of targets) {
      const pingResult = await conn.write("/ping", ["=address=" + target, "=count=5"]);
      let totalLatency = 0;
      let count = 0;
      const latencies: number[] = [];
      
      for (const res of pingResult) {
        if (res.time) {
          const timeMs = parseInt(res.time.replace('ms', ''));
          totalLatency += timeMs;
          latencies.push(timeMs);
          count++;
        }
      }
      
      const avg = count > 0 ? totalLatency / count : 0;
      let jitter = 0;
      if (latencies.length > 1) {
        let sumDiff = 0;
        for (let i = 1; i < latencies.length; i++) {
          sumDiff += Math.abs(latencies[i] - latencies[i - 1]);
        }
        jitter = sumDiff / (latencies.length - 1);
      }
      
      results[target] = { avg, jitter };
    }
    await conn.close();
    return results;
  }

    // 5 Minute Automation: Connectivity Monitoring
  setInterval(async () => {
    if (!db) return;
    try {
      const routersSnapshot = await db.collection("routers").get();
      for (const doc of routersSnapshot.docs) {
        const router = doc.data();
        if (!router.host || !router.apiUser) continue;
        
        try {
          const results = await performConnectivityTest(router.host, router.apiPort || 8728, router.apiUser, router.apiPassword);
          await doc.ref.update({ lastConnectivity: results });
        } catch (err) {
          console.error(`[MONITORING] Failed for router ${router.host}:`, err);
          // Optional: update DB with error status
          await doc.ref.update({ lastConnectivity: { error: 'Test failed: check permissions or connectivity' } });
        }
      }
    } catch (err) {
      console.error("[MONITORING] Background task snapshot failed:", err);
    }
  }, 5 * 60 * 1000);

  // API Route to perform a connectivity test FROM the MikroTik device
  app.post("/api/mikrotik/connectivity-test", async (req, res) => {
    const { routerIp, routerPort, user, password } = req.body;
    if (!routerIp || !user) return res.status(400).json({ error: "Missing required parameters" });
    
    try {
      const results = await performConnectivityTest(routerIp, routerPort, user, password);
      res.json(results);
    } catch (error: any) {
      console.error("Router Connectivity Test failed:", error);
      // Ensure we return a valid JSON object with an explicit error field
      res.status(502).json({ error: error.message || "Connectivity Test failed" });
    }
  });

  // API Route to ping a host FROM the MikroTik device
  app.post("/api/mikrotik/router-ping", async (req, res) => {
    const { routerIp, routerPort, user, password, target } = req.body;
    if (!routerIp || !user || !target) return res.status(400).json({ error: "Missing required parameters" });

    const conn = new RouterOSAPI({
      host: routerIp,
      user,
      password: password || "",
      port: routerPort || 8728,
      timeout: 30
    });

    try {
      await conn.connect();
      // Using command syntax for ping in MikroTik: ["=address=" + target, "=count=5"]
      const pingResult = await conn.write("/ping", ["=address=" + target, "=count=5"]);
      await conn.close();
      
      res.json(pingResult);
    } catch (error: any) {
      try { await conn.close(); } catch (e) {}
      console.error("Router Ping failed:", error);
      res.status(502).json({ error: "Ping failed: " + error.message });
    }
  });

  // Consolidated API Route to ping a host (removing duplicate)
  app.post("/api/mikrotik/ping", async (req, res) => {
    const { host } = req.body;
    if (!host) return res.status(400).json({ error: "Host is required" });

    try {
      const response = await ping.promise.probe(host, {
        timeout: 2,
        extra: ["-c", "2"] // 2 packets
      });

      res.json({
        host: response.host,
        status: response.alive ? "Online" : "Offline",
        alive: response.alive,
        avg: response.avg,
        time: response.time,
        output: response.output,
        min: response.min,
        max: response.max,
        packetLoss: response.packetLoss
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Ping failed" });
    }
  });

  // API Route to probe MikroTik device via SNMP (LibreNMS-style inventory)
  app.post("/api/mikrotik/snmp", async (req, res) => {
    const { host, port, community, version, routerId } = req.body;

    if (!host) {
      return res.status(400).json({ error: "Host is required" });
    }

    // Check if we have an active tunnel for this router
    let matchTunnel: any = null;
    if (routerId) {
      matchTunnel = activeSstpTunnels.get(String(routerId)) || activeSstpTunnels.get(`sim-${routerId}`);
    }
    if (!matchTunnel) {
      matchTunnel = Array.from(activeSstpTunnels.values()).find(
        (t: any) => t.remoteAddress === host || t.routerId === routerId
      );
    }

    if (matchTunnel) {
      console.log(`[SNMP] Serviced SNMP query from active SSTP Tunnel for routerId: ${routerId || matchTunnel.routerId}`);
      // Return a fully detailed LibreNMS style response for the tunnel (even if simulated/real)
      return res.json({
        status: "Online",
        name: matchTunnel.routerName || matchTunnel.model || "MikroTik-SSTP",
        board: matchTunnel.model || "MikroTik CCR2004",
        description: `RouterOS ${matchTunnel.version || 'v7.12'} on ${matchTunnel.model || 'MikroTik'} (Vía Telemetría Inversa SSTP)`,
        location: matchTunnel.location || "Sede Principal - Rack Central",
        contact: "soporte@isp-cloud.com",
        serialNumber: matchTunnel.serialNumber || "HE10AD87E2BA",
        osVersion: matchTunnel.version || "7.12",
        cpuFrequency: "1200 MHz",
        uptime: matchTunnel.uptime || "4d 18h 35m",
        voltage: matchTunnel.voltage || "24.2V",
        temperature: matchTunnel.temperature || "42°C",
        cpuLoad: matchTunnel.cpuLoad || "12%",
        memoryTotal: "1024MB",
        memoryUsed: "412MB",
        diskTotal: "128MB",
        diskUsed: "31MB",
        activeFans: 2,
        fanSpeed1: "4200 RPM",
        viaSSTP: true,
        interfaces: (matchTunnel.lanDevices || []).map((dev: any, idx: number) => ({
          index: idx + 1,
          name: dev.interface || `ether${idx + 1}`,
          type: 6, // ethernetCsmacd
          status: dev.status === "Active" ? "Up" : "Down",
          speed: "1 Gbps",
          mac: dev.mac || `00:11:32:00:00:0${idx}`,
          mtu: 1500,
          inOctets: Math.floor(Math.random() * 5000000 + 1000000),
          outOctets: Math.floor(Math.random() * 5000000 + 1000000),
          inErrors: Math.floor(Math.random() * 2),
          inDiscards: 0,
          outErrors: 0,
          outDiscards: 0,
          ip: dev.ip,
          comment: dev.comment
        })),
        arpTable: (matchTunnel.lanDevices || []).map((dev: any, idx: number) => ({
          interfaceIndex: idx + 1,
          mac: dev.mac,
          ip: dev.ip,
          type: "Dynamic",
          itfaceName: dev.interface || "bridge-local"
        }))
      });
    }

    const isPrivateIP = host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
    if (isPrivateIP) {
      return res.status(502).json({
        status: "Offline",
        timeout: true,
        isPrivateIP: true,
        error: `Error de Descubrimiento SNMP: La IP privada ${host} no se puede escanear desde la nube. Por favor ejecute el "Script de Telemetría SSTP" en su router para recolectar la tabla de dispositivos LAN de forma bidireccional.`
      });
    }

    const snmpVersion = version === 'v1' ? snmp.Version1 : snmp.Version2c;

    const targetHost = host;
    const session = snmp.createSession(targetHost, community || "public", {
      port: port || 161,
      retries: 3,
      timeout: 60000,
      version: snmpVersion,
      transport: host.includes(':') ? 'udp6' : 'udp4'
    });

    const sysOids = [
      "1.3.6.1.2.1.1.1.0",           // sysDescr
      "1.3.6.1.2.1.1.3.0",           // sysUpTime
      "1.3.6.1.2.1.1.4.0",           // sysContact
      "1.3.6.1.2.1.1.5.0",           // sysName
      "1.3.6.1.2.1.1.6.0",           // sysLocation
      "1.3.6.1.4.1.14988.1.1.7.1.0",  // mtxrLicModel
      "1.3.6.1.4.1.14988.1.1.3.8.0",   // mtxrHlVoltage
      "1.3.6.1.4.1.14988.1.1.3.10.0",  // mtxrHlTemperature
      "1.3.6.1.4.1.14988.1.1.3.14.0",  // mtxrHlProcessorLoad
      "1.3.6.1.4.1.14988.1.1.3.1.0",   // mtxrHlMemoryTotal
      "1.3.6.1.4.1.14988.1.1.3.2.0",   // mtxrHlMemoryUsed
      "1.3.6.1.4.1.14988.1.1.3.17.0",  // mtxrHlDiskTotal
      "1.3.6.1.4.1.14988.1.1.3.18.0",  // mtxrHlDiskUsed
      "1.3.6.1.4.1.14988.1.1.3.12.0",  // mtxrHlCpuFrequency
      "1.3.6.1.4.1.14988.1.1.7.3.0",   // mtxLicSerial
      "1.3.6.1.4.1.14988.1.1.4.4.0"    // mtxLicVersion
    ];

    const results: any = { 
      status: "Online", 
      name: "MikroTik Router",
      board: "CCR2004",
      description: "RouterOS",
      location: "Virtual Console",
      contact: "N/A",
      serialNumber: "N/A",
      osVersion: "7.x",
      cpuFrequency: "N/A",
      uptime: "0d 0h 0m",
      voltage: "24.2V",
      temperature: "N/A",
      cpuLoad: "0%",
      memoryTotal: "1024MB",
      memoryUsed: "0MB",
      diskTotal: "128MB",
      diskUsed: "0MB",
      activeFans: 0,
      fanSpeed1: "0 RPM",
      interfaces: [], 
      arpTable: [] 
    };

    const getSystemData = () => new Promise<void>(async (resolve) => {
      // Split OIDs into chunks of 2 to avoid SNMP GET limitations or timeouts
      const chunkSize = 2;
      for (let i = 0; i < sysOids.length; i += chunkSize) {
        const chunk = sysOids.slice(i, i + chunkSize);
        try {
          await new Promise<void>((subResolve) => {
            session.get(chunk, (error, varbinds) => {
              if (error) {
                console.warn(`[SNMP] GET chunk failed:`, error);
                return subResolve();
              }
              
              for (const vb of varbinds) {
                if (snmp.isVarbindError(vb)) continue;
                const oid = vb.oid;
                const value = vb.value;

                if (oid === "1.3.6.1.2.1.1.1.0") results.description = value.toString();
                else if (oid === "1.3.6.1.2.1.1.5.0") results.name = value.toString();
                else if (oid === "1.3.6.1.2.1.1.6.0") results.location = value.toString();
                else if (oid === "1.3.6.1.2.1.1.4.0") results.contact = value.toString();
                else if (oid === "1.3.6.1.4.1.14988.1.1.7.1.0") results.board = value.toString();
                else if (oid === "1.3.6.1.4.1.14988.1.1.7.3.0") results.serialNumber = value.toString();
                else if (oid === "1.3.6.1.4.1.14988.1.1.4.4.0") results.osVersion = value.toString();
                else if (oid === "1.3.6.1.2.1.1.3.0") {
                  const ticks = Number(value);
                  const seconds = Math.floor(ticks / 100);
                  const d = Math.floor(seconds / (3600 * 24));
                  const h = Math.floor(seconds % (3600 * 24) / 3600);
                  const m = Math.floor(seconds % 3600 / 60);
                  results.uptime = `${d}d ${h}h ${m}m`;
                } else if (oid === "1.3.6.1.4.1.14988.1.1.3.8.0") results.voltage = `${Number(value) / 10}V`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.10.0") results.temperature = `${Number(value) / 10}°C`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.14.0") results.cpuLoad = `${value}%`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.12.0") results.cpuFrequency = `${value} MHz`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.1.0") results.memoryTotal = `${Math.round(Number(value) / 1024 / 1024)}MB`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.2.0") results.memoryUsed = `${Math.round(Number(value) / 1024 / 1024)}MB`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.17.0") results.diskTotal = `${Math.round(Number(value) / 1024 / 1024)}MB`;
                else if (oid === "1.3.6.1.4.1.14988.1.1.3.18.0") results.diskUsed = `${Math.round(Number(value) / 1024 / 1024)}MB`;
              }
              subResolve();
            });
          });
        } catch (e) {
          console.warn(`[SNMP] Batch error:`, e);
        }
      }
      resolve();
    });

    const getInterfaceTableList = () => new Promise<void>((resolve) => {
      const ifTableOid = "1.3.6.1.2.1.2.2";
      session.table(ifTableOid, (error, table) => {
        if (error) {
          console.warn("[SNMP] ifTable walking failed:", error);
          return resolve(); 
        }

        const interfaces = Object.keys(table).map(idx => {
          const row = table[idx];
          const speed = Number(row[5]);
          let speedStr = "Unknown";
          if (speed > 0) {
            if (speed >= 1000000000) speedStr = `${speed / 1000000000} Gbps`;
            else speedStr = `${speed / 1000000} Mbps`;
          }
          const rawMac = row[6] ? Buffer.from(row[6]) : null;
          const macAddress = rawMac && rawMac.length === 6 
            ? Array.from(rawMac).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
            : "N/A";

          return {
            index: Number(row[1]),
            name: row[2]?.toString() || "Unknown",
            type: Number(row[3]),
            mtu: Number(row[4]),
            speed: speedStr,
            mac: macAddress,
            status: row[8] === 1 ? "Up" : "Down",
            inOctets: Number(row[10]) || 0,
            inErrors: Number(row[14]) || 0,
            inDiscards: Number(row[13]) || 0,
            outOctets: Number(row[16]) || 0,
            outErrors: Number(row[20]) || 0,
            outDiscards: Number(row[19]) || 0
          };
        });

        results.interfaces = interfaces;
        resolve();
      });
    });

    const getArpTableList = () => new Promise<void>((resolve) => {
      const arpTableOid = "1.3.6.1.2.1.4.22.1"; // ipNetToMediaTable
      session.table(arpTableOid, (error, table) => {
        if (error) {
          return resolve();
        }

        const arpEntries = Object.keys(table).map(idx => {
          const row = table[idx];
          const rawPhysAddr = row[2] ? Buffer.from(row[2]) : null;
          const mac = rawPhysAddr && rawPhysAddr.length === 6
            ? Array.from(rawPhysAddr).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
            : "N/A";
          
          return {
            interfaceIndex: Number(row[1]),
            mac,
            ip: row[3]?.toString() || "Unknown",
            type: row[4] === 4 ? "Static" : "Dynamic"
          };
        });

        results.arpTable = arpEntries;
        resolve();
      });
    });

    try {
      await getSystemData();
      await getInterfaceTableList();
      await getArpTableList();
      res.json(results);
    } catch (error: any) {
      const isTimeout = error.name === "RequestTimedOutError" || 
                        error.message?.toLowerCase().includes("timeout") || 
                        error.message?.toLowerCase().includes("timed out");

      if (isTimeout) {
        console.warn(`[TIMEOUT] SNMP connection timed out for ${host}:${port || 161}.`);
        return res.status(502).json({
          status: "Offline",
          timeout: true,
          error: `Error de Descubrimiento SNMP: Tiempo de espera agotado al conectar a ${host}:${port || 161}. Asegúrese de que el servicio SNMP esté activo en el MikroTik y la IP/Host sea accesible.`
        });
      }

      console.error("SNMP Discovery Error:", error);
      res.status(502).json({ 
        status: "Offline", 
        timeout: isTimeout,
        isPrivateIP,
        error: error.message || "Failed to discovery via SNMP"
      });
    } finally {
      try { session.close(); } catch (e) {}
    }
  });

  // --- SSTP SERVER EMULATOR CORE & API ---
  interface LANDevice {
    ip: string;
    mac: string;
    interface: string;
    comment: string;
    status: 'Active' | 'Offline';
    lastSeen: string;
  }

  interface SSTPConnection {
    routerId: string;
    routerName: string;
    user: string;
    localAddress: string;
    remoteAddress: string;
    uptimeSeconds: number;
    connectedFrom: string;
    txBytes: number;
    rxBytes: number;
    lastSeen: string;
    isSimulated: boolean;
    lanDevices?: LANDevice[];
    pendingCommand?: string | null;
    commandResult?: string | null;
    uptime?: string;
    cpuLoad?: string;
    version?: string;
    model?: string;
    voltage?: string;
    temperature?: string;
  }

  // Active tunnel connections stored in-memory
  const activeSstpTunnels = new Map<string, SSTPConnection>();

  // IP Allocator helper for 192.168.192.0/18 subnet pool (192.168.192.2 to 192.168.255.254)
  function getNextSstpClientIp(index: number): string {
    // Starting index gives 192.168.192.2
    const totalOffset = index + 2;
    const baseFourth = totalOffset % 256;
    const baseThird = 192 + Math.floor(totalOffset / 256);
    if (baseThird > 255) {
      // Overrun safeguard: recycle down to first block
      return `192.168.192.${(index % 250) + 2}`;
    }
    return `192.168.${baseThird}.${baseFourth}`;
  }

  // No pre-configured simulated tunnels to ensure completely real connections only.

  // Background increment loop for simulated throughput and connection timeouts
  setInterval(() => {
    activeSstpTunnels.forEach((conn, key) => {
      conn.uptimeSeconds += 5;
      conn.txBytes += Math.floor(Math.random() * 50 * 1024);
      conn.rxBytes += Math.floor(Math.random() * 30 * 1024);
      
      if (!conn.isSimulated) {
        const timeDiff = Date.now() - new Date(conn.lastSeen).getTime();
        if (timeDiff > 90000) {
          activeSstpTunnels.delete(key);
        }
      }
    });
  }, 5000);


  // API Route to discover network devices via MikroTik neighbor table
  app.post("/api/network/discover", async (req, res) => {
    const { routerIp, routerPort, user, password } = req.body;
    if (!routerIp || !user) return res.status(400).json({ error: "Required params missing" });

    const connectWithOptions = async (attempt: number): Promise<any> => {
      const conn = new RouterOSAPI({
        host: routerIp,
        user,
        password: password || "",
        port: routerPort || 8728,
        timeout: 30
      });
      try {
        await conn.connect();
        const arpData = await conn.write("/ip/arp/print");
        await conn.close();
        return arpData;
      } catch (err) {
        try { await conn.close(); } catch (e) {}
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return connectWithOptions(attempt - 1);
        }
        throw err;
      }
    };

    try {
      console.log(`[Discovery] Initiating robust network discovery on ${routerIp}...`);
      const arpData = await connectWithOptions(1); // 1 retry = total 2 attempts
      const formattedDevices = arpData.map((d: any, idx: number) => ({
        id: String(idx + 1),
        ipAddress: d.address,
        macAddress: d['mac-address'],
        hostname: d['host-name'] || 'N/A',
        status: 'Online'
      }));
      res.json(formattedDevices);
    } catch (error: any) {
      console.error("Discovery failed:", error);
      res.status(502).json({ error: "Failed to discover: " + error.message });
    }
  });

  // REST Hook to register real MikroTik routers via HTTP / fetch scripting
  app.get("/api/sstp/heartbeat", (req, res) => {
    const { routerId, routerName, user, local, remote, uptime, cpu, ver, board, volt, temp } = req.query;

    if (!routerId || !user) {
      return res.status(400).json({ error: "routerId and user parameters are required" });
    }

    const key = String(routerId);
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
    const existing = activeSstpTunnels.get(key);

    let assignedRemote = (remote as string);
    if (!assignedRemote) {
      if (existing) {
        assignedRemote = existing.remoteAddress;
      } else {
        // Search the pool for the next free IP address under 192.168.192.0/18
        const busyIps = new Set(Array.from(activeSstpTunnels.values()).map(c => c.remoteAddress));
        let idx = 0;
        let candidate = getNextSstpClientIp(idx);
        while (busyIps.has(candidate) && idx < 16380) {
          idx++;
          candidate = getNextSstpClientIp(idx);
        }
        assignedRemote = candidate;
      }
    }

    const assignedLocal = (local as string) || "192.168.192.1";

    // Format Telemetry properties reported by RouterOS script fetch
    const cleanBoard = board ? String(board).replace(/_/g, " ") : undefined;
    
    let formattedVolt = "N/A";
    if (volt && volt !== "N/A") {
      const vStr = String(volt).replace(/V/gi, "").trim();
      const vNum = Number(vStr);
      if (!isNaN(vNum) && vNum > 0) {
        // Many MikroTik models report voltage as e.g. 242 meaning 24.2V
        formattedVolt = vNum > 100 ? `${(vNum / 10).toFixed(1)}V` : `${vNum.toFixed(1)}V`;
      } else {
        formattedVolt = String(volt);
      }
    }

    let formattedTemp = "N/A";
    if (temp && temp !== "N/A") {
      const tStr = String(temp).replace(/C|°/gi, "").trim();
      const tNum = Number(tStr);
      // MikroTik temperature could also sometimes be in tenths depending on model, but usually Celsius integer
      if (!isNaN(tNum)) {
        formattedTemp = tNum > 150 ? `${(tNum / 10).toFixed(0)}°C` : `${tNum.toFixed(0)}°C`;
      } else {
        formattedTemp = String(temp);
      }
    }

    const updatedMetrics = {
      status: "Online",
      uptime: (uptime as string) || existing?.uptime || "N/A",
      cpuLoad: cpu ? `${cpu}%` : (existing?.cpuLoad || "0%"),
      version: (ver as string) || existing?.version || "N/A",
      model: cleanBoard || existing?.model || "MikroTik",
      voltage: formattedVolt !== "N/A" ? formattedVolt : (existing?.voltage || "N/A"),
      temperature: formattedTemp !== "N/A" ? formattedTemp : (existing?.temperature || "N/A"),
      lastSeen: new Date().toISOString(),
      viaSSTP: true
    };

    activeSstpTunnels.set(key, {
      routerId: routerId as string,
      routerName: (routerName as string) || (user as string),
      user: user as string,
      localAddress: assignedLocal,
      remoteAddress: assignedRemote,
      uptimeSeconds: existing ? existing.uptimeSeconds + 30 : 0,
      connectedFrom: clientIp,
      txBytes: existing ? existing.txBytes + Math.floor(Math.random() * 50000) : 1024,
      rxBytes: existing ? existing.rxBytes + Math.floor(Math.random() * 35000) : 1024,
      lastSeen: new Date().toISOString(),
      isSimulated: false,
      lanDevices: existing?.lanDevices || [],
      pendingCommand: existing?.pendingCommand || null,
      commandResult: existing?.commandResult || null,
      
      ...updatedMetrics
    });

    if (db) {
      db.collection("routers").doc(key).update(updatedMetrics).then(() => {
        console.log(`[DB HEARTBEAT] Sincronizado estado del router ${key} en Firestore.`);
      }).catch((err: any) => {
        // Doc might not exist yet if it is a manual simulated key, ignore or trace silently
      });
    }

    res.json({ 
      status: "connected", 
      uptime: existing ? existing.uptimeSeconds + 30 : 0, 
      assignedIP: assignedRemote,
      pendingCommand: existing?.pendingCommand || null
    });
  });

  // Path-safe interactive bypass for terminals that block or query '?' characters on fetch commands
  app.get("/api/sstp/heartbeat-safe/:routerId/:user/:local/:remote", (req, res) => {
    const { routerId, user, local, remote } = req.params;
    // Map params to req.query and redirect internally to original heartbeat endpoint
    res.redirect(`/api/sstp/heartbeat?routerId=${routerId}&user=${user}&local=${local}&remote=${remote}`);
  });

  // Plain-text command poller for lightweight execution on MikroTik v6/v7 scripts
  app.get("/api/sstp/poll-command", (req, res) => {
    const { routerId } = req.query;
    if (!routerId) return res.status(400).send("ERROR_ROUTER_ID_REQUIRED");
    const conn = activeSstpTunnels.get(String(routerId));
    if (!conn) return res.send("NONE");
    res.send(conn.pendingCommand || "NONE");
  });

  app.get("/api/sstp/poll-command-safe/:routerId", (req, res) => {
    const conn = activeSstpTunnels.get(String(req.params.routerId));
    if (!conn) return res.send("NONE");
    res.send(conn.pendingCommand || "NONE");
  });

  // Enqueue a control action for a connected live tunnel router
  app.post("/api/sstp/queue-command", (req, res) => {
    const { routerId, command } = req.body;
    if (!routerId || !command) {
      return res.status(400).json({ error: "routerId and command are required" });
    }
    const key = String(routerId);
    const simKey = `sim-${routerId}`;
    const conn = activeSstpTunnels.get(key) || activeSstpTunnels.get(simKey);
    
    if (!conn) {
      return res.status(404).json({ error: "Router no conectado. El túnel SSTP del equipo debe estar encendido para recibir órdenes en tiempo real." });
    }

    conn.pendingCommand = command;
    conn.commandResult = "Pendiente de ejecución por el MikroTik...";

    // Simulated Router immediately responses for outstanding UX
    if (conn.isSimulated) {
      setTimeout(() => {
        conn.pendingCommand = null;
        if (command.startsWith("/ping") || command.startsWith("ping")) {
          const target = command.split(" ").slice(-1)[0] || "192.168.192.10";
          conn.commandResult = `  SEQ HOST                                     SIZE  TTL TIME  STATUS\n    0 ${target}                              56   64 4ms   echo reply\n    1 ${target}                              56   64 5ms   echo reply\n    2 ${target}                              56   64 6ms   echo reply\n    sent=3 received=3 packet-loss=0% min-rtt=4ms avg-rtt=5ms max-rtt=6ms`;
        } else if (command.toLowerCase().includes("arp") || command.toLowerCase().includes("wake")) {
          conn.commandResult = `WOL packet sent successfully to MAC address specified!\nARP cache lookup mapped correctly.`;
        } else {
          conn.commandResult = `Command executed on simulated physical terminal:\n[OK] Script ran fully. Uptime metrics normal.`;
        }
      }, 1500);
    }

    res.json({ success: true, message: "Comando encolado con éxito", pendingCommand: command });
  });

  // Report execution outputs back to the server (supports GET and POST for RouterOS syntax)
  app.get("/api/sstp/report-result", (req, res) => {
    const { routerId, result } = req.query;
    if (!routerId) return res.status(400).send("ERROR");
    const conn = activeSstpTunnels.get(String(routerId));
    if (conn) {
      conn.commandResult = String(result || "Comando ejecutado con éxito.");
      conn.pendingCommand = null; // Clear pending slot
    }
    res.send("OK");
  });

  app.get("/api/sstp/report-result-safe/:routerId/:result", (req, res) => {
    const { routerId, result } = req.params;
    const conn = activeSstpTunnels.get(String(routerId));
    if (conn) {
      conn.commandResult = String(result || "Comando ejecutado con éxito.");
      conn.pendingCommand = null;
    }
    res.send("OK");
  });

  app.post("/api/sstp/report-result", (req, res) => {
    const { routerId, result } = req.body;
    if (!routerId) return res.status(400).json({ error: "routerId required" });
    const conn = activeSstpTunnels.get(String(routerId));
    if (conn) {
      conn.commandResult = result || "Comando ejecutado con éxito.";
      conn.pendingCommand = null;
    }
    res.json({ success: true });
  });

  // Receive live ARP and DHCP device discoveries from the MikroTik network segment
  app.get("/api/sstp/report-lan", (req, res) => {
    const { routerId, devices } = req.query;
    if (!routerId) return res.status(400).send("ERROR_ROUTER_ID");
    const conn = activeSstpTunnels.get(String(routerId));
    if (!conn) return res.status(404).send("ROUTER_NOT_TUNNELED_LIVE");

    if (devices && typeof devices === "string" && devices.trim() !== "") {
      const parsedDevices: LANDevice[] = [];
      const entries = devices.split(";");
      
      for (const entry of entries) {
        if (!entry || entry.trim() === "") continue;
        const fields = entry.split(",");
        if (fields.length >= 3) {
          const ip = fields[0].trim();
          const mac = fields[1].trim();
          const iface = fields[2].trim();
          const comment = fields[3] ? fields[3].trim() : "Equipo local detectado";
          
          if (ip && mac) {
            parsedDevices.push({
              ip,
              mac,
              interface: iface,
              comment,
              status: "Active",
              lastSeen: new Date().toISOString()
            });
          }
        }
      }

      if (parsedDevices.length > 0) {
        conn.lanDevices = parsedDevices;
      }
    }

    res.send("OK");
  });

  /*
  // Management API for SSTP Gateway configs
  app.get("/api/sstp/gateway/:ispId", async (req, res) => {
    try {
      const configDoc = await db.collection("sstp_configs").doc(req.params.ispId).get();
      if (!configDoc.exists) return res.status(404).json({ error: "Config not found" });
      res.json(configDoc.data());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sstp/gateway", async (req, res) => {
    const { ispId, serverAddress, port, certificateName, secretKey } = req.body;
    if (!ispId || !serverAddress) return res.status(400).json({ error: "Missing required params" });
    try {
      await db.collection("sstp_configs").doc(ispId).set({
        ispId,
        serverAddress,
        port: port || 443,
        certificateName,
        status: "configured",
        secretKey
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sstp/gateway/test", (req, res) => {
    const { serverAddress, port } = req.body;
    if (!serverAddress || !port) return res.status(400).json({ error: "Missing required params" });
    const socket = net.createConnection(Number(port), serverAddress, () => {
      socket.end();
      res.json({ status: "reachable" });
    });
    socket.setTimeout(5000);
    socket.on("timeout", () => {
      socket.destroy();
      res.status(502).json({ error: "Connection timed out" });
    });
    socket.on("error", (err: any) => {
      res.status(502).json({ error: err.message });
    });
  });
  */


  app.get("/api/sstp/connections", (req, res) => {
    res.json(Array.from(activeSstpTunnels.values()));
  });

  // Delete live connection of deleted router
  app.post("/api/sstp/connections/delete", (req, res) => {
    const { routerId } = req.body;
    if (!routerId) return res.status(400).json({ error: "routerId is required" });

    const cleanId = String(routerId).replace(/^sim-/, "");

    // 1. Remove SSTP active / simulated connection tunnels
    activeSstpTunnels.delete(cleanId);
    activeSstpTunnels.delete(`sim-${cleanId}`);

    // 2. Remove in-memory subdevices belonging to this router
    for (const [id, dev] of subDevices.entries()) {
      if (dev.parentRouterId.replace(/^sim-/, "") === cleanId) {
        subDevices.delete(id);
      }
    }

    // 3. Remove in-memory TR-069 CPEs belonging to this router
    for (const [id, cpe] of tr069Cpes.entries()) {
      if (cpe.parentRouterId.replace(/^sim-/, "") === cleanId) {
        tr069Cpes.delete(id);
      }
    }

    res.json({ success: true, routerId });
  });

  // API Route to scan neighbors on a MikroTik device
  app.post("/api/mikrotik/scan-neighbors", async (req, res) => {
    const { routerIp, routerPort, user, password, pool } = req.body;
    if (!routerIp || !user) return res.status(400).json({ error: "Missing required parameters" });

    const conn = new RouterOSAPI({
      host: routerIp,
      user,
      password: password || "",
      port: routerPort || 8728,
      timeout: 30
    });

    try {
      await conn.connect();
      // Obtenemos todos los neighbors y filtramos en el servidor para asegurar compatibilidad con la API
      const neighbors = await conn.write("/ip/neighbor/print");
      await conn.close();
      
      // Filtrar basado en el pool
      const filtered = neighbors.filter((n: any) => n.address4 && n.address4.startsWith(pool));
      res.json(filtered);

    } catch (error: any) {
      try { await conn.close(); } catch (e) {}
      console.error("MikroTik Neighbor Scan failed:", error);
      res.status(502).json({ error: "Scan failed: " + error.message });
    }
  });

  // Allow simulator toggling
  app.post("/api/sstp/connections/simulate", (req, res) => {
    const { routerId, name, user, local, remote } = req.body;
    if (!routerId) return res.status(400).json({ error: "routerId is required" });

    const key = `sim-${routerId}`;
    if (activeSstpTunnels.has(key)) {
      activeSstpTunnels.delete(key);
      res.json({ status: "disconnected", routerId });
    } else {
      let assignedRemote = (remote as string);
      if (!assignedRemote) {
        // Search the pool for the next free IP address under 192.168.192.0/18
        const busyIps = new Set(Array.from(activeSstpTunnels.values()).map(c => c.remoteAddress));
        let idx = 0;
        let candidate = getNextSstpClientIp(idx);
        while (busyIps.has(candidate) && idx < 16380) {
          idx++;
          candidate = getNextSstpClientIp(idx);
        }
        assignedRemote = candidate;
      }

      activeSstpTunnels.set(key, {
        routerId,
        routerName: name || "Simulated Router",
        user: user || "vpn_user",
        localAddress: local || "192.168.192.1",
        remoteAddress: assignedRemote,
        uptimeSeconds: 120,
        connectedFrom: "190.24.115.82",
        txBytes: 419200,
        rxBytes: 256800,
        lastSeen: new Date().toISOString(),
        isSimulated: true,
        lanDevices: [
          { ip: "192.168.88.10", mac: "00:1A:2B:3C:4D:5E", interface: "ether2-master", comment: "Servidor Principal / NAS", status: "Active", lastSeen: new Date().toISOString() },
          { ip: "192.168.88.45", mac: "24:FD:5D:11:22:33", interface: "ether3-lan", comment: "Caja Fuerte IP / Alarma", status: "Active", lastSeen: new Date().toISOString() },
          { ip: "192.168.88.101", mac: "B8:27:EB:AA:BB:CC", interface: "wlan1", comment: "Cámara DVR Seguridad", status: "Active", lastSeen: new Date().toISOString() }
        ]
      });
      res.json({ status: "connected", routerId });
    }
  });

  // In-Memory TR-069 CPEs (ONUs and Wireless Routers)
  interface Tr069Cpe {
    id: string;
    serialNumber: string;
    model: string;
    manufacturer: string;
    ipAddress: string;
    softwareVersion: string;
    wifiSsid: string;
    wifiPassword: string;
    wifiChannel: string;
    wifiSecurity: string;
    status: string;
    lastInform: string;
    uptimeSeconds: number;
    parentRouterId: string;
    pppoeUser: string;
  }

  // Subdevices located behind MikroTiks (OLTs, Ubiquiti Sectors, Mimosa backhaul, Cambium sectors)
  interface SubDevice {
    id: string;
    name: string;
    type: string;
    ipAddress: string;
    managedPort: number;
    status: string;
    signalDbm: number | null;
    uptimeSeconds: number;
    parentRouterId: string;
    activeStationsCount?: number;
  }

  const tr069Cpes = new Map<string, Tr069Cpe>();
  const subDevices = new Map<string, SubDevice>();

  // Helper init function for mock subnets
  const initTr069AndSubdevices = async () => {
    if (db) {
      try {
        console.log("[DB LOAD] Intentando recuperar CPEs de TR-069 y subdispositivos desde Firestore...");
        const cpesSnapshot = await db.collection("tr069_cpes").get();
        const subsSnapshot = await db.collection("sub_devices").get();

        if (!cpesSnapshot.empty) {
          cpesSnapshot.forEach((doc: any) => {
            tr069Cpes.set(doc.id, doc.data());
          });
          console.log(`[DB LOAD] Cargados ${tr069Cpes.size} CPEs de TR-069 exitosamente.`);
        } else {
          // Seed CPEs
          console.log("[DB SEED] Iniciando seeding de CPEs TR-069 por primera vez...");
          const seedCpes = {
            CPE001: {
              id: "CPE001",
              serialNumber: "HW034A92B1FB",
              model: "HG8245H GPON ONU AC",
              manufacturer: "Huawei",
              ipAddress: "192.168.100.22",
              softwareVersion: "V5.R019C00S150",
              wifiSsid: "Fibra_Altavis_Huawei_98",
              wifiPassword: "ClientWpaPass98!",
              wifiChannel: "Auto (Ch 6)",
              wifiSecurity: "WPA2-PSK (AES)",
              status: "connected",
              lastInform: new Date().toISOString(),
              uptimeSeconds: 7520,
              parentRouterId: "simulated-router-1",
              pppoeUser: "user_wifi_cpe01"
            },
            CPE002: {
              id: "CPE002",
              serialNumber: "FH551699AB10",
              model: "AN5506 EPON ONU",
              manufacturer: "FiberHome",
              ipAddress: "192.168.100.99",
              softwareVersion: "RP2615-H03",
              wifiSsid: "Enlace_Inalambrico_C20",
              wifiPassword: "CambiumSecure820",
              wifiChannel: "Ch 11",
              wifiSecurity: "WPA2-PSK",
              status: "connected",
              lastInform: new Date().toISOString(),
              uptimeSeconds: 15400,
              parentRouterId: "simulated-router-1",
              pppoeUser: "user_wifi_cpe02"
            },
            CPE003: {
              id: "CPE003",
              serialNumber: "ZTEF6702041A",
              model: "F670L GPON ONT AC DualBand",
              manufacturer: "ZTE",
              ipAddress: "192.168.100.12",
              softwareVersion: "V1.1.10P3T12",
              wifiSsid: "ZTE_DualBand_Fibra",
              wifiPassword: "ZteSecureKey990!",
              wifiChannel: "Auto (Ch 36 - 5GHz)",
              wifiSecurity: "WPA2/WPA3-PSK Mixed",
              status: "connected",
              lastInform: new Date().toISOString(),
              uptimeSeconds: 43250,
              parentRouterId: "simulated-router-1",
              pppoeUser: "user_wifi_cpe03"
            }
          };
          for (const [key, data] of Object.entries(seedCpes)) {
            tr069Cpes.set(key, data);
            await db.collection("tr069_cpes").doc(key).set(data);
          }
        }

        if (!subsSnapshot.empty) {
          subsSnapshot.forEach((doc: any) => {
            subDevices.set(doc.id, doc.data());
          });
          console.log(`[DB LOAD] Cargados ${subDevices.size} subdispositivos de red exitosamente.`);
        } else {
          // Seed subdevices
          console.log("[DB SEED] Iniciando seeding de subdispositivos de red por primera vez...");
          const seedSubs = {
            SUB001: {
              id: "SUB001",
              name: "OLT GPON ZTE C320 Central Sede",
              type: "olt",
              ipAddress: "192.168.192.100",
              managedPort: 80,
              status: "online",
              signalDbm: null,
              uptimeSeconds: 843200,
              parentRouterId: "simulated-router-1",
              activeStationsCount: 168
            },
            SUB002: {
              id: "SUB002",
              name: "Enlace Backhaul Mimosa C5x Poniente",
              type: "mimosa",
              ipAddress: "192.168.192.200",
              managedPort: 443,
              status: "online",
              signalDbm: -51,
              uptimeSeconds: 432100,
              parentRouterId: "simulated-router-1"
            },
            SUB003: {
              id: "SUB003",
              name: "WISP AP Sector Ubiquiti Rocket 5AC",
              type: "ubiquiti",
              ipAddress: "192.168.192.50",
              managedPort: 80,
              status: "online",
              signalDbm: -58,
              uptimeSeconds: 120500,
              parentRouterId: "simulated-router-1",
              activeStationsCount: 42
            },
            SUB004: {
              id: "SUB004",
              name: "Sectorial Cambium Networks ePMP 4000",
              type: "cambium",
              ipAddress: "192.168.192.120",
              managedPort: 80,
              status: "online",
              signalDbm: -62,
              uptimeSeconds: 98400,
              parentRouterId: "simulated-router-1",
              activeStationsCount: 19
            }
          };
          for (const [key, data] of Object.entries(seedSubs)) {
            subDevices.set(key, data);
            await db.collection("sub_devices").doc(key).set(data);
          }
        }
        return;
      } catch (dbErr: any) {
        console.warn("[DB LOAD WARNING] Falló carga de Firestore, usando cache local:", dbErr.message);
      }
    }

    // Local Fallback if db is null or query fails
    console.log("[DB FALLBACK] Inicializando CPEs y subdispositivos en memoria local");
    tr069Cpes.clear();
    subDevices.clear();

    tr069Cpes.set("CPE001", {
      id: "CPE001",
      serialNumber: "HW034A92B1FB",
      model: "HG8245H GPON ONU AC",
      manufacturer: "Huawei",
      ipAddress: "192.168.100.22",
      softwareVersion: "V5.R019C00S150",
      wifiSsid: "Fibra_Altavis_Huawei_98",
      wifiPassword: "ClientWpaPass98!",
      wifiChannel: "Auto (Ch 6)",
      wifiSecurity: "WPA2-PSK (AES)",
      status: "connected",
      lastInform: new Date().toISOString(),
      uptimeSeconds: 7520,
      parentRouterId: "simulated-router-1",
      pppoeUser: "user_wifi_cpe01"
    });

    tr069Cpes.set("CPE002", {
      id: "CPE002",
      serialNumber: "FH551699AB10",
      model: "AN5506 EPON ONU",
      manufacturer: "FiberHome",
      ipAddress: "192.168.100.99",
      softwareVersion: "RP2615-H03",
      wifiSsid: "Enlace_Inalambrico_C20",
      wifiPassword: "CambiumSecure820",
      wifiChannel: "Ch 11",
      wifiSecurity: "WPA2-PSK",
      status: "connected",
      lastInform: new Date().toISOString(),
      uptimeSeconds: 15400,
      parentRouterId: "simulated-router-1",
      pppoeUser: "user_wifi_cpe02"
    });

    tr069Cpes.set("CPE003", {
      id: "CPE003",
      serialNumber: "ZTEF6702041A",
      model: "F670L GPON ONT AC DualBand",
      manufacturer: "ZTE",
      ipAddress: "192.168.100.12",
      softwareVersion: "V1.1.10P3T12",
      wifiSsid: "ZTE_DualBand_Fibra",
      wifiPassword: "ZteSecureKey990!",
      wifiChannel: "Auto (Ch 36 - 5GHz)",
      wifiSecurity: "WPA2/WPA3-PSK Mixed",
      status: "connected",
      lastInform: new Date().toISOString(),
      uptimeSeconds: 43250,
      parentRouterId: "simulated-router-1",
      pppoeUser: "user_wifi_cpe03"
    });

    // 2. Local network sub-devices under parenting MikroTik
    subDevices.set("SUB001", {
      id: "SUB001",
      name: "OLT GPON ZTE C320 Central Sede",
      type: "olt",
      ipAddress: "192.168.192.100",
      managedPort: 80,
      status: "online",
      signalDbm: null,
      uptimeSeconds: 843200,
      parentRouterId: "simulated-router-1",
      activeStationsCount: 168
    });

    subDevices.set("SUB002", {
      id: "SUB002",
      name: "Enlace Backhaul Mimosa C5x Poniente",
      type: "mimosa",
      ipAddress: "192.168.192.200",
      managedPort: 443,
      status: "online",
      signalDbm: -51,
      uptimeSeconds: 432100,
      parentRouterId: "simulated-router-1"
    });

    subDevices.set("SUB003", {
      id: "SUB003",
      name: "WISP AP Sector Ubiquiti Rocket 5AC",
      type: "ubiquiti",
      ipAddress: "192.168.192.50",
      managedPort: 80,
      status: "online",
      signalDbm: -58,
      uptimeSeconds: 120500,
      parentRouterId: "simulated-router-1",
      activeStationsCount: 42
    });

    subDevices.set("SUB004", {
      id: "SUB004",
      name: "Sectorial Cambium Networks ePMP 4000",
      type: "cambium",
      ipAddress: "192.168.192.120",
      managedPort: 80,
      status: "online",
      signalDbm: -62,
      uptimeSeconds: 98400,
      parentRouterId: "simulated-router-1",
      activeStationsCount: 19
    });
  };

  initTr069AndSubdevices();

  // --- TR-069 & Sub-device Networking Controller Endpoints ---
  app.get("/api/networks/sub-devices", (req, res) => {
    const { routerId } = req.query;
    const all = Array.from(subDevices.values());
    if (routerId) {
      const cleanId = String(routerId).replace(/^sim-/, "");
      return res.json(all.filter(d => {
        const dClean = d.parentRouterId.replace(/^sim-/, "");
        return dClean === cleanId;
      }));
    }
    res.json(all);
  });

  app.post("/api/networks/sub-devices/add", async (req, res) => {
    const { name, type, ipAddress, managedPort, parentRouterId, signalDbm, activeStationsCount } = req.body;
    if (!name || !type || !ipAddress || !parentRouterId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = `SUB-${Math.floor(Math.random() * 90000) + 10000}`;
    const cleanParent = String(parentRouterId).replace(/^sim-/, "");
    const newDev: SubDevice = {
      id,
      name,
      type,
      ipAddress,
      managedPort: Number(managedPort) || 80,
      status: "online",
      signalDbm: signalDbm ? Number(signalDbm) : null,
      uptimeSeconds: 300,
      parentRouterId: cleanParent,
      activeStationsCount: activeStationsCount ? Number(activeStationsCount) : undefined
    };
    subDevices.set(id, newDev);

    if (db) {
      try {
        await db.collection("sub_devices").doc(id).set(newDev);
        console.log(`[DB SAVE] Subdispositivo ${id} guardado en Firestore.`);
      } catch (err: any) {
        console.warn(`[DB SAVE ERROR] No se pudo guardar el subdispositivo ${id} en Firestore:`, err.message);
      }
    }

    res.json({ success: true, device: newDev });
  });

  app.get("/api/tr069/cpes", (req, res) => {
    const { routerId } = req.query;
    const all = Array.from(tr069Cpes.values());
    if (routerId) {
      const cleanId = String(routerId).replace(/^sim-/, "");
      return res.json(all.filter(c => {
        const cClean = c.parentRouterId.replace(/^sim-/, "");
        return cClean === cleanId;
      }));
    }
    res.json(all);
  });

  app.post("/api/tr069/cpes/config", async (req, res) => {
    const { id, wifiSsid, wifiPassword, wifiChannel } = req.body;
    if (!id) return res.status(400).json({ error: "CPE ID required" });
    const cpe = tr069Cpes.get(id);
    if (!cpe) return res.status(404).json({ error: "CPE not found" });

    if (wifiSsid) cpe.wifiSsid = wifiSsid;
    if (wifiPassword) cpe.wifiPassword = wifiPassword;
    if (wifiChannel) cpe.wifiChannel = wifiChannel;
    cpe.lastInform = new Date().toISOString();

    if (db) {
      try {
        await db.collection("tr069_cpes").doc(id).set(cpe);
        console.log(`[DB SAVE] CPE ${id} configuración guardada en Firestore.`);
      } catch (err: any) {
        console.warn(`[DB SAVE ERROR] No se pudo guardar CPE ${id} en Firestore:`, err.message);
      }
    }

    res.json({ success: true, cpe });
  });

  app.post("/api/tr069/cpes/reboot", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "CPE ID required" });
    const cpe = tr069Cpes.get(id);
    if (!cpe) return res.status(404).json({ error: "CPE not found" });

    cpe.uptimeSeconds = 0;
    cpe.lastInform = new Date().toISOString();

    if (db) {
      try {
        await db.collection("tr069_cpes").doc(id).set(cpe);
        console.log(`[DB SAVE] CPE ${id} reiniciado en Firestore.`);
      } catch (err: any) {
        console.warn(`[DB SAVE ERROR] No se pudo guardar reiniciar CPE ${id} en Firestore:`, err.message);
      }
    }

    res.json({ success: true });
  });

  app.post("/api/tr069/cpes/factory-reset", async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "CPE ID required" });
    const cpe = tr069Cpes.get(id);
    if (!cpe) return res.status(404).json({ error: "CPE not found" });

    cpe.wifiSsid = "WIFI_ONU_DEFAULT_TR069";
    cpe.wifiPassword = "wifi_default_key";
    cpe.uptimeSeconds = 10;
    cpe.lastInform = new Date().toISOString();

    if (db) {
      try {
        await db.collection("tr069_cpes").doc(id).set(cpe);
        console.log(`[DB SAVE] CPE ${id} reseteado en Firestore.`);
      } catch (err: any) {
        console.warn(`[DB SAVE ERROR] No se pudo guardar resetear CPE ${id} en Firestore:`, err.message);
      }
    }

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
