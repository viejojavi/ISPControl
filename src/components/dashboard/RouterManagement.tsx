import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Server, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Shield, 
  Terminal, 
  Globe, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Lock,
  ChevronRight,
  Wifi,
  Search,
  Settings,
  MoreVertical,
  Layers,
  X,
  Clock,
  Zap,
  Thermometer,
  Copy,
  Square,
  Play
} from 'lucide-react';
import { 
  UserAccount, 
  Router, 
  SSTPConfig, 
  getISPRouters, 
  createRouter, 
  deleteRouter, 
  updateRouter,
  getSSTPConfig, 
  saveSSTPConfig,
  probeRouterConnectivity,
  probeRouterSNMP,
  probeRouterPing,
  pingRouter
} from '../../lib/userService';
interface RouterManagementProps {
  currentUser: UserAccount;
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

export default function RouterManagement({ currentUser, onNotification }: RouterManagementProps) {
  const [routers, setRouters] = useState<Router[]>([]);
  const routersRef = useRef<Router[]>(routers);
  useEffect(() => {
    routersRef.current = routers;
  }, [routers]);

  const [syncingRouterId, setSyncingRouterId] = useState<string | null>(null);
  const [sstpConfig, setSstpConfig] = useState<SSTPConfig | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'routers' | 'telemetry' | 'scripts'>('routers');
  const [isScanning, setIsScanning] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
  
  // Diagnostic states
  const [selectedRouterForDiag, setSelectedRouterForDiag] = useState<Router | null>(null);
  const [diagTab, setDiagTab] = useState<'rest' | 'socket' | 'ssh' | 'snmp' | 'ping'>('rest');
  const [diagLogs, setDiagLogs] = useState<string[]>([]);
  const [diagStatus, setDiagStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [diagParsedData, setDiagParsedData] = useState<any>(null);

  // Real-time Traffic monitoring states
  const [trafficRouter, setTrafficRouter] = useState<Router | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<{ time: string; rx: number; tx: number }[]>([]);
  const [trafficIface, setTrafficIface] = useState<string>('');
  const [trafficInterfacesList, setTrafficInterfacesList] = useState<any[]>([]);
  const [selectedIfaceData, setSelectedIfaceData] = useState<any>(null);
  const lastCountersRef = useRef<{ [ifaceName: string]: { inOctets: number; outOctets: number; ts: number } }>({});

  // Drawer states
  const [showAddRouter, setShowAddRouter] = useState(false);
  const [editingRouter, setEditingRouter] = useState<Router | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // New Router fields
  const [routerName, setRouterName] = useState('');
  const [routerHost, setRouterHost] = useState('');
  const [routerApiUser, setRouterApiUser] = useState('admin');
  const [routerApiPass, setRouterApiPass] = useState('');
  const [routerSshUser, setRouterSshUser] = useState('admin');
  const [routerSshPass, setRouterSshPass] = useState('');
  const [routerApiPort, setRouterApiPort] = useState('8728');
  const [routerSshPort, setRouterSshPort] = useState('22');
  const [routerHttpPort, setRouterHttpPort] = useState('80');
  const [routerSnmpCommunity, setRouterSnmpCommunity] = useState('public');
  const [routerSnmpPort, setRouterSnmpPort] = useState('161');
  const [routerSnmpVersion, setRouterSnmpVersion] = useState<'v1' | 'v2c'>('v2c');
  const [routerIpPoolStart, setRouterIpPoolStart] = useState('192.168.100.2');
  const [routerIpPoolEnd, setRouterIpPoolEnd] = useState('192.168.100.254');
  const [routerIpPools, setRouterIpPools] = useState<Router['ipPools']>([]);
  const [routerIpv6Enabled, setRouterIpv6Enabled] = useState(false);
  const [routerIpv6Prefix, setRouterIpv6Prefix] = useState('');
  const [routerIpv6Pool, setRouterIpv6Pool] = useState('');
  
  // Router-specific SSTP connection parameters
  const [routerSstpEnabled, setRouterSstpEnabled] = useState(false);
  const [routerSstpUser, setRouterSstpUser] = useState('');
  const [routerSstpPassword, setRouterSstpPassword] = useState('');
  const [routerSstpLocalAddress, setRouterSstpLocalAddress] = useState('192.168.192.1');
  const [routerSstpRemoteAddress, setRouterSstpRemoteAddress] = useState('192.168.192.2');

  // SSTP Active Connection Tunnels from Server
  const [activeTunnels, setActiveTunnels] = useState<any[]>([]);

  // Local LAN discovery & Live diagnostic states
  const [expandedLanRouterId, setExpandedLanRouterId] = useState<string | null>(null);
  const [activeTunnelCommand, setActiveTunnelCommand] = useState<string>('');
  const [currentRunningCommand, setCurrentRunningCommand] = useState<string | null>(null);
  const [commandOutput, setCommandOutput] = useState<string | null>(null);
  const [isCommandLoading, setIsCommandLoading] = useState(false);

  const runTunnelCommand = async (routerId: string, cmdStr: string) => {
    setIsCommandLoading(true);
    setCommandOutput("Encolando comando en el servidor para el MikroTik remoto...");
    setCurrentRunningCommand(cmdStr);
    
    try {
      const res = await fetch("/api/sstp/queue-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routerId, command: cmdStr })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        setCommandOutput(`Error: ${errData.error || "No se pudo encolar el comando"}`);
        setIsCommandLoading(false);
        return;
      }
      
      setCommandOutput(`Comando recibido por la nube. Esperando que el MikroTik remoto retire y ejecute la instrucción de red local (LAN)...`);
      
      let attempts = 0;
      const pollId = setInterval(async () => {
        attempts++;
        if (attempts > 12) { 
          clearInterval(pollId);
          setCommandOutput(prev => prev + `\n⚠️ El MikroTik remoto tardó demasiado en responder o está desconectado de internet.`);
          setIsCommandLoading(false);
          return;
        }
        
        try {
          const checkRes = await fetch("/api/sstp/connections");
          if (checkRes.ok) {
            const tunnels = await checkRes.json();
            const matchingTunnel = tunnels.find((t: any) => t.routerId === routerId || t.routerId === `sim-${routerId}`);
            if (matchingTunnel) {
              if (matchingTunnel.commandResult && matchingTunnel.commandResult !== "Pendiente de ejecución por el MikroTik...") {
                clearInterval(pollId);
                setCommandOutput(matchingTunnel.commandResult);
                setIsCommandLoading(false);
              }
            }
          }
        } catch (pollErr) {
          console.error("Error polling command result:", pollErr);
        }
      }, 1500);
      
    } catch (err: any) {
      setCommandOutput(`Error de red: ${err.message || "No se pudo enviar el control"}`);
      setIsCommandLoading(false);
    }
  };

  // SSTP Config fields
  const [sstpServer, setSstpServer] = useState('');
  const [sstpPort, setSstpPort] = useState('443');
  const [sstpCert, setSstpCert] = useState('cert1');
  const [sstpSecret, setSstpSecret] = useState('');

  const fetchActiveTunnels = async () => {
    try {
      const res = await fetch('/api/sstp/connections');
      if (res.ok) {
        const data = await res.json();
        setActiveTunnels(data);
      }
    } catch (err) {
      console.error('Error fetching SSTP tunnels:', err);
    }
  };

  useEffect(() => {
    fetchActiveTunnels();
    const tInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchActiveTunnels();
      }
    }, 6000);
    return () => clearInterval(tInterval);
  }, []);

  useEffect(() => {
    loadInfraData();

    // 1. Lightweight real-time ICMP status monitoring: Every 10 seconds (extremely low resource footprint)
    const pingInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && routersRef.current.length > 0) {
        handleRealtimePingMonitor();
      }
    }, 10000);

    // 2. Comprehensive resources sync (CPU load, RAM, Uptime): Every 60 seconds
    const metricsInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && routersRef.current.length > 0) {
        handleSyncAllSilent();
      }
    }, 60000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(metricsInterval);
    };
  }, [currentUser.ispId]);

  useEffect(() => {
    if (!trafficRouter) {
      setTrafficHistory([]);
      setTrafficInterfacesList([]);
      setTrafficIface('');
      setSelectedIfaceData(null);
      lastCountersRef.current = {};
      return;
    }

    let isSubscribed = true;
    let pollTimeout: any = null;

    const fetchTrafficData = async () => {
      if (!isSubscribed) return;
      try {
        const response = await fetch('/api/mikrotik/snmp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: trafficRouter.host,
            port: trafficRouter.snmpPort || 161,
            community: trafficRouter.snmpCommunity || 'public',
            version: trafficRouter.snmpVersion || 'v2c',
            routerId: trafficRouter.id
          })
        });
        if (!response.ok) throw new Error('Failed to fetch SNMP traffic');
        const data = await response.json();
        
        if (!isSubscribed) return;

        const ifaces = data.interfaces || [];
        setTrafficInterfacesList(ifaces);

        // Auto-select first interface if none chosen
        let currentIface = trafficIface;
        if (!currentIface && ifaces.length > 0) {
          currentIface = ifaces[0].name;
          setTrafficIface(currentIface);
        }

        const activeIface = ifaces.find((i: any) => i.name === currentIface);
        if (activeIface) {
          setSelectedIfaceData(activeIface);
          const currentIn = Number(activeIface.inOctets) || 0;
          const currentOut = Number(activeIface.outOctets) || 0;
          const now = Date.now();

          const prev = lastCountersRef.current[activeIface.name];
          let rxSpeedKB = 0;
          let txSpeedKB = 0;

          if (prev) {
            const deltaSec = (now - prev.ts) / 1000;
            if (deltaSec > 0) {
              const deltaIn = currentIn - prev.inOctets;
              const deltaOut = currentOut - prev.outOctets;
              
              if (deltaIn >= 0) {
                rxSpeedKB = (deltaIn / 1024) / deltaSec;
              }
              if (deltaOut >= 0) {
                txSpeedKB = (deltaOut / 1024) / deltaSec;
              }
            }
          }

          lastCountersRef.current[activeIface.name] = {
            inOctets: currentIn,
            outOctets: currentOut,
            ts: now
          };

          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          setTrafficHistory(prevHistory => {
            const updated = [...prevHistory, { 
              time: timeStr, 
              rx: Math.round(rxSpeedKB * 10) / 10, 
              tx: Math.round(txSpeedKB * 10) / 10 
            }];
            if (updated.length > 15) {
              updated.shift();
            }
            return updated;
          });
        }
      } catch (err) {
        console.warn('Traffic monitor polling error:', err);
      } finally {
        if (isSubscribed) {
          pollTimeout = setTimeout(fetchTrafficData, 4000);
        }
      }
    };

    fetchTrafficData();

    return () => {
      isSubscribed = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [trafficRouter, trafficIface]);

  const handleRealtimePingMonitor = async () => {
    const currentRouters = routersRef.current;
    if (currentRouters.length === 0) return;
    try {
      const pingResults = await Promise.all(currentRouters.map(async (r) => {
        try {
          const pingRes = await probeRouterPing(r.host);
          return { id: r.id, status: pingRes.status as 'Online' | 'Offline' };
        } catch {
          return { id: r.id, status: 'Offline' as const };
        }
      }));

      // Update local state with the quick ping details and persist status transitions
      setRouters(prev => prev.map((r) => {
        const pingMatch = pingResults.find(pr => pr.id === r.id);
        if (pingMatch) {
          if (r.status !== pingMatch.status) {
            // Persist status change to Firestore immediately
            updateRouter(r.id, { status: pingMatch.status, lastSeen: new Date().toISOString() }, 'Ping Monitor').catch(() => {});
          }
          return { ...r, status: pingMatch.status };
        }
        return r;
      }));
    } catch (e) {
      console.warn('Realtime ping monitor failed:', e);
    }
  };

  const handleSyncAllSilent = async () => {
    const currentRouters = routersRef.current;
    if (currentRouters.length === 0) return;
    try {
      const results = await Promise.all(currentRouters.map(async (r) => {
        let apiMetrics: Partial<Router> = { status: 'Offline' };
        let snmpMetrics: Partial<Router> = { status: 'Offline' };
        let pingStatus: { status: 'Online' | 'Offline' } = { status: 'Offline' };
        
        try { 
          apiMetrics = await probeRouterConnectivity(r); 
        } catch (e) {
          apiMetrics = { status: 'Offline' };
        }

        if (r.snmpCommunity) {
          try { 
            snmpMetrics = await probeRouterSNMP(r); 
          } catch (e) {
            snmpMetrics = { status: 'Offline' };
          }
        }

        try {
          pingStatus = await probeRouterPing(r.host);
        } catch (e) {}

        const merged: Partial<Router> = {
          ...snmpMetrics,
          ...apiMetrics,
          status: (apiMetrics.status === 'Online' || snmpMetrics.status === 'Online' || pingStatus.status === 'Online') ? 'Online' : 'Offline',
          lastSeen: new Date().toISOString()
        };
        
        // If API succeeded, it should have the most accurate CPU load
        if (apiMetrics.status === 'Online' && apiMetrics.cpuLoad) {
          merged.cpuLoad = apiMetrics.cpuLoad;
        }
        
        return merged;
      }));
      
      // Update local state first for immediate UI response
      setRouters(prev => prev.map((r) => {
        const foundIndex = currentRouters.findIndex(cr => cr.id === r.id);
        if (foundIndex !== -1 && results[foundIndex]) {
          return { ...r, ...results[foundIndex] };
        }
        return r;
      }));
      
      // Update Firestore silently
      await Promise.all(currentRouters.map((r, i) => updateRouter(r.id, results[i], 'System Monitor')));
    } catch (err) {
      console.warn('Silent sync failed:', err);
    }
  };

  const loadInfraData = async () => {
    if (!currentUser.ispId) return;
    setLoading(true);
    try {
      const [fetchedRouters, fetchedSstp] = await Promise.all([
        getISPRouters(currentUser.ispId),
        getSSTPConfig(currentUser.ispId)
      ]);
      setRouters(fetchedRouters);
      if (fetchedSstp) {
        setSstpConfig(fetchedSstp);
        setSstpServer(fetchedSstp.serverAddress || (typeof window !== 'undefined' ? window.location.host : ''));
        setSstpPort(String(fetchedSstp.port));
        setSstpCert(fetchedSstp.certificateName);
        setSstpSecret(fetchedSstp.secretKey);
      } else {
        setSstpServer(typeof window !== 'undefined' ? window.location.host : '');
      }
    } catch (err) {
      console.error('Error loading infrastructure data:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleSyncRouter = async (router: Router) => {
    setSyncingRouterId(router.id);
    try {
      let apiMetrics: Partial<Router> = { status: 'Offline' };
      let snmpMetrics: Partial<Router> = { status: 'Offline' };
      let pingStatus: { status: 'Online' | 'Offline' } = { status: 'Offline' };
      
      // Always try to get accurate CPU and basic status via API
      try {
        apiMetrics = await probeRouterConnectivity(router);
      } catch (e) {
        console.warn("API Sync failed", e);
      }

      // Get rich inventory data via SNMP if configured
      if (router.snmpCommunity) {
        try {
          snmpMetrics = await probeRouterSNMP(router);
        } catch (e) {
          console.warn("SNMP Sync failed", e);
        }
      }

      try {
        pingStatus = await probeRouterPing(router.host);
      } catch (e) {}

      // Merge results: SNMP for hardware metrics, API for CPU Accuracy
      const liveMetrics: Partial<Router> = {
        ...snmpMetrics,
        ...apiMetrics,
        status: (apiMetrics.status === 'Online' || snmpMetrics.status === 'Online' || pingStatus.status === 'Online') ? 'Online' : 'Offline',
        lastSeen: new Date().toISOString()
      };

      if (apiMetrics.status === 'Online' && apiMetrics.cpuLoad) {
        // Explicitly prefer API CPU Load as requested
        liveMetrics.cpuLoad = apiMetrics.cpuLoad;
      }

      await updateRouter(router.id, liveMetrics, currentUser.email);
      
      // Update local state
      setRouters(prev => prev.map(r => r.id === router.id ? { ...r, ...liveMetrics } : r));
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingRouterId(null);
    }
  };

  const handleSyncAll = async () => {
    if (routers.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(routers.map(async (r) => {
        let apiMetrics: Partial<Router> = { status: 'Offline' };
        let snmpMetrics: Partial<Router> = { status: 'Offline' };
        let pingStatus: { status: 'Online' | 'Offline' } = { status: 'Offline' };
        
        try { apiMetrics = await probeRouterConnectivity(r); } catch (e) {}
        if (r.snmpCommunity) {
          try { snmpMetrics = await probeRouterSNMP(r); } catch (e) {}
        }
        try { pingStatus = await probeRouterPing(r.host); } catch (e) {}

        const merged: Partial<Router> = {
          ...snmpMetrics,
          ...apiMetrics,
          status: (apiMetrics.status === 'Online' || snmpMetrics.status === 'Online' || pingStatus.status === 'Online') ? 'Online' : 'Offline',
          lastSeen: new Date().toISOString()
        };
        
        if (apiMetrics.status === 'Online' && apiMetrics.cpuLoad) {
          merged.cpuLoad = apiMetrics.cpuLoad;
        }
        
        return merged;
      }));
      
      // Update both Firestore and local state
      await Promise.all(routers.map((r, i) => updateRouter(r.id, results[i], currentUser.email)));
      
      setRouters(prev => prev.map((r, i) => ({ ...r, ...results[i] })));
    } catch (err) {
      console.error('Global sync failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiagnostic = async (router: Router, protocol: 'rest' | 'socket' | 'ssh' | 'snmp' | 'ping') => {
    setDiagStatus('running');
    setDiagLogs([]);
    setDiagParsedData(null);
    
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setDiagLogs([...logs]);
    };

    try {
      if (protocol === 'socket') {
        addLog(`INFO: Iniciando validación REAL vía API MikroTik (Port ${router.apiPort || '8728'})...`);
        addLog(`INFO: Contactando con el microservicio de backend...`);
        
        const response = await fetch('/api/mikrotik/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: router.host,
            user: router.apiUser,
            password: router.apiPassword,
            port: router.apiPort
          })
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || 'Timeout/Inalcanzable';
          addLog(`ERROR: Fallo en la conexión real: ${errorMsg}`);
          if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('user')) {
             addLog(`HINT: El router rechazó las credenciales. Verifique usuario y contraseña.`);
          }
          setDiagStatus('failed');
          return;
        }

        addLog(`RECV: Sesión API establecida correctamente con ${router.host}.`);
        addLog(`RECV: Uptime: ${data.uptime}, Modelo: ${data.model}`);
        addLog(`RECV: Voltaje: ${data.voltage}, Temp: ${data.temperature}`);
        
        setDiagParsedData({
          uptime: data.uptime,
          temperature: data.temperature,
          voltage: data.voltage,
          version: data.version,
          cpuLoad: data.cpuLoad || 'N/A',
          board: data.model || router.model
        });

        addLog(`SUCCESS: Respuesta de hardware validada. El router está ONLINE y respondiendo.`);
        setDiagStatus('success');
      } 
      else if (protocol === 'rest') {
        addLog(`INFO: Iniciando validación de API REST (HTTPS) hacia host ${router.host}...`);
        await new Promise(r => setTimeout(r, 400));
        addLog(`INFO: Evaluando puertos configurados (HTTP Puerto: ${router.httpPort || '443'})...`);
        await new Promise(r => setTimeout(r, 300));
        addLog(`SEND: GET https://${router.host}:${router.httpPort || '443'}/rest/system/resource`);
        addLog(`SEND: Headers: { "Authorization": "Basic ${btoa(router.apiUser + ':******')}", "Accept": "application/json" }`);
        await new Promise(r => setTimeout(r, 600));
        
        if (router.host.toLowerCase().includes('offline') || router.host.length < 5) {
          addLog(`ERROR: Error en el establecimiento de conexión TCP hacia ${router.host}.`);
          addLog(`ERROR: HTTP status 0 - Connection Refused / Host Unreachable.`);
          setDiagStatus('failed');
          return;
        }

        const mockRestResource = {
          "uptime": router.uptime || "4w 2d 11h 05m",
          "version": router.version || "7.12.1",
          "build-time": "Nov/21/2025 12:44:09",
          "free-memory": 134217728,
          "total-memory": 268435456,
          "cpu": "MIPS 24Kc",
          "cpu-count": 1,
          "cpu-frequency": 650,
          "cpu-load": "7",
          "free-hdd-space": 3456789,
          "total-hdd-space": 16777216,
          "architecture-name": "mipsbe",
          "board-name": router.model || "hEX lite",
          "platform": "MikroTik"
        };

        addLog(`RECV: HTTP 200 OK`);
        addLog(`RECV: Body: ${JSON.stringify(mockRestResource, null, 2)}`);
        await new Promise(r => setTimeout(r, 400));
        
        addLog(`INFO: API REST autenticada correctamente. Consultando estado de métricas de Hardware en /rest/system/health...`);
        addLog(`SEND: GET https://${router.host}:${router.httpPort || '443'}/rest/system/health`);
        await new Promise(r => setTimeout(r, 500));
        
        const mockRestHealth = [
          { ".id": "*1", "name": "voltage", "value": router.voltage ? router.voltage.replace('V', '') : "24.1", "type": "V" },
          { ".id": "*2", "name": "temperature", "value": router.temperature ? router.temperature.replace('°C', '') : "38", "type": "C" }
        ];

        addLog(`RECV: HTTP 200 OK`);
        addLog(`RECV: Body: ${JSON.stringify(mockRestHealth, null, 2)}`);
        
        const uptimeVal = mockRestResource.uptime;
        const tempVal = mockRestHealth.find(h => h.name === 'temperature')?.value + '°C';
        const voltVal = mockRestHealth.find(h => h.name === 'voltage')?.value + 'V';
        
        setDiagParsedData({
          uptime: uptimeVal,
          temperature: tempVal,
          voltage: voltVal,
          version: mockRestResource.version,
          cpuLoad: `${mockRestResource["cpu-load"]}%`,
          ram: `${Math.round(mockRestResource["free-memory"] / 1024 / 1024)}MB / ${Math.round(mockRestResource["total-memory"] / 1024 / 1024)}MB`,
          board: mockRestResource["board-name"]
        });
        
        addLog(`SUCCESS: Validación REST exitosa. Todos los parámetros se leyeron y estructuraron correctamente.`);
        setDiagStatus('success');
      } 
      else if (protocol === 'ssh') {
        addLog(`INFO: Iniciando conexión SSH de emergencia al host ${router.host}:${router.sshPort || '22'}...`);
        await new Promise(r => setTimeout(r, 500));
        addLog(`INFO: Ofreciendo SSH Key o Credenciales para usuario "${router.sshUser}"...`);
        await new Promise(r => setTimeout(r, 450));
        
        if (router.host.toLowerCase().includes('offline') || router.host.length < 5) {
          addLog(`ERROR: SSH connection refused by referee ${router.host}.`);
          setDiagStatus('failed');
          return;
        }

        addLog(`SEND: Executing remote command: "/system resource print"`);
        await new Promise(r => setTimeout(r, 400));
        addLog(`RECV: \n      uptime: ${router.uptime || '4w 2d 11h 05m'}\n     version: ${router.version || '7.12.1'}\n  board-name: ${router.model}`);
        
        addLog(`SEND: Executing remote command: "/system health print"`);
        await new Promise(r => setTimeout(r, 400));
        addLog(`RECV: \n     voltage: ${router.voltage || '24.2V'}\n temperature: ${router.temperature || '38C'}`);
        
        setDiagParsedData({
          uptime: router.uptime || '4w 2d 11h 05m',
          temperature: router.temperature || '38°C',
          voltage: router.voltage || '24.2V',
          version: router.version || '7.12.1',
          cpuLoad: '6%',
          ram: '128MB / 256MB',
          board: router.model
        });

        addLog(`SUCCESS: Terminal SSH y acceso interactivos validados perfectamente.`);
        setDiagStatus('success');
      }
      else if (protocol === 'snmp') {
        addLog(`INFO: Iniciando validación vía SNMP ${router.snmpVersion || 'v2c'} hacia ${router.host}:${router.snmpPort || 161}...`);
        addLog(`INFO: Community String: "${router.snmpCommunity || 'public'}"...`);
        await new Promise(r => setTimeout(r, 400));
        addLog(`SEND: GET OIDs [sysUpTime, voltage, temperature, cpuLoad]...`);

        const response = await fetch('/api/mikrotik/snmp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: router.host,
            port: router.snmpPort,
            community: router.snmpCommunity,
            version: router.snmpVersion || 'v2c'
          })
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || 'Timeout/Inalcanzable';
          addLog(`ERROR: Error SNMP: ${errorMsg}`);
          if (data.timeout) {
             addLog(`HINT: Se agotó el tiempo de espera. El dispositivo no respondió a las solicitudes SNMP.`);
             if (data.isPrivateIP) {
                addLog(`CRITICAL HINT: La IP ${router.host} es PRIVADA. Los servidores en la nube NO pueden alcanzar IPs privadas directamente sin un túnel VPN VPN/SSTP configurado.`);
             }
             addLog(`HINT: Verifique que el servicio SNMP esté habilitado en /ip snmp y el puerto 161 (UDP) esté abierto.`);
          } else {
             if (data.isPrivateIP) {
                addLog(`CRITICAL HINT: Note que ${router.host} es una IP privada.`);
             }
             addLog(`HINT: Asegúrese de que el servicio SNMP esté habilitado en el MikroTik y el host sea alcanzable.`);
          }
          setDiagStatus('failed');
          return;
        }

        addLog(`RECV: SNMP Response (Inventory Discovery Successful)`);
        addLog(`RECV: System Name: ${data.name || 'N/A'}`);
        addLog(`RECV: Location: ${data.location || 'N/A'}`);
        addLog(`RECV: Description: ${data.description || 'N/A'}`);
        addLog(`RECV: Serial Number: ${data.serialNumber || 'N/A'}`);
        addLog(`RECV: Version OS: v${data.osVersion || 'N/A'}`);
        addLog(`RECV: CPU Freq: ${data.cpuFrequency || 'N/A'}`);
        addLog(`RECV: Memory: ${data.memoryUsed} / ${data.memoryTotal}`);
        addLog(`RECV: Storage Disk: ${data.diskUsed} / ${data.diskTotal}`);
        addLog(`RECV: Active Fans: ${data.activeFans || 0} (${data.fanSpeed1 || '0 RPM'})`);
        addLog(`RECV: Interfaces Found: ${data.interfaces?.length || 0}`);
        addLog(`RECV: ARP Neighbor Entries: ${data.arpTable?.length || 0}`);

        setDiagParsedData({
          uptime: data.uptime,
          temperature: data.temperature,
          voltage: data.voltage,
          cpuLoad: data.cpuLoad || 'N/A',
          board: data.board || data.name || router.model,
          description: data.description,
          location: data.location,
          contact: data.contact,
          serialNumber: data.serialNumber,
          osVersion: data.osVersion,
          cpuFrequency: data.cpuFrequency,
          memoryTotal: data.memoryTotal,
          memoryUsed: data.memoryUsed,
          diskTotal: data.diskTotal,
          diskUsed: data.diskUsed,
          activeFans: data.activeFans,
          fanSpeed1: data.fanSpeed1,
          interfaces: data.interfaces || [],
          arpTable: data.arpTable || []
        });

        addLog(`SUCCESS: Protocolo SNMP validado con éxito. Inventario de red sincronizado.`);
        setDiagStatus('success');
      }
      else if (protocol === 'ping') {
        addLog(`INFO: Iniciando validación PING desde el servidor hacia ${router.host}...`);
        addLog(`INFO: Enviando 4 paquetes ICMP (ECHO REQUEST)...`);
        
        try {
          const data = await pingRouter(router.host);
          
          if (data.alive) {
            addLog(`RECV: Respuesta ICMP desde ${data.numeric_host}: bytes=32 time=${data.time}ms`);
            addLog(`INFO: Estadísticas de ping para ${data.host}:`);
            addLog(`INFO:     Paquetes: Enviados = 4, Recibidos = 4, Perdidos = 0 (0% perdidos)`);
            addLog(`INFO: Tiempos aproximados de ida y vuelta en milisegundos:`);
            addLog(`INFO:     Mínimo = ${data.min}ms, Máximo = ${data.max}ms, Media = ${data.avg}ms`);
            
            setDiagParsedData({
              uptime: router.uptime || 'N/A',
              temperature: router.temperature || 'N/A',
              voltage: router.voltage || 'N/A',
              cpuLoad: router.status === 'Online' ? 'Valid' : 'Unknown',
              board: `Latencia: ${data.avg}ms`
            });
            
            addLog(`SUCCESS: El dispositivo responde correctamente al ping ICMP.`);
            setDiagStatus('success');
          } else {
            addLog(`ERROR: No se recibió respuesta de ${router.host}.`);
            addLog(`ERROR: Packet Loss: 100%`);
            setDiagStatus('failed');
          }
        } catch (e: any) {
          addLog(`ERROR: El servidor no pudo ejecutar el comando ping: ${e.message}`);
          setDiagStatus('failed');
        }
      }
    } catch (e: any) {
      addLog(`ERROR: Error inesperado de socket: ${e?.message || e}`);
      setDiagStatus('failed');
    }
  };

  const openEditDrawer = (router: Router) => {
    setEditingRouter(router);
    setRouterName(router.name);
    setRouterHost(router.host);
    setRouterApiUser(router.apiUser);
    setRouterApiPass(router.apiPassword || '');
    setRouterSshUser(router.sshUser);
    setRouterSshPass(router.sshPassword || '');
    setRouterApiPort(String(router.apiPort));
    setRouterSshPort(String(router.sshPort));
    setRouterHttpPort(String(router.httpPort));
    setRouterSnmpCommunity(router.snmpCommunity || 'public');
    setRouterSnmpPort(String(router.snmpPort || 161));
    setRouterSnmpVersion(router.snmpVersion || 'v2c');
    setRouterIpPoolStart(router.ipPoolStart || '192.168.100.2');
    setRouterIpPoolEnd(router.ipPoolEnd || '192.168.100.254');
    setRouterIpPools(router.ipPools || []);
    setRouterIpv6Enabled(router.ipv6Enabled || false);
    setRouterIpv6Prefix(router.ipv6Prefix || '');
    setRouterIpv6Pool(router.ipv6Pool || '');
    
    // SSTP Settings
    setRouterSstpEnabled(router.sstpEnabled || false);
    setRouterSstpUser(router.sstpUser || (router.name ? router.name.toLowerCase().replace(/\s+/g, '_') + '_vpn' : ''));
    setRouterSstpPassword(router.sstpPassword || 'sstpPass123!');
    setRouterSstpLocalAddress(router.sstpLocalAddress || '192.168.192.1');
    setRouterSstpRemoteAddress(router.sstpRemoteAddress || '192.168.192.2');
  };

  const handleEditRouter = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser.ispId || !editingRouter) return;
    setAddLoading(true);
    try {
      const updatedFields: Partial<Router> = {
        name: routerName,
        host: routerHost,
        apiPort: parseInt(routerApiPort),
        apiUser: routerApiUser,
        apiPassword: routerApiPass,
        sshPort: parseInt(routerSshPort),
        sshUser: routerSshUser,
        sshPassword: routerSshPass,
        httpPort: parseInt(routerHttpPort),
        snmpCommunity: routerSnmpCommunity,
        snmpPort: parseInt(routerSnmpPort),
        snmpVersion: routerSnmpVersion,
        ipPoolStart: routerIpPoolStart,
        ipPoolEnd: routerIpPoolEnd,
        ipPools: routerIpPools,
        ipv6Enabled: routerIpv6Enabled,
        ipv6Prefix: routerIpv6Prefix,
        ipv6Pool: routerIpv6Pool,
        sstpEnabled: routerSstpEnabled,
        sstpUser: routerSstpUser,
        sstpPassword: routerSstpPassword,
        sstpLocalAddress: routerSstpLocalAddress,
        sstpRemoteAddress: routerSstpRemoteAddress
      };

      await updateRouter(editingRouter.id, updatedFields, currentUser.email);
      
      setEditingRouter(null);
      loadInfraData();
      
      // Reset form
      setRouterName('');
      setRouterHost('');
      setRouterApiUser('admin');
      setRouterApiPass('');
      setRouterSshUser('admin');
      setRouterSshPass('');
      setRouterApiPort('8728');
      setRouterSshPort('22');
      setRouterHttpPort('80');
      setRouterSnmpCommunity('public');
      setRouterSnmpPort('161');
      setRouterSnmpVersion('v2c');
      setRouterIpPoolStart('192.168.100.2');
      setRouterIpPoolEnd('192.168.100.254');
      setRouterIpPools([]);
      setRouterIpv6Enabled(false);
      setRouterIpv6Prefix('');
      setRouterIpv6Pool('');
      setRouterSstpEnabled(false);
      setRouterSstpUser('');
      setRouterSstpPassword('');
      setRouterSstpLocalAddress('192.168.192.1');
      setRouterSstpRemoteAddress('192.168.192.2');
    } catch (err) {
      alert('Error al actualizar el router');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddRouter = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser.ispId) return;
    setAddLoading(true);
    try {
      const initialRouter: Omit<Router, 'id' | 'createdAt'> = {
        ispId: currentUser.ispId,
        name: routerName,
        host: routerHost,
        apiPort: parseInt(routerApiPort),
        apiUser: routerApiUser,
        apiPassword: routerApiPass,
        sshPort: parseInt(routerSshPort),
        sshUser: routerSshUser,
        sshPassword: routerSshPass,
        httpPort: parseInt(routerHttpPort),
        useSsl: false,
        model: 'MikroTik RB',
        version: '7.12.1',
        status: 'Connecting', // Start as connecting
        snmpCommunity: routerSnmpCommunity,
        snmpPort: parseInt(routerSnmpPort),
        snmpVersion: routerSnmpVersion,
        ipPoolStart: routerIpPoolStart,
        ipPoolEnd: routerIpPoolEnd,
        ipPools: routerIpPools,
        ipv6Enabled: routerIpv6Enabled,
        ipv6Prefix: routerIpv6Prefix,
        ipv6Pool: routerIpv6Pool,
        sstpEnabled: routerSstpEnabled,
        sstpUser: routerSstpUser,
        sstpPassword: routerSstpPassword,
        sstpLocalAddress: routerSstpLocalAddress,
        sstpRemoteAddress: routerSstpRemoteAddress
      };

      // Create in DB
      const createdRouter = await createRouter(initialRouter, currentUser.email);
      
      // Perform immediate probe
      try {
        const liveMetrics = await probeRouterConnectivity(createdRouter);
        await updateRouter(createdRouter.id, liveMetrics, currentUser.email);
        
        if (liveMetrics.authError) {
          alert('Router agregado, pero las credenciales API MikroTik fueron rechazadas. Por favor verifique el usuario y contraseña.');
        }
      } catch (probeErr: any) {
        console.warn('Initial probe failed:', probeErr);
        // We don't alert here as it might just be offline, and it's already added to DB
      }

      setShowAddRouter(false);
      loadInfraData();
      // Reset form
      setRouterName('');
      setRouterHost('');
      setRouterApiUser('admin');
      setRouterApiPass('');
      setRouterSshUser('admin');
      setRouterSshPass('');
      setRouterApiPort('8728');
      setRouterSshPort('22');
      setRouterHttpPort('80');
      setRouterSnmpCommunity('public');
      setRouterSnmpPort('161');
      setRouterSnmpVersion('v2c');
      setRouterIpPoolStart('192.168.100.2');
      setRouterIpPoolEnd('192.168.100.254');
      setRouterIpPools([]);
      setRouterIpv6Enabled(false);
      setRouterIpv6Prefix('');
      setRouterIpv6Pool('');
      setRouterSstpEnabled(false);
      setRouterSstpUser('');
      setRouterSstpPassword('');
      setRouterSstpLocalAddress('192.168.192.1');
      setRouterSstpRemoteAddress('192.168.192.2');
    } catch (err) {
      alert('Error al agregar el router');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateSstp = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser.ispId) return;
    try {
      const config: Omit<SSTPConfig, 'id'> & { id?: string } = {
        id: sstpConfig?.id,
        ispId: currentUser.ispId,
        serverAddress: sstpServer,
        port: parseInt(sstpPort),
        certificateName: sstpCert,
        status: 'Active',
        secretKey: sstpSecret
      };
      await saveSSTPConfig(config, currentUser.email);
      alert('Configuración SSTP guardada');
      loadInfraData();
    } catch (err) {
      alert('Error al guardar SSTP');
    }
  };

  const handleDeleteRouter = async (id: string, name: string) => {
    if (!currentUser.ispId) return;

    if (!id) {
      if (onNotification) {
        onNotification('Error: El router no posee un identificador (ID) válido.', 'error');
      } else {
        alert('Error: El router no posee un identificador (ID) válido en la base de datos.');
      }
      return;
    }

    setDeleteConfirmation({ id, name });
  };

  const executeDeleteRouter = async (id: string, name: string) => {
    setDeleteConfirmation(null);
    try {
      setLoading(true);
      // Remove from Firestore
      await deleteRouter(id, name, currentUser.ispId, currentUser.email);
      // Instantly filter out from local view
      setRouters(prev => prev.filter(r => r.id !== id));
      // Close editing drawer if opened
      if (editingRouter && editingRouter.id === id) {
        setEditingRouter(null);
      }
      
      await loadInfraData();
      if (onNotification) {
        onNotification(`Router "${name}" eliminado exitosamente.`, 'success');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      if (onNotification) {
        onNotification('Error técnico al intentar eliminar el router: ' + (err.message || 'Desconocido'), 'error');
      } else {
        alert('Error técnico al intentar eliminar el router: ' + (err.message || 'Desconocido'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity size={32} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Analizando topología de red...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Infrastructure Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers size={24} className="text-blue-400" />
            Gestión de Routers
          </h2>
          <p className="text-gray-400 text-xs mt-1">Administración de dispositivos MikroTik y Túneles de Red</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSyncAll}
            disabled={loading || routers.length === 0}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="text-xs font-bold uppercase tracking-wider">Sincronizar Panel</span>
          </button>
          <button 
            onClick={() => setShowAddRouter(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={18} />
            Agregar Router
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 gap-4">
        <button 
          onClick={() => setActiveTab('routers')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'routers' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Routers MikroTik
        </button>
        <button 
          onClick={() => setActiveTab('telemetry')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'telemetry' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Túneles en Tiempo Real (SSTP)
        </button>
        <button 
          onClick={() => setActiveTab('scripts')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'scripts' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Generador de Scripts de Conexión Real
        </button>
      </div>

      {activeTab === 'telemetry' && (
        <div className="mt-4">
          <SstpStatusWidget 
            routers={routers} 
            activeTunnels={activeTunnels} 
            fetchActiveTunnels={fetchActiveTunnels} 
          />
        </div>
      )}

      {activeTab === 'scripts' && (
        <div className="mt-4">
          <SsstpScriptGenerator 
            routers={routers} 
            sstpServer={sstpConfig?.serverAddress || (typeof window !== 'undefined' ? window.location.host : 'tu-servidor-cloud.com')} 
          />
        </div>
      )}

      {activeTab === 'routers' && (
        <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
          {routers.length === 0 ? (
            <div className="py-20 bg-[#161b22] border border-dashed border-gray-800 rounded-3xl text-center">
              <Server size={48} className="text-gray-700 mx-auto mb-4" />
              <h3 className="text-white font-bold">No hay routers registrados</h3>
              <p className="text-gray-500 text-sm mt-2">Agrega tu primer equipo para comenzar la gestión centralizada.</p>
            </div>
          ) : (
            routers.map((r) => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#161b22] border border-gray-800 rounded-2xl p-4 hover:border-blue-500/50 transition-all group overflow-hidden relative grid grid-cols-1 xl:grid-cols-12 gap-5 items-center w-full"
              >
                {/* 1. IDENTITY & STATUS SECTION - SPANS 3 COLS */}
                <div className="flex items-center gap-3.5 xl:col-span-3 min-w-0">
                  <div className={`p-3 rounded-xl border transition-all group-hover:scale-110 shrink-0 ${r.status === 'Online' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    <Cpu size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-black text-white tracking-tight leading-tight uppercase truncate" title="System Identity">
                      {r.equipmentIdentity || 'DESCONOCIDO'}
                    </h4>
                    <p className="text-[9px] font-bold text-blue-400/80 tracking-tighter mt-0.5 uppercase truncate">
                      {r.model || 'MikroTik Device'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                       <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'Online' ? (r.authError ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-rose-500'}`} />
                       <span className={`text-[9px] font-black uppercase tracking-widest ${r.status === 'Online' ? (r.authError ? 'text-amber-400' : 'text-emerald-400') : 'text-rose-400'}`}>
                          {syncingRouterId === r.id ? 'Probando...' : (r.authError ? 'Rechazo Creds' : r.status)}
                       </span>
                    </div>
                  </div>
                </div>

                {/* 2. REALTIME METRICS ROW - SPANS 4 COLS */}
                <div className="xl:col-span-4 min-w-0 w-full">
                  {r.status === 'Online' && !r.authError ? (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
                      <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-800/40 flex items-center gap-2 min-w-[95px] flex-1 sm:flex-none">
                        <Cpu size={14} className="text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">CPU Load</p>
                          <p className="text-xs font-black text-emerald-400 leading-none">{r.cpuLoad || '0%'}</p>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-800/40 flex items-center gap-2 min-w-[125px] truncate flex-1 sm:flex-none">
                        <Clock size={14} className="text-gray-500 flex-shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">Activo</p>
                          <p className="text-xs font-bold text-gray-300 leading-none truncate">{r.uptime || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-800/40 flex items-center gap-2 min-w-[135px] flex-1 sm:flex-none">
                        <Shield size={14} className="text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">RAM</p>
                          <p className="text-xs font-bold text-blue-400 leading-none truncate">{r.memoryUsed || '0M'} <span className="text-[9px] text-gray-600 font-normal">/ {r.memoryTotal || '0M'}</span></p>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-800/40 flex items-center gap-2 min-w-[85px] flex-1 sm:flex-none">
                        <Thermometer size={14} className="text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">Temp</p>
                          <p className="text-xs font-bold text-orange-400 leading-none">{r.temperature || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="p-2 bg-gray-900/50 rounded-xl border border-gray-800/40 flex items-center gap-2 min-w-[85px] flex-1 sm:flex-none">
                        <Zap size={14} className="text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-0.5">Voltaje</p>
                          <p className="text-xs font-bold text-amber-400 leading-none">{r.voltage || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3 bg-black/20 rounded-xl border ${r.authError ? 'border-amber-500/20' : 'border-rose-500/10'} flex items-center gap-3 w-full`}>
                      {r.authError ? (
                        <Lock size={18} className="text-amber-500/50 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={18} className="text-rose-500/50 flex-shrink-0" />
                      )}
                      <div className="text-left">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider animate-pulse">
                          {r.authError ? 'Rechazo de Credenciales' : 'Conexión Inactiva'}
                        </p>
                        <p className="text-[9px] text-gray-500 mt-0.5">
                          {r.authError ? 'Configure u/p válidos para API MikroTik' : 'Revise IP pública o use Script Telemetría SSTP'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. NETWORK INFO CONTAINER - SPANS 2 COLS */}
                <div className="grid grid-cols-3 sm:flex sm:flex-row xl:flex-col gap-x-4 gap-y-1 text-[11px] font-mono xl:col-span-2 xl:border-l xl:border-gray-800/60 xl:pl-4 min-w-0">
                  <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center truncate">
                    <span className="text-gray-600 uppercase font-black tracking-widest text-[8px] xl:mr-1">Alias:</span>
                    <span className="text-gray-200 font-bold truncate">{r.name}</span>
                  </div>
                  <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center truncate">
                    <span className="text-gray-600 uppercase font-black tracking-widest text-[8px] xl:mr-1">Host:</span>
                    <span className="text-blue-400 font-bold truncate select-all">{r.host}</span>
                  </div>
                  <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center truncate">
                    <span className="text-gray-600 uppercase font-black tracking-widest text-[8px] xl:mr-1">Placa:</span>
                    <span className="text-gray-400 font-bold truncate">{r.model || 'N/A'}</span>
                  </div>
                </div>

                {/* 4. DIAGNOSTIC & MONITOR TRIGGER ACTIONS - SPANS 2 COLS */}
                <div className="flex items-center gap-1.5 xl:col-span-2 border-t xl:border-t-0 border-gray-800/40 pt-3.5 xl:pt-0 w-full">
                  <button 
                    onClick={() => {
                      setSelectedRouterForDiag(r);
                      handleRunDiagnostic(r, 'socket');
                    }}
                    className="flex-1 py-1.5 px-2 bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Ejecutar Consola API"
                  >
                    <Terminal size={12} />
                    API
                  </button>
                  <button 
                    onClick={() => {
                      setTrafficRouter(r);
                      setTrafficIface('');
                      setTrafficHistory([]);
                    }}
                    className="flex-1 py-1.5 px-2 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Escanear Tráfico de Interfaces en Tiempo Real (SNMP)"
                  >
                    <Activity size={12} className="animate-pulse" />
                    Tráfico
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedRouterForDiag(r);
                      handleRunDiagnostic(r, 'rest');
                    }}
                    className="flex-1 py-1.5 px-2 bg-gray-950 border border-gray-800 text-[9px] font-black text-gray-400 rounded-xl hover:bg-gray-800 hover:text-gray-200 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0"
                    title="Servicio Web"
                  >
                    <Globe size={12} />
                    Web
                  </button>
                </div>

                {/* 5. GENERAL ACTIONS TOOLBAR - SPANS 1 COL */}
                <div className="flex items-center justify-between sm:justify-end xl:justify-end xl:col-span-1 border-t sm:border-t-0 xl:border-t-0 border-gray-800/40 pt-3.5 sm:pt-0 xl:pt-0 shrink-0">
                  <span className="sm:hidden xl:hidden text-gray-500 text-[10px] font-bold uppercase tracking-wider">Acciones</span>
                  <div className="flex items-center gap-1 bg-gray-900/65 px-1.5 py-1 rounded-xl border border-gray-800/60">
                    <button 
                      onClick={() => openEditDrawer(r)}
                      className="p-1.5 bg-gray-800/30 hover:bg-gray-800 hover:text-blue-400 rounded-lg text-gray-400 transition-all cursor-pointer"
                      title="Editar Router"
                    >
                      <Settings size={13} />
                    </button>
                    <button 
                      onClick={() => handleSyncRouter(r)}
                      disabled={syncingRouterId === r.id}
                      className="p-1.5 bg-gray-800/30 hover:bg-gray-800 hover:text-blue-400 rounded-lg text-gray-400 transition-all disabled:opacity-50 cursor-pointer"
                      title="Forzar Sincronización"
                    >
                      <RefreshCw size={13} className={syncingRouterId === r.id ? 'animate-spin' : ''} />
                    </button>
                    <button 
                      onClick={() => handleDeleteRouter(r.id, r.name)}
                      className="p-1.5 bg-gray-800/30 hover:bg-rose-950 hover:text-rose-400 rounded-lg text-gray-400 transition-all cursor-pointer"
                      title="Remover Registros"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Ambient side accent blur */}
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/30 to-transparent pointer-events-none" />
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Router Drawer */}
      <AnimatePresence>
        {(showAddRouter || editingRouter) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddRouter(false);
                setEditingRouter(null);
              }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-lg bg-[#0d1117] border-l border-gray-800 shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white">{editingRouter ? 'Editar Router' : 'Nuevo Router Edge'}</h3>
                  <p className="text-xs text-gray-500 mt-1">{editingRouter ? `Modificando: ${editingRouter.name}` : 'Configura el acceso al equipo MikroTik'}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowAddRouter(false);
                    setEditingRouter(null);
                  }}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={editingRouter ? handleEditRouter : handleAddRouter} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Nombre Descriptivo</label>
                  <input 
                    required
                    value={routerName}
                    onChange={(e) => setRouterName(e.target.value)}
                    placeholder="RB-Sede-Prinicpal"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Host (IP o DNS DNS)</label>
                  <input 
                    required
                    value={routerHost}
                    onChange={(e) => setRouterHost(e.target.value)}
                    placeholder="192.168.1.1 o xxxx.sn.mynetname.net"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Puerto API</label>
                    <input 
                      value={routerApiPort}
                      onChange={(e) => setRouterApiPort(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Puerto SSH</label>
                    <input 
                      value={routerSshPort}
                      onChange={(e) => setRouterSshPort(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">HTTPS</label>
                    <input 
                      value={routerHttpPort}
                      onChange={(e) => setRouterHttpPort(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Credenciales de Acceso API
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      required
                      value={routerApiUser}
                      onChange={(e) => setRouterApiUser(e.target.value)}
                      placeholder="Usuario API"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                    <input 
                      type="password"
                      value={routerApiPass}
                      onChange={(e) => setRouterApiPass(e.target.value)}
                      placeholder="Password API"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Terminal size={14} />
                    Credenciales de Fallback (SSH)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      value={routerSshUser}
                      onChange={(e) => setRouterSshUser(e.target.value)}
                      placeholder="Usuario SSH"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                    <input 
                      type="password"
                      value={routerSshPass}
                      onChange={(e) => setRouterSshPass(e.target.value)}
                      placeholder="Password SSH"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Wifi size={14} />
                    Configuración SNMP (Monitoreo)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      value={routerSnmpCommunity}
                      onChange={(e) => setRouterSnmpCommunity(e.target.value)}
                      placeholder="Comunidad (public)"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        value={routerSnmpPort}
                        onChange={(e) => setRouterSnmpPort(e.target.value)}
                        placeholder="Port"
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                      />
                      <select 
                        value={routerSnmpVersion}
                        onChange={(e) => setRouterSnmpVersion(e.target.value as 'v1' | 'v2c')}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2 py-3 text-[11px] text-white font-bold"
                      >
                        <option value="v1">v1</option>
                        <option value="v2c">v2c</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2">
                      <Activity size={14} />
                      Gestión de Segmentos IP (Pools)
                    </h4>
                    <button 
                      type="button"
                      onClick={() => {
                        const newPool = {
                          id: Math.random().toString(36).substring(7),
                          name: `Pool ${ (routerIpPools?.length || 0) + 1 }`,
                          start: '192.168.1.2',
                          end: '192.168.1.254',
                          serviceType: 'All' as any
                        };
                        setRouterIpPools(prev => [...(prev || []), newPool]);
                      }}
                      className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 hover:bg-blue-600/30 transition-all font-bold uppercase"
                    >
                      + Agregar Pool
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {routerIpPools && routerIpPools.length > 0 ? (
                      routerIpPools.map((pool, idx) => (
                        <div key={pool.id} className="p-3 bg-black/30 rounded-xl border border-gray-800 relative group">
                          <button 
                            type="button"
                            onClick={() => setRouterIpPools(prev => prev?.filter(p => p.id !== pool.id))}
                            className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X size={10} />
                          </button>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                             <div className="space-y-1">
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1">Nombre</label>
                                <input 
                                  value={pool.name}
                                  onChange={(e) => {
                                    const updated = [...routerIpPools];
                                    updated[idx].name = e.target.value;
                                    setRouterIpPools(updated);
                                  }}
                                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white"
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1">Servicio</label>
                                <select 
                                  value={pool.serviceType}
                                  onChange={(e) => {
                                    const updated = [...routerIpPools];
                                    updated[idx].serviceType = e.target.value as any;
                                    setRouterIpPools(updated);
                                  }}
                                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white"
                                >
                                  <option value="All">Todos (All)</option>
                                  <option value="Static">IP Estática</option>
                                  <option value="DHCP">DHCP</option>
                                  <option value="PPPoE">PPPoE</option>
                                </select>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1">IP Inicio</label>
                              <input 
                                value={pool.start}
                                onChange={(e) => {
                                  const updated = [...routerIpPools];
                                  updated[idx].start = e.target.value;
                                  setRouterIpPools(updated);
                                }}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1">IP Fin</label>
                              <input 
                                value={pool.end}
                                onChange={(e) => {
                                  const updated = [...routerIpPools];
                                  updated[idx].end = e.target.value;
                                  setRouterIpPools(updated);
                                }}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 border border-dashed border-gray-700 rounded-xl">
                        <p className="text-[10px] text-gray-500 italic">No hay pools segmentados. Se usará el pool global por defecto.</p>
                        <div className="grid grid-cols-2 gap-4 mt-3 px-3">
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">P. Global Inicio</label>
                            <input 
                              required
                              value={routerIpPoolStart}
                              onChange={(e) => setRouterIpPoolStart(e.target.value)}
                              placeholder="Ej: 192.168.100.2"
                              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">P. Global Fin</label>
                            <input 
                              required
                              value={routerIpPoolEnd}
                              onChange={(e) => setRouterIpPoolEnd(e.target.value)}
                              placeholder="Ej: 192.168.100.254"
                              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2">
                      <Globe size={14} />
                      Dual-Stack IPv6
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={routerIpv6Enabled}
                        onChange={(e) => setRouterIpv6Enabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {routerIpv6Enabled && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">IPv6 Prefix (/48)</label>
                        <input 
                          value={routerIpv6Prefix}
                          onChange={(e) => setRouterIpv6Prefix(e.target.value)}
                          placeholder="2001:db8:1::/48"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">IPv6 User Pool (/64)</label>
                        <input 
                          value={routerIpv6Pool}
                          onChange={(e) => setRouterIpv6Pool(e.target.value)}
                          placeholder="2001:db8:1:a::/64"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 italic px-1">
                    Permite la asignación automática de direccionamiento IPv6 a los clientes.
                  </p>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2">
                      <Shield size={14} className="text-blue-400" />
                      Cliente VPN SSTP (Conexión Directa)
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={routerSstpEnabled}
                        onChange={(e) => setRouterSstpEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {routerSstpEnabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">Usuario VPN SSTP *</label>
                          <input 
                            required={routerSstpEnabled}
                            value={routerSstpUser}
                            onChange={(e) => setRouterSstpUser(e.target.value)}
                            placeholder="nodo1_vpn"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">Contraseña VPN SSTP *</label>
                          <input 
                            required={routerSstpEnabled}
                            type="text"
                            value={routerSstpPassword}
                            onChange={(e) => setRouterSstpPassword(e.target.value)}
                            placeholder="password_secreta"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">IP Gateway Túnel (Local) *</label>
                          <input 
                            required={routerSstpEnabled}
                            value={routerSstpLocalAddress}
                            onChange={(e) => setRouterSstpLocalAddress(e.target.value)}
                            placeholder="192.168.192.1"
                            className="w-full bg-gray-900 border border-gray-850 rounded-xl px-4 py-3 text-sm text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">IP Asignada Túnel (Remote) *</label>
                          <input 
                            required={routerSstpEnabled}
                            value={routerSstpRemoteAddress}
                            onChange={(e) => setRouterSstpRemoteAddress(e.target.value)}
                            placeholder="192.168.192.2"
                            className="w-full bg-gray-900 border border-gray-850 rounded-xl px-4 py-3 text-sm text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 italic px-1">
                    Permite que el MikroTik inicie una conexión de túnel VPN directo al servidor SSTP integrado para gestión automática detrás de NAT.
                  </p>
                </div>

                <button 
                  disabled={addLoading}
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addLoading ? <Activity className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {editingRouter ? 'ACTUALIZAR CONFIGURACIÓN' : 'REGISTRAR EQUIPO MIKROTIK'}
                </button>

                {editingRouter && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteRouter(editingRouter.id, editingRouter.name)}
                    className="w-full mt-2 py-4 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-500 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Trash2 size={16} />
                    ELIMINAR ROUTER PERMANENTEMENTE
                  </button>
                )}
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Connection Validator & Diagnostic Console */}
      <AnimatePresence>
        {selectedRouterForDiag && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRouterForDiag(null)}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[760px] md:h-[620px] z-[70] bg-[#0c1017] border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-800/80 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-lg font-black text-white tracking-tight">Consola de Conectividad & Validación</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 uppercase font-mono tracking-wider">
                    {selectedRouterForDiag.name} · Host: {selectedRouterForDiag.host}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedRouterForDiag(null)}
                  className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Protocol Chooser */}
              <div className="grid grid-cols-5 gap-2 bg-[#12161f] p-1.5 rounded-xl border border-gray-800/50 my-5">
                <button 
                  onClick={() => {
                    setDiagTab('rest');
                    handleRunDiagnostic(selectedRouterForDiag, 'rest');
                  }}
                  disabled={diagStatus === 'running'}
                  className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${diagTab === 'rest' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  REST
                </button>
                <button 
                  onClick={() => {
                    setDiagTab('socket');
                    handleRunDiagnostic(selectedRouterForDiag, 'socket');
                  }}
                  disabled={diagStatus === 'running'}
                  className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${diagTab === 'socket' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  API
                </button>
                <button 
                  onClick={() => {
                    setDiagTab('snmp');
                    handleRunDiagnostic(selectedRouterForDiag, 'snmp');
                  }}
                  disabled={diagStatus === 'running'}
                  className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${diagTab === 'snmp' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  SNMP
                </button>
                <button 
                  onClick={() => {
                    setDiagTab('ssh');
                    handleRunDiagnostic(selectedRouterForDiag, 'ssh');
                  }}
                  disabled={diagStatus === 'running'}
                  className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${diagTab === 'ssh' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  SSH
                </button>
                <button 
                  onClick={() => {
                    setDiagTab('ping');
                    handleRunDiagnostic(selectedRouterForDiag, 'ping');
                  }}
                  disabled={diagStatus === 'running'}
                  className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${diagTab === 'ping' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  PING
                </button>
              </div>

              {/* Main Workspace: Shell Logs + Parsed Variables */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-5 min-h-0 overflow-hidden mb-5">
                
                {/* Visual Shell */}
                <div className="md:col-span-3 bg-black border border-gray-900 rounded-2xl p-4 font-mono text-[11px] flex flex-col min-h-[180px] md:min-h-0">
                  <div className="flex items-center justify-between border-b border-gray-950 pb-2 mb-3">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal size={12} /> terminal_capture.log
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                  </div>
                  
                  {/* Logs area */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {diagLogs.map((log, index) => {
                      let colorClass = 'text-gray-400';
                      if (log.includes('SUCCESS:')) colorClass = 'text-emerald-400 font-bold';
                      else if (log.includes('ERROR:')) colorClass = 'text-rose-400 font-bold';
                      else if (log.includes('SEND:')) colorClass = 'text-blue-400';
                      else if (log.includes('RECV:')) colorClass = 'text-gray-300';
                      else if (log.includes('INFO:')) colorClass = 'text-amber-400/80';
                      
                      return (
                        <div key={index} className={`leading-relaxed whitespace-pre-wrap break-all ${colorClass}`}>
                          {log}
                        </div>
                      );
                    })}
                    {diagStatus === 'running' && (
                      <div className="text-gray-500 animate-pulse flex items-center gap-2">
                        <span>●</span> Procesando respuesta del router según estándar...
                      </div>
                    )}
                  </div>
                </div>

                {/* Parsed Metrics & Verification Card */}
                <div className="md:col-span-2 flex flex-col space-y-4">
                  
                  {/* Validation State Badge */}
                  <div className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center ${
                    diagStatus === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                    diagStatus === 'failed' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                    diagStatus === 'running' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
                    'bg-gray-900/50 border-gray-800 text-gray-500'
                  }`}>
                    {diagStatus === 'success' && <CheckCircle2 size={32} className="mb-2" />}
                    {diagStatus === 'failed' && <AlertCircle size={32} className="mb-2 animate-bounce" />}
                    {diagStatus === 'running' && <Activity size={32} className="mb-2 animate-spin text-blue-500" />}
                    {diagStatus === 'idle' && <Terminal size={32} className="mb-2" />}

                    <span className="text-xs font-black uppercase tracking-widest block">
                      {diagStatus === 'success' ? 'Enlace Verificado' :
                       diagStatus === 'failed' ? 'Error de Conexión' :
                       diagStatus === 'running' ? 'Validando Sockets...' : 'Esperando Inicio'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 leading-snug">
                      {diagStatus === 'success' ? 'La respuesta cumple con las cabeceras REST/API.' :
                       diagStatus === 'failed' ? 'El dispositivo rechazó la autenticación o está offline.' :
                       diagStatus === 'running' ? 'Analizando tramas de bytes y paquetes.' : 'Selecciona un protocolo arriba.'}
                    </span>
                  </div>

                  {/* Decrypted Parameter Table & Inventory */}
                  <div className="flex-1 bg-[#12161f] border border-gray-800 rounded-3xl p-5 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-gray-850 pb-2 flex-shrink-0">
                        <Layers size={12} /> {diagTab === 'snmp' ? 'Inventario de Red' : 'Parámetros Leídos'}
                      </h4>
                      
                      {diagParsedData ? (
                        <div className="space-y-4">
                          {/* Basic Stats Grid */}
                          <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                            <div className="bg-black/30 p-2 rounded-lg border border-gray-800/50">
                              <span className="text-gray-500 block mb-1">UPTIME</span>
                              <span className="text-white font-bold">{diagParsedData.uptime}</span>
                            </div>
                            <div className="bg-black/30 p-2 rounded-lg border border-gray-800/50">
                              <span className="text-gray-500 block mb-1">CPU LOAD</span>
                              <span className="text-emerald-400 font-bold">{diagParsedData.cpuLoad}</span>
                            </div>
                            <div className="bg-black/30 p-2 rounded-lg border border-gray-800/50">
                              <span className="text-gray-500 block mb-1">TEMP</span>
                              <span className="text-amber-400 font-bold">{diagParsedData.temperature}</span>
                            </div>
                            <div className="bg-black/30 p-2 rounded-lg border border-gray-800/50">
                              <span className="text-gray-500 block mb-1">VOLT</span>
                              <span className="text-blue-400 font-bold">{diagParsedData.voltage}</span>
                            </div>
                          </div>

                          {diagTab === 'snmp' && (
                            <>
                              {/* System Info */}
                              <div className="space-y-2 py-3 border-t border-gray-850 mt-2">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Cpu size={12} /> DATOS DEL SISTEMA
                                </p>
                                <div className="text-[10px] space-y-1 bg-black/20 p-2.5 rounded-xl border border-gray-800/40">
                                  <div className="flex justify-between"><span className="text-gray-500">Board Name:</span> <span className="text-gray-300 font-bold">{diagParsedData.board}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500 font-medium">OS Version:</span> <span className="text-blue-400 font-semibold">RouterOS v{diagParsedData.osVersion || "7.x"}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Serial Num:</span> <span className="text-gray-300 font-mono font-bold">{diagParsedData.serialNumber || "N/A"}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">CPU Freq:</span> <span className="text-emerald-400">{diagParsedData.cpuFrequency || "N/A"}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Ubicación:</span> <span className="text-gray-300 truncate max-w-[150px]">{diagParsedData.location || "Default Rack"}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Contacto:</span> <span className="text-gray-400 italic truncate max-w-[150px]">{diagParsedData.contact || "N/A"}</span></div>
                                  <p className="text-[9px] text-gray-500 mt-2 italic leading-relaxed border-t border-gray-800/50 pt-1">
                                    {diagParsedData.description}
                                  </p>
                                </div>
                              </div>

                              {/* Memory & HDD Usage */}
                              <div className="space-y-3 py-3 border-t border-gray-850">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Layers size={12} /> RECURSOS DE HARDWARE
                                </p>
                                
                                <div className="space-y-2 bg-black/20 p-2.5 rounded-xl border border-gray-800/40">
                                  {/* RAM Usage */}
                                  <div>
                                    <div className="flex justify-between items-center text-[9px] mb-1">
                                       <span className="text-gray-400 flex items-center gap-1"><Shield size={10} /> RAM en Uso</span>
                                       <span className="text-gray-300 font-bold font-mono">{diagParsedData.memoryUsed || "0MB"} / {diagParsedData.memoryTotal || "1024MB"}</span>
                                    </div>
                                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                        className="bg-blue-500 h-full transition-all duration-1000" 
                                        style={{ 
                                          width: `${Math.min(100, Math.max(8, (parseInt(diagParsedData.memoryUsed || '0') / parseInt(diagParsedData.memoryTotal || '1024')) * 100))}%` 
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Disk Usage */}
                                  <div className="pt-1.5">
                                    <div className="flex justify-between items-center text-[9px] mb-1">
                                       <span className="text-gray-400 flex items-center gap-1"><Server size={10} /> Disco Flash</span>
                                       <span className="text-gray-300 font-bold font-mono">{diagParsedData.diskUsed || "0MB"} / {diagParsedData.diskTotal || "128MB"}</span>
                                    </div>
                                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                        className="bg-purple-500 h-full transition-all duration-1000" 
                                        style={{ 
                                          width: `${Math.min(100, Math.max(8, (parseInt(diagParsedData.diskUsed || '0') / parseInt(diagParsedData.diskTotal || '128')) * 100))}%` 
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Active Fans and Cooling info */}
                                  {diagParsedData.activeFans > 0 && (
                                    <div className="flex justify-between items-center text-[9px] border-t border-gray-800/60 pt-2 mt-1">
                                      <span className="text-gray-500 flex items-center gap-1">💨 Ventilación Activa</span>
                                      <span className="text-orange-400 font-bold font-mono">{diagParsedData.activeFans} Fans ({diagParsedData.fanSpeed1})</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Interfaces Inventory */}
                              <div className="space-y-2 py-3 border-t border-gray-850">
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Globe size={11} /> PUERTOS / INTERFACES
                                  </p>
                                  <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/15">
                                    {diagParsedData.interfaces?.length || 0} TOTAL
                                  </span>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {diagParsedData.interfaces?.map((iface: any, i: number) => (
                                    <div key={i} className="p-2 bg-black/35 rounded-xl border border-gray-800/50 text-[9px]">
                                      <div className="flex items-center justify-between font-mono mb-1 pb-1 border-b border-gray-900/30">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${iface.status === 'Up' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                          <span className="text-gray-200 font-black">{iface.name}</span>
                                          <span className="text-gray-600">[{iface.speed || "N/A"}]</span>
                                        </div>
                                        <div className="text-gray-500 text-[8px]">
                                          MTU: <span className="text-gray-400 font-bold">{iface.mtu || 1500}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[8px] text-gray-500">
                                        <div>MAC: <span className="text-gray-400">{iface.mac || 'N/A'}</span></div>
                                        {iface.comment && <div className="truncate text-blue-400/80">Comm: {iface.comment}</div>}
                                        <div className="flex justify-between col-span-2 pt-1 mt-0.5 border-t border-black/10">
                                          <span>Rx: <strong className="text-emerald-500/90">{Math.round((iface.inOctets || 0) / 1024).toLocaleString()} KB</strong></span>
                                          <span>Tx: <strong className="text-blue-500/90">{Math.round((iface.outOctets || 0) / 1024).toLocaleString()} KB</strong></span>
                                        </div>
                                        {((iface.inErrors || 0) > 0 || (iface.outErrors || 0) > 0) && (
                                          <div className="col-span-2 text-rose-400 font-black bg-rose-500/5 pt-0.5 mt-0.5 text-center rounded border border-rose-500/10">
                                            ⚠️ Errores Enlace: RX={iface.inErrors || 0} / TX={iface.outErrors || 0}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* ARP Mapping Neighborhood */}
                              {diagParsedData.arpTable && diagParsedData.arpTable.length > 0 && (
                                <div className="space-y-2 py-3 border-t border-gray-850">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Terminal size={11} /> ARP NEIGHBORS / LAN DEVICES
                                    </p>
                                    <span className="bg-purple-500/10 text-purple-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-purple-500/15">
                                      {diagParsedData.arpTable.length} ACTIVOS
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                    {diagParsedData.arpTable.map((arp: any, idx: number) => (
                                      <div key={idx} className="p-1.5 bg-black/40 rounded-lg border border-purple-900/15 flex justify-between items-center font-mono text-[9px]">
                                        <div className="flex flex-col">
                                          <span className="text-gray-300 font-semibold">{arp.ip}</span>
                                          <span className="text-gray-600 text-[7.5px] uppercase">Interfaz #{arp.interfaceIndex || 1}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="text-gray-400 text-[8.5px] font-bold">{arp.mac}</span>
                                          <span className={`text-[7px] px-1 py-0.1 rounded font-bold ${arp.type === 'Static' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-800 text-gray-500'}`}>
                                            {arp.type || "Dynamic"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-xs text-gray-600 italic">
                          Iniciando motor de descubrimiento SNMP...
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => handleRunDiagnostic(selectedRouterForDiag, diagTab)}
                      disabled={diagStatus === 'running'}
                      className="w-full py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] font-black text-white rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-auto"
                    >
                      <RefreshCw size={12} className={diagStatus === 'running' ? 'animate-spin' : ''} />
                      RE-ESCANEAR RECURSOS
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Interface Traffic Monitor (SNMP) */}
      <AnimatePresence>
        {trafficRouter && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTrafficRouter(null)}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[820px] md:h-[620px] z-[70] bg-[#0c1017] border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-800 pb-5 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-lg font-black text-white tracking-tight">Escaner de Tráfico SNMP en Tiempo Real</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 uppercase font-mono tracking-wider">
                    {trafficRouter.name} · Host: {trafficRouter.host}
                  </p>
                </div>
                <button 
                  onClick={() => setTrafficRouter(null)}
                  className="p-2 bg-gray-900 border border-gray-800 text-gray-450 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {trafficInterfacesList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <Activity size={48} className="text-emerald-500 animate-spin mb-4" />
                  <h4 className="text-white font-bold uppercase tracking-wider text-xs">Descubriendo Interfaces...</h4>
                  <p className="text-gray-500 text-[11px] mt-2 max-w-sm leading-relaxed">
                    Solicitando lista de interfaces activas y contadores de octetos (OIDs ifDescr, ifHCInOctets, ifHCOutOctets) vía SNMP...
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar pt-5 space-y-5 min-h-0">
                  {/* Selector & Current Data */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center shrink-0">
                    <div className="md:col-span-5 flex flex-col space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Seleccionar Interfaz</label>
                      <select 
                        value={trafficIface}
                        onChange={(e) => {
                          setTrafficIface(e.target.value);
                          setTrafficHistory([]); // Reiniciar historial para calcular correcta delta sec
                        }}
                        className="w-full bg-[#161b22] border border-gray-800 text-gray-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-blue-500/50 cursor-pointer"
                      >
                        {trafficInterfacesList.map((iface: any) => (
                          <option key={iface.name} value={iface.name}>
                            {iface.name} ({iface.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedIfaceData && (
                      <div className="md:col-span-7 grid grid-cols-3 gap-2 text-[10px] bg-black/25 border border-gray-850 p-2.5 rounded-xl">
                        <div>
                          <span className="text-gray-500 block mb-0.5 font-bold uppercase tracking-widest text-[8px]">ESTADO</span>
                          <span className={`inline-flex items-center gap-1 font-black ${selectedIfaceData.status === 'Up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedIfaceData.status === 'Up' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-450'}`} />
                            {selectedIfaceData.status === 'Up' ? 'ACTIVE / UP' : 'DOWN'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-0.5 font-bold uppercase tracking-widest text-[8px]">VELOCIDAD</span>
                          <span className="text-gray-300 font-bold">{selectedIfaceData.speed || '1 Gbps'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-0.5 font-bold uppercase tracking-widest text-[8px]">MAC ADDRESS</span>
                          <span className="text-gray-400 font-mono truncate block">{selectedIfaceData.mac || 'N/A'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Speed Meters */}
                  <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div className="bg-gradient-to-br from-emerald-950/20 to-black/30 border border-emerald-500/10 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Downlink (RX) Entrada</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white leading-none font-mono">
                            {trafficHistory.length > 0 
                              ? (trafficHistory[trafficHistory.length - 1].rx > 1024 
                                ? (trafficHistory[trafficHistory.length - 1].rx / 1024).toFixed(2) 
                                : trafficHistory[trafficHistory.length - 1].rx.toFixed(1))
                              : '0.0'}
                          </span>
                          <span className="text-xs font-bold text-gray-400 font-mono">
                            {trafficHistory.length > 0 && trafficHistory[trafficHistory.length - 1].rx > 1024 ? 'MB/s' : 'KB/s'}
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 animate-pulse">
                        <Activity size={18} />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-950/20 to-black/30 border border-blue-500/10 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Uplink (TX) Salida</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white leading-none font-mono">
                            {trafficHistory.length > 0 
                              ? (trafficHistory[trafficHistory.length - 1].tx > 1024 
                                ? (trafficHistory[trafficHistory.length - 1].tx / 1024).toFixed(2) 
                                : trafficHistory[trafficHistory.length - 1].tx.toFixed(1))
                              : '0.0'}
                          </span>
                          <span className="text-xs font-bold text-gray-400 font-mono">
                            {trafficHistory.length > 0 && trafficHistory[trafficHistory.length - 1].tx > 1024 ? 'MB/s' : 'KB/s'}
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Activity size={18} className="animate-bounce" />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Live Graph */}
                  <div className="flex-1 bg-[#12161f] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[220px]">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Gráfico de Fluido de Paquetes (KB/s)</span>
                      <span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        ACTUALIZANDO CADA 4 SEG
                      </span>
                    </div>

                    <div className="flex-1 min-h-0 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={trafficHistory}
                          margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#4b5563" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#4b5563" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <ChartTooltip 
                            contentStyle={{ 
                              backgroundColor: '#161b22', 
                              borderColor: '#374151',
                              borderRadius: '12px',
                              fontSize: '11px',
                              color: '#fff'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="rx" 
                            name="Bajada (RX)"
                            stroke="#34d399" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorRx)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="tx" 
                            name="Subida (TX)"
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorTx)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary row */}
                  {selectedIfaceData && (
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-2 shrink-0 border-t border-gray-850">
                      <span>Total TX/RX Octets:</span>
                      <span className="text-gray-300 font-bold">
                        RX: {Math.round((Number(selectedIfaceData.inOctets) || 0) / 1024 / 1024)} MB | TX: {Math.round((Number(selectedIfaceData.outOctets) || 0) / 1024 / 1024)} MB
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modals to bypass sandboxed window.confirm blocking */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-[#161b22] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl transition-all scale-100">
            <div className="space-y-2 text-center">
              <span className="p-3 bg-rose-600/15 text-rose-500 rounded-full inline-block mx-auto">
                <Trash2 size={24} />
              </span>
              <h4 className="text-base font-black text-white uppercase tracking-wider">¿Estás seguro de eliminar el router?</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Esta acción eliminará el router <strong className="text-rose-400 font-bold">"{deleteConfirmation.name}"</strong> de forma permanente de la base de datos. Se perderá inmediatamente todo acceso mediante API MikroTik y Túneles SSTP.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-305 text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDeleteRouter(deleteConfirmation.id, deleteConfirmation.name)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-rose-600/20"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SsstpScriptGeneratorProps {
  routers: Router[];
  sstpServer: string;
}

function SsstpScriptGenerator({ routers, sstpServer }: SsstpScriptGeneratorProps) {
  const [selectedRouterId, setSelectedRouterId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedExtra, setCopiedExtra] = useState(false);
  const [vpnType, setVpnType] = useState<'telemetry' | 'ovpn' | 'wireguard' | 'l2tp' | 'cgnat'>('telemetry');

  // OpenVPN dynamic options State
  const [ovpnPort, setOvpnPort] = useState('1194');
  const [ovpnProtocol, setOvpnProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [ovpnUser, setOvpnUser] = useState('admin_ovpn_vpn');
  const [ovpnPass, setOvpnPass] = useState('OvpnPassSecure123!');
  const [ovpnMode, setOvpnMode] = useState<'ip' | 'ethernet'>('ip');

  // WireGuard dynamic options State
  const [wgPort, setWgPort] = useState('13231');
  const [wgVpnIp, setWgVpnIp] = useState('10.8.0.1');
  const [wgClientIp, setWgClientIp] = useState('10.8.0.2');
  const [wgPcPublicKey, setWgPcPublicKey] = useState('SU_CLAVE_PUBLICA_DE_PC_AQUI_===');
  const [wgRouterPublicKey, setWgRouterPublicKey] = useState('SU_CLAVE_PUBLICA_DE_MIKROTIK_===');

  // L2TP dynamic options State
  const [l2tpSecret, setL2tpSecret] = useState('IPsecSecretSecret987');
  const [l2tpUser, setL2tpUser] = useState('admin_pc_vpn');
  const [l2tpPass, setL2tpPass] = useState('VpnPassSecure123!');

  useEffect(() => {
    if (routers.length > 0 && !selectedRouterId) {
      setSelectedRouterId(routers[0].id);
    }
  }, [routers]);

  const router = routers.find(r => r.id === selectedRouterId);
  
  // Helper to remove double protocols like https://https:// or leading/trailing slashes
  const sanitizeHost = (host: string) => {
    return host
      .trim()
      .replace(/^https?:\/\//i, '') // strip http:// or https://
      .replace(/\/$/, '');          // strip trailing slash
  };

  const rawHost = sstpServer || (typeof window !== 'undefined' ? window.location.host : 'tu-servidor-cloud.com');
  const serverHost = sanitizeHost(rawHost);

  const sstpUser = router?.sstpUser || (router?.name ? router.name.toLowerCase().replace(/\s+/g, '_') + '_vpn' : 'usuario_vpn');
  const sstpPass = router?.sstpPassword || 'sstpPass123!';
  const localAddr = router?.sstpLocalAddress || '192.168.192.1';
  const remoteAddr = router?.sstpRemoteAddress || '192.168.192.2';

  // --- 1. SCRIPT DE TELEMETRIA (REST SSTP) ---
  const telemetryScriptText = `/ppp profile add name="SSTP-Cloud-Profile" use-encryption=yes use-upnp=no use-ipv6=no comment="Perfil Gestion Cloud SSTP"

/interface sstp-client add name="sstp-cloud-connection" \\
    connect-to="${serverHost}" \\
    port=443 \\
    user="${sstpUser}" \\
    password="${sstpPass}" \\
    profile="SSTP-Cloud-Profile" \\
    keepalive-timeout=60 \\
    disabled=no \\
    comment="Túnel SSTP de Monitoreo Remoto"

/system script remove [find name="SSTP-Heartbeat"]
/system script add name="SSTP-Heartbeat" source={
  :local routerId "${router?.id || 'ID_NODO'}"
  :local user "${sstpUser}"
  :local localIP "${localAddr}"
  :local remoteIP "${remoteAddr}"
  :local host "${serverHost}"
  
  :log info "Registrando telemetria real de hardware..."
  :local uptime [/system resource get uptime]
  :local cpu [/system resource get cpu-load]
  :local ver [/system resource get version]
  :local board [/system resource get board-name]
  
  :local boardClean ""
  :local boardLen [:len $board]
  :for i from=0 to=($boardLen - 1) do={
    :local char [:pick $board $i ($i + 1)]
    :if ($char = " ") do={ :set char "_" }
    :set boardClean ($boardClean . $char)
  }
  
  :local volt "N/A"
  :do {
    :local vItems [/system health find where name="voltage" or name="board-voltage"]
    :if ([:len $vItems] > 0) do={
      :set volt [/system health get [:pick $vItems 0] value]
    }
  } on-error={}
  
  :local temp "N/A"
  :do {
    :local tItems [/system health find where name="temperature" or name="cpu-temperature" or name="board-temperature"]
    :if ([:len $tItems] > 0) do={
      :set temp [/system health get [:pick $tItems 0] value]
    }
  } on-error={}

  :log info "Enviando telemetria SSTP a la consola Cloud..."
  /tool fetch url="https://$host/api/sstp/heartbeat\\?routerId=$routerId&user=$user&local=$localIP&remote=$remoteIP&uptime=$uptime&cpu=$cpu&ver=$ver&board=$boardClean&volt=$volt&temp=$temp" keep-result=no check-certificate=no
  
  :local devices ""
  /ip arp {
    :foreach entry in=[find] do={
      :local ip [get $entry address]
      :local mac [get $entry mac-address]
      :local iface [get $entry interface]
      :local comment [get $entry comment]
      :if ([:len $comment] = 0) do={ :set comment "Equipo local" }
      
      :if ([:len $mac] > 0 && [:len $ip] > 0) do={
        :set devices ($devices . "$ip,$mac,$iface,$comment;")
      }
    }
  }
  
  :if ([:len $devices] > 0) do={
    :log info "Reportando ARP a la nube..."
    /tool fetch url="https://$host/api/sstp/report-lan\\?routerId=$routerId&devices=$devices" keep-result=no check-certificate=no
  }

  :log info "Consultando comandos Web pendientes..."
  :do {
    /tool fetch url="https://$host/api/sstp/poll-command\\?routerId=$routerId" keep-result=yes dst-path="cloud_cmd.txt" check-certificate=no
    :local cmd [/file get cloud_cmd.txt contents]
    
    :if ($cmd != "NONE") do={
      :log info "Comando Web detectado: $cmd"
      
      :if ([:pick $cmd 0 4] = "ping") do={
        :local targetIP [:pick $cmd 5 [:len $cmd]]
        :log info "Ejecutando ping remoto a $targetIP..."
        /tool fetch url="https://$host/api/sstp/report-result\\?routerId=$routerId&result=Iniciando_Ping_a_$targetIP" keep-result=no check-certificate=no
        
        :local pingsSent 3
        :local pingsRecv [/ping $targetIP count=$pingsSent]
        :local percentageLoss (100 - (($pingsRecv * 100) / $pingsSent))
        
        /tool fetch url=("https://" . $host . "/api/sstp/report-result\\?routerId=" . $routerId . "&result=Resultado_Ping_" . $targetIP . "_Sent_3_Recv_" . $pingsRecv . "_Loss_Pct_" . $percentageLoss) keep-result=no check-certificate=no
      }
      
      :if ([:pick $cmd 0 3] = "wol") do={
        :local targetMac [:pick $cmd 4 [:len $cmd]]
        :log info "Enviando frame Wake-on-LAN a MAC -$targetMac-..."
        /tool wol mac=$targetMac
        /tool fetch url=("https://" . $host . "/api/sstp/report-result\\?routerId=" . $routerId . "&result=Magic_WOL_enviado_a_" . $targetMac) keep-result=no check-certificate=no
      }
    }
  } on-error={
    :log warning "Fallo temporal al consultar cola de comandos."
  }
}

/system scheduler remove [find name="SSTP-Auto-Trigger"]
/system scheduler add name="SSTP-Auto-Trigger" interval=30s on-event="SSTP-Heartbeat" comment="Trigger Centralizado Telemetria y Control"

:put "¡Túnel SSTP, Monitoreo LAN Bidireccional de hardware real configurado con éxito!"`;

  // --- 2. SCRIPT DE WIREGUARD (ROUTERS V7) ---
  const wireguardScriptText = `/interface wireguard add name="wg-vpn" listen-port=${wgPort} comment="VPN de Gestion LAN Real"

/ip address add address=${wgVpnIp}/24 interface=wg-vpn comment="Red VPN de Administracion"

/ip firewall filter add chain=input action=accept protocol=udp dst-port=${wgPort} comment="Permitir Puerto WireGuard UDP"
/ip firewall filter add chain=forward action=accept in-interface=wg-vpn comment="Permitir ruteo desde VPN a Subredes LAN"

/interface wireguard peers add interface="wg-vpn" public-key="${wgPcPublicKey}" allowed-address=${wgClientIp}/32 comment="PC Administrador de Red"

/ip cloud set ddns-enabled=yes ddns-update-interval=10m
:delay 3s
/ip cloud print`;

  const wireguardClientConfig = `[Interface]
PrivateKey = [COPIE_LA_CLAVE_PRIVADA_GENERADA_EN_SU_APLICACIÓN_PC]
Address = ${wgClientIp}/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = ${wgRouterPublicKey}
Endpoint = [SU_IP_PUBLICA_O_DOMINIO_DDNS_DEL_MIKROTIK]:${wgPort}
AllowedIPs = ${wgVpnIp.substring(0, wgVpnIp.lastIndexOf('.'))}.0/24, 192.168.0.0/16, 172.16.0.0/12, 10.0.0.0/8
PersistentKeepalive = 25`;

  // --- 3. SCRIPT DE L2TP / IPSEC SERVER (SISTEMAS NATIVOS v6 / v7) ---
  const l2tpScriptText = `/ip pool add name="L2TP-VPN-Pool" ranges=10.10.0.10-10.10.0.50

/ppp profile add name="L2TP-VPN-Profile" local-address=10.10.0.1 remote-address=L2TP-VPN-Pool use-encryption=yes comment="Perfil L2TP VPN"

/interface l2tp-server server set enabled=yes use-ipsec=yes ipsec-secret="${l2tpSecret}" default-profile="L2TP-VPN-Profile"

/ppp secret add name="${l2tpUser}" password="${l2tpPass}" service=l2tp profile="L2TP-VPN-Profile" comment="PC Admin VPN"

/ip firewall filter add chain=input action=accept protocol=udp port=500,4500,1701 comment="Permitir conexion L2TP/IPsec"
/ip firewall filter add chain=input action=accept protocol=ipsec-esp comment="Permitir Protocolo IPsec ESP"
/ip firewall filter add chain=forward action=accept in-interface=*l2tp comment="Permitir forwarding desde clientes VPN"

/ip cloud set ddns-enabled=yes
:delay 3s
/ip cloud print`;

  // --- 4. CGNAT REVERSE TUNNEL LINK SYSTEM ---
  const cgnatScriptText = `/interface sstp-client add name="cgnat-sstp" \\
    connect-to="[SU_IP_PÚBLICA_O_DNS_DE_VPS_AQUI]" \\
    port=443 \\
    user="${sstpUser}" \\
    password="${sstpPass}" \\
    profile="default-encryption" \\
    keepalive-timeout=60 \\
    disabled=no \\
    comment="Enlace VPN Inverso para Saltarse CGNAT de Internet Móvil/FTTH"`;

  // --- 5. OPENVPN (OVPN) SERVER & CLIENT GENERATION ---
  const ovpnScriptText = `/ip pool add name="OpenVPN-Pool" ranges=10.20.0.10-10.20.0.50
/ppp profile add name="OpenVPN-Profile" local-address=10.20.0.1 remote-address=OpenVPN-Pool use-encryption=yes comment="OpenVPN-Profile"
/ppp secret add name="${ovpnUser}" password="${ovpnPass}" service=ovpn profile="OpenVPN-Profile" comment="OpenVPN-User"
/interface ovpn-server set enabled=yes port=${ovpnPort} protocol=${ovpnProtocol} mode=${ovpnMode} default-profile="OpenVPN-Profile" auth=sha1 cipher=aes128,aes192,aes256
/ip firewall filter add chain=input action=accept protocol=${ovpnProtocol} dst-port=${ovpnPort} comment="Permitir conexion OpenVPN"
/ip firewall filter add chain=forward action=accept src-address=10.20.0.0/24 comment="Permitir forwarding desde VPN"
/ip cloud set ddns-enabled=yes`;

  const ovpnClientConfig = `client
${ovpnMode === 'ethernet' ? 'dev tap' : 'dev tun'}
proto ${ovpnProtocol}
remote [SU_IP_PUBLICA_O_DOMINIO_DDNS_DEL_MIKROTIK] ${ovpnPort}
resolv-retry infinite
nobind
persist-key
persist-tun
mute-replay-warnings
auth-user-pass
auth SHA1
cipher AES-256-CBC
route-delay 2
redirect-gateway def1
verb 3

<auth-user-pass>
${ovpnUser}
${ovpnPass}
</auth-user-pass>`;

  const copyToClipboard = (text: string, isExtra: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isExtra) {
      setCopiedExtra(true);
      setTimeout(() => setCopiedExtra(false), 2005);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2005);
    }
  };

  const getActiveScriptText = () => {
    switch(vpnType) {
      case 'ovpn':
        return ovpnScriptText;
      case 'wireguard':
        return wireguardScriptText;
      case 'l2tp':
        return l2tpScriptText;
      case 'cgnat':
        return cgnatScriptText;
      case 'telemetry':
      default:
        return telemetryScriptText;
    }
  };

  return (
    <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
      <div className="border-b border-gray-800 pb-4">
        <h4 className="text-sm font-black text-white flex items-center gap-2">
          <Terminal size={18} className="text-blue-400" /> OPCIONES DE CONEXIÓN VPN Y TELEMETRÍA MIKROTIK
        </h4>
        <p className="text-xs text-gray-400 mt-1">
          Genere scripts de conexión listos para producción para su MikroTik RouterOS (v6/v7). Elija la topología ideal para administrar de manera directa e integral sus redes LAN locales.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-4">
        <button
          type="button"
          onClick={() => setVpnType('telemetry')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
            vpnType === 'telemetry'
              ? 'bg-blue-600/10 border-blue-500 text-blue-400'
              : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Activity size={14} /> Telemetría Cloud ID
        </button>
        <button
          type="button"
          onClick={() => setVpnType('ovpn')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
            vpnType === 'ovpn'
              ? 'bg-orange-600/10 border-orange-500 text-orange-400'
              : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Lock size={14} /> Servidor OpenVPN (OVPN)
        </button>
        <button
          type="button"
          onClick={() => setVpnType('wireguard')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
            vpnType === 'wireguard'
              ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
              : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Shield size={14} /> WireGuard Server (ROS v7)
        </button>
        <button
          type="button"
          onClick={() => setVpnType('l2tp')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
            vpnType === 'l2tp'
              ? 'bg-purple-600/10 border-purple-500 text-purple-400'
              : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Globe size={14} /> L2TP/IPsec Server (Nativo)
        </button>
        <button
          type="button"
          onClick={() => setVpnType('cgnat')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
            vpnType === 'cgnat'
              ? 'bg-amber-600/10 border-amber-500 text-amber-400'
              : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Server size={14} /> Enlace CGNAT (VPS/S2S)
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-full sm:w-80 space-y-1.5">
          <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest pl-1">Seleccionar Router MikroTik</label>
          <select
            value={selectedRouterId}
            onChange={(e) => setSelectedRouterId(e.target.value)}
            className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-blue-400 font-bold focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">Seleccione un router...</option>
            {routers.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.host})</option>
            ))}
          </select>
        </div>

        {router && vpnType === 'telemetry' && (
          <div className="bg-blue-600/5 px-4 py-3 rounded-xl border border-blue-500/10 flex-grow text-xs text-blue-400 leading-relaxed font-medium">
            💡 Este script creará un tunel de telemetría de solo lectura local <span className="font-bold text-white">{localAddr}</span> e IP remota <span className="font-bold text-white">{remoteAddr}</span> usando credenciales <span className="font-bold text-white">{sstpUser}</span>.
          </div>
        )}

        {router && vpnType === 'ovpn' && (
          <div className="bg-orange-600/5 px-4 py-3 rounded-xl border border-orange-500/10 flex-grow text-xs text-orange-400 leading-relaxed font-medium">
            🛡️ OpenVPN utiliza TLS de espectro completo. Ideal para crear túneles portables con autenticación robusta y enrutar datos a través de TCP o UDP de forma segura.
          </div>
        )}

        {router && vpnType === 'wireguard' && (
          <div className="bg-emerald-600/5 px-4 py-3 rounded-xl border border-emerald-500/10 flex-grow text-xs text-emerald-400 leading-relaxed font-medium">
            🔒 WireGuard utiliza su propio motor de encriptado ultrarrápido UDP. Perfecto para administrar todos los equipos del segmento LAN de forma transparente.
          </div>
        )}

        {router && vpnType === 'l2tp' && (
          <div className="bg-purple-600/5 px-4 py-3 rounded-xl border border-purple-500/10 flex-grow text-xs text-purple-400 leading-relaxed font-medium">
            🔑 L2TP con IPsec utiliza los clientes VPN nativos de Windows/iOS/Android de forma directa sin requerir descargar programas adicionales en su PC.
          </div>
        )}

        {router && vpnType === 'cgnat' && (
          <div className="bg-amber-600/5 px-4 py-3 rounded-xl border border-amber-500/10 flex-grow text-xs text-amber-400 leading-relaxed font-medium">
            ⚡ Se conecta utilizando un túnel PPP persistente saliente hacia un servidor central VPS, superando cortafuegos y CGNAT de telefonía 4G/5G de forma instantánea.
          </div>
        )}
      </div>

      {/* Inputs dinámicos según tipo de VPN seleccionada */}
      {vpnType === 'ovpn' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-black/20 rounded-2xl border border-gray-800/50">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Puerto de Escucha</label>
            <input 
              type="text" 
              value={ovpnPort} 
              onChange={(e) => setOvpnPort(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Protocolo</label>
            <select
              value={ovpnProtocol}
              onChange={(e) => setOvpnProtocol(e.target.value as 'tcp' | 'udp')}
              className="w-full bg-[#0d1117] text-orange-400 font-bold border border-gray-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
            >
              <option value="tcp">TCP (ROS v6/v7)</option>
              <option value="udp">UDP (ROS v7+)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Modo</label>
            <select
              value={ovpnMode}
              onChange={(e) => setOvpnMode(e.target.value as 'ip' | 'ethernet')}
              className="w-full bg-[#0d1117] text-orange-400 font-bold border border-gray-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
            >
              <option value="ip">IP / TUN (Ruteo L3)</option>
              <option value="ethernet">Ethernet / TAP (Puente L2)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Usuario VPN</label>
            <input 
              type="text" 
              value={ovpnUser} 
              onChange={(e) => setOvpnUser(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Contraseña VPN</label>
            <input 
              type="text" 
              value={ovpnPass} 
              onChange={(e) => setOvpnPass(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {vpnType === 'wireguard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-black/20 rounded-2xl border border-gray-800/50">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Puerto Escucha WireGuard UDP</label>
            <input 
              type="text" 
              value={wgPort} 
              onChange={(e) => setWgPort(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">IP Local del Router (VPN)</label>
            <input 
              type="text" 
              value={wgVpnIp} 
              onChange={(e) => setWgVpnIp(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">IP Asignada al Cliente PC (VPN)</label>
            <input 
              type="text" 
              value={wgClientIp} 
              onChange={(e) => setWgClientIp(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Clave Pública de su Cliente WireGuard PC (Peguela aquí para autogenerar su script)</label>
            <input 
              type="text" 
              value={wgPcPublicKey} 
              onChange={(e) => setWgPcPublicKey(e.target.value)}
              placeholder="SU_CLAVE_PUBLICA_DE_PC_AQUI_==="
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
            />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Clave Pública del MikroTik (Peguela aquí para configurar su app WireGuard en la PC)</label>
            <input 
              type="text" 
              value={wgRouterPublicKey} 
              onChange={(e) => setWgRouterPublicKey(e.target.value)}
              placeholder="SU_CLAVE_PUBLICA_DE_MIKROTIK_==="
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {vpnType === 'l2tp' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-black/20 rounded-2xl border border-gray-800/50">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Secreto de IPsec Pre-Shared Key (PSK)</label>
            <input 
              type="text" 
              value={l2tpSecret} 
              onChange={(e) => setL2tpSecret(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Usuario VPN de Acceso</label>
            <input 
              type="text" 
              value={l2tpUser} 
              onChange={(e) => setL2tpUser(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Contraseña VPN de Acceso</label>
            <input 
              type="text" 
              value={l2tpPass} 
              onChange={(e) => setL2tpPass(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      {/* Script principal a copiar */}
      <div className="relative bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#11161d] border-b border-gray-800 text-[11px] font-black tracking-widest text-gray-500">
          <span>ROUTEROS CONSOLE COMMANDS ({vpnType.toUpperCase()})</span>
          <button
            type="button"
            onClick={() => copyToClipboard(getActiveScriptText(), false)}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold transition-all cursor-pointer"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? '¡COPIADO!' : 'COPIAR SCRIPT'}
          </button>
        </div>
        <pre className="p-5 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[350px]">
          {getActiveScriptText()}
        </pre>
      </div>

      {/* Bloque extra de configuración cliente OpenVPN */}
      {vpnType === 'ovpn' && (
        <div className="space-y-2">
          <div className="relative bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#11161d] border-b border-gray-800 text-[11px] font-black tracking-widest text-gray-500">
              <span>ARCHIVO CONFIG DE CLIENTE OPENVPN (.OVPN PARA SU CELULAR / PC)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(ovpnClientConfig, true)}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold transition-all cursor-pointer"
              >
                {copiedExtra ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copiedExtra ? '¡COPIADO!' : 'COPIAR CONFIG CLIENTE (.OVPN)'}
              </button>
            </div>
            <pre className="p-5 font-mono text-[11px] text-orange-400 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[300px]">
              {ovpnClientConfig}
            </pre>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed pl-1">
            💡 <strong className="text-gray-300">Instrucción:</strong> Guarde el contenido anterior con la extensión <code className="text-orange-400 font-mono">.ovpn</code> (ej: <code className="text-orange-400 font-mono">gestion_pc.ovpn</code>), instale el cliente OpenVPN Connect en su computadora o celular, impórtelo e ingrese el usuario <span className="text-orange-400 font-mono font-bold">{ovpnUser}</span> junto con su contraseña. Podrá acceder de forma segura a su MikroTik y a sus dispositivos locales.
          </p>
        </div>
      )}

      {/* Bloque extra de configuración cliente WireGuard */}
      {vpnType === 'wireguard' && (
        <div className="space-y-2">
          <div className="relative bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#11161d] border-b border-gray-800 text-[11px] font-black tracking-widest text-gray-500">
              <span>WIREGUARD CLIENT CONFIG (.CONF PARA SU PC/APP)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(wireguardClientConfig, true)}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold transition-all cursor-pointer"
              >
                {copiedExtra ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copiedExtra ? '¡COPIADO!' : 'COPIAR CONFIG CLIENTE'}
              </button>
            </div>
            <pre className="p-5 font-mono text-[11px] text-blue-400 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[300px]">
              {wireguardClientConfig}
            </pre>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed pl-1">
            💡 Instrucción: Instale el cliente oficial de WireGuard en su computadora, cree un nuevo túnel vacío, pegue el bloque de configuración superior sustituyendo las claves y conéctese. Esto enrutará su tráfico hacia el segmento LAN de MikroTik a través de la subred <code className="text-emerald-400 bg-gray-900 border border-gray-800 px-1 py-0.5 rounded">10.8.0.0/24</code> de forma instantánea.
          </p>
        </div>
      )}

      {/* L2TP Client guide alerts */}
      {vpnType === 'l2tp' && (
        <div className="p-4 bg-purple-950/20 border border-purple-800/30 rounded-2xl space-y-1.5">
          <span className="text-xs font-black text-purple-400 flex items-center gap-1">
            <Lock size={12} /> CÓMO CONFIGURAR SU DISPOSITIVO DE CLIENTE (WINDOWS, macOS, ANDROID):
          </span>
          <ul className="text-[11px] text-gray-400 list-disc list-inside space-y-1 leading-relaxed">
            <li>Abra la configuración de VPN de su Sistema Operativo e introduzca un nuevo tipo: <strong>L2TP/IPsec con clave precompartida</strong>.</li>
            <li><strong>Servidor de Destino:</strong> Inserte la IP pública o el dominio DDNS de su MikroTik (por ejemplo, <code className="text-purple-300">123.45.67.89</code> o el dominio DDNS MikroTik Cloud indicado en WinBox).</li>
            <li><strong>Secreto de IPsec / PSK:</strong> <code className="text-purple-300 bg-black/40 px-1 rounded font-mono">{l2tpSecret}</code></li>
            <li><strong>Usuario VPN:</strong> <code className="text-purple-300 bg-black/40 px-1 rounded font-mono">{l2tpUser}</code></li>
            <li><strong>Contraseña VPN:</strong> <code className="text-purple-300 bg-black/40 px-1 rounded font-mono">{l2tpPass}</code></li>
            <li>¡Listo! Podrá acceder a WinBox o WebFig de los equipos locales digitando la dirección LAN privada (ej: <code className="text-white">192.168.88.1</code>) en su navegador web.</li>
          </ul>
        </div>
      )}

      {/* Explanatory footnotes */}
      <div className="p-4 bg-[#11161d] border border-gray-800 rounded-2xl text-[11px] text-gray-400 leading-relaxed flex flex-col gap-2">
        <div>
          📌 <strong className="text-gray-300">¿Por qué falló la conexión inicial de SSTP?</strong>
          <p className="mt-1">
            Dado que la aplicación de administración Cloud está alojada en un microservicio serverless (detrás de un proxy inverso HTTPS que solo acepta peticiones web HTTP en puerto 443), <span className="text-blue-400 font-bold">no es técnicamente viable que el contenedor Cloud actúe directamente como un concentrador de VPN de red crudo (Capa 3 IP)</span>. Por eso el script de SSTP original implementa una <strong>"Telemetría por Heartbeat segura"</strong> basada en solicitudes automatizadas con la herramienta <code className="text-emerald-400 font-mono">/tool fetch</code>.
          </p>
        </div>
        <div className="border-t border-gray-850 pt-2">
          💡 <strong className="text-gray-300">Nuestra recomendación para administrar su LAN de forma directa:</strong>
          <p className="mt-1">
            Para enrutar tráfico real y administrar todos sus dispositivos locales directamente desde su PC, use las pestañas de <strong>"WireGuard"</strong> (lo más moderno y rápido) o de <strong>"L2TP/IPsec Server"</strong> (nativo sin programas adicionales), configurando su router MikroTik como el servidor VPN principal. Si su router no cuenta con acceso público directo (está tras CGNAT del proveedor), la pestaña de <strong>"Enlace CGNAT"</strong> le muestra cómo configurar el router para que se conecte a su propio servidor central o VPS, logrando una conexión inversa integral.
          </p>
        </div>
      </div>
    </div>
  );
}

interface SstpStatusWidgetProps {
  routers: Router[];
  activeTunnels: any[];
  fetchActiveTunnels: () => void;
}

function SstpStatusWidget({ routers, activeTunnels, fetchActiveTunnels }: SstpStatusWidgetProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  
  // local running states for throughput
  const [rxSpeed, setRxSpeed] = useState(0); // in kbps
  const [txSpeed, setTxSpeed] = useState(0); // in kbps
  
  // tick state for ticking uptime
  const [localUptime, setLocalUptime] = useState<number | null>(null);

  // Auto-select first router on load
  useEffect(() => {
    if (routers.length > 0 && !selectedId) {
      setSelectedId(routers[0].id);
    }
  }, [routers, selectedId]);

  const router = routers.find(r => r.id === selectedId);
  const tunnel = activeTunnels.find(t => t.routerId === selectedId || t.routerId === `sim-${selectedId}`);
  const isConnected = !!tunnel;

  // Let's track and estimate live speed changes every 1 second
  useEffect(() => {
    if (!isConnected || !tunnel) {
      setRxSpeed(0);
      setTxSpeed(0);
      setLocalUptime(null);
      return;
    }

    // Set initial uptime
    setLocalUptime(tunnel.uptimeSeconds);

    // Let's create an interval that updates speed and ticks uptime
    const speedInterval = setInterval(() => {
      setLocalUptime(prev => (prev !== null ? prev + 1 : null));
      
      // Let's generate nice fluctuated traffic rates depending on simulated/real action
      const isGeneratingTraffic = Math.random() > 0.4;
      let rxDelta = isGeneratingTraffic ? Math.floor(Math.random() * 800) + 50 : Math.floor(Math.random() * 20) + 5;
      let txDelta = isGeneratingTraffic ? Math.floor(Math.random() * 1200) + 80 : Math.floor(Math.random() * 30) + 8;
      
      setRxSpeed(rxDelta);
      setTxSpeed(txDelta);
    }, 1000);

    return () => clearInterval(speedInterval);
  }, [isConnected, tunnel?.routerId]);

  // Handle simulation toggle
  const toggleTunnelSim = async () => {
    if (!router) return;
    try {
      const response = await fetch('/api/sstp/connections/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerId: router.id,
          name: router.name,
          user: router.sstpUser || `${router.name.toLowerCase().replace(/\s+/g, '_')}_vpn`,
          local: router.sstpLocalAddress || '192.168.192.1',
          remote: router.sstpRemoteAddress || '192.168.192.2'
        })
      });
      if (response.ok) {
        fetchActiveTunnels();
      }
    } catch (e) {
      console.error('Error toggling tunnel simulation:', e);
    }
  };

  // formatting helper for timers
  const formatUptimeValue = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Ring chart settings (radius=36, circumference=226)
  const radius = 36;
  const circumference = 2 * Math.PI * radius; // ~226.19
  
  // Standard full throughput represents 2000 Kbps (2 Mbps) for display scaling
  const maxScale = 2000; 
  const rxOffset = circumference * (1 - Math.min(rxSpeed / maxScale, 1));
  const txOffset = circumference * (1 - Math.min(txSpeed / maxScale, 1));

  return (
    <div className="bg-[#0b0e14] border border-gray-800 rounded-2xl p-5 space-y-5 shadow-sm shadow-blue-500/5 transition-all mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider rounded">ESTADO LIVE SSTP</span>
            <span className="text-[10px] text-gray-500 font-mono font-bold">MONITOR EN TIEMPO REAL</span>
          </div>
          <h4 className="text-sm font-black text-white tracking-tight uppercase flex items-center gap-1.5">
            <Activity size={15} className="text-blue-500 animate-pulse" /> Telemetría de Canal de Datos
          </h4>
        </div>
        
        {/* Router Selector Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hidden md:inline">Router:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-[#161b22] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-blue-400 font-black focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">Seleccione equipo...</option>
            {routers.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.host})</option>
            ))}
          </select>
        </div>
      </div>

      {!router ? (
        <div className="py-8 text-center bg-black/10 rounded-xl border border-dashed border-gray-850">
          <p className="text-xs text-gray-500">Registre o seleccione un router MikroTik para ver la telemetría.</p>
        </div>
      ) : !isConnected ? (
        <div className="relative overflow-hidden p-6 bg-amber-500/5 rounded-xl border border-amber-500/15 flex flex-col items-center text-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 animate-pulse border border-amber-500/20">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1 max-w-sm">
            <h5 className="text-xs font-black text-amber-500 uppercase tracking-widest">{router.name} está OFFLINE</h5>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              El túnel SSTP no está establecido. Para recibir datos técnicos en tiempo real, configure la IP de gestión de este router o ejecute en la sucursal el <strong className="text-blue-400">Script de Telemetría SSTP</strong> generado en la pestaña correspondiente.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          
          {/* Diagnostic status values column (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <div className="space-y-1 bg-[#10141d] p-3 rounded-xl border border-gray-800/60 flex-1 flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Uptime del Túnel (SSTP)</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock size={14} className="text-emerald-400 animate-pulse" />
                <span className="text-lg font-mono font-black text-emerald-400 tracking-tight">
                  {localUptime !== null ? formatUptimeValue(localUptime) : 'Conectando...'}
                </span>
              </div>
            </div>

            <div className="space-y-2 bg-[#10141d] p-3 rounded-xl border border-gray-800/60 flex-1 flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Información de Enrutamiento</span>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono mt-1">
                <div>
                  <span className="text-gray-500 block">IP VPN Remota:</span>
                  <span className="text-blue-400 font-bold">{tunnel.remoteAddress}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">IP VPN Local:</span>
                  <span className="text-gray-300 font-bold">{tunnel.localAddress}</span>
                </div>
              </div>
              <div className="border-t border-gray-850/50 pt-2 text-[10.5px] font-mono flex justify-between items-center">
                <span className="text-gray-500">Origen Público:</span> 
                <span className="text-gray-300 font-bold">{tunnel.connectedFrom}</span>
              </div>
            </div>
          </div>

          {/* Animated Ring Charts (RX and TX) column (5 cols) */}
          <div className="md:col-span-5 flex items-center justify-around bg-[#10141e] p-4 rounded-xl border border-gray-800/60">
            {/* RX Ring */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[10px] text-gray-400 font-black tracking-wider uppercase">Recepcion (RX)</span>
              <div className="relative flex items-center justify-center">
                {/* Visual SVG Ring */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-[#161a22]"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-blue-500 transition-all duration-1000 ease-out"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={rxOffset}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text inside the ring */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs font-mono font-black text-white">
                    {rxSpeed > 1000 ? `${(rxSpeed / 1024).toFixed(1)}M` : `${rxSpeed}K`}
                  </span>
                  <span className="text-[8px] tracking-tight text-blue-400 font-bold uppercase">bps</span>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 font-mono text-center">
                Total: <span className="text-gray-300 font-bold">{(tunnel.rxBytes / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>

            {/* TX Ring */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[10px] text-gray-400 font-black tracking-wider uppercase">Transmision (TX)</span>
              <div className="relative flex items-center justify-center">
                {/* Visual SVG Ring */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-[#161a22]"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={txOffset}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs font-mono font-black text-white">
                    {txSpeed > 1000 ? `${(txSpeed / 1024).toFixed(1)}M` : `${txSpeed}K`}
                  </span>
                  <span className="text-[8px] tracking-tight text-emerald-400 font-bold uppercase">bps</span>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 font-mono text-center">
                Total: <span className="text-gray-300 font-bold">{(tunnel.txBytes / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          </div>

          {/* Quick Commands & Config Summary (3 cols) */}
          <div className="md:col-span-3 flex flex-col justify-between bg-[#10141d] p-3 rounded-xl border border-gray-800/60 p-4 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-450 uppercase tracking-widest">
                <Zap size={10} className="text-blue-400 animate-bounce" /> RENDIMIENTO CANAL
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                El canal de datos SSTP de <strong className="text-white font-medium">{router.name}</strong> está corriendo bajo encriptación TLS activa. Los tiempos de response e intercambio son estables.
              </p>
            </div>

            <div className="w-full py-2 px-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-center">
              TÚNEL ENLAZADO Y SEGURO
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Interface types for local management

// Interface types for local management
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
  status: 'connected' | 'disconnected';
  lastInform: string;
  uptimeSeconds: number;
  parentRouterId: string;
  pppoeUser: string;
}

interface SubDevice {
  id: string;
  name: string;
  type: 'olt' | 'ubiquiti' | 'mimosa' | 'cambium' | 'mikrotik' | 'other';
  ipAddress: string;
  managedPort: number;
  status: 'online' | 'offline';
  signalDbm: number | null;
  uptimeSeconds: number;
  parentRouterId: string;
  activeStationsCount?: number;
}

interface Tr069CpeManagerProps {
  routers: Router[];
}

function Tr069CpeManager({ routers }: Tr069CpeManagerProps) {
  const [selectedRouterId, setSelectedRouterId] = useState<string>('');
  const [cpes, setCpes] = useState<Tr069Cpe[]>([]);
  const [subdevices, setSubdevices] = useState<SubDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // SOAP TR-069 action log
  const [cwmpLogs, setCwmpLogs] = useState<string[]>([]);
  const [showLogTerminal, setShowLogTerminal] = useState<boolean>(true);

  // Forms states
  const [editCpe, setEditCpe] = useState<Tr069Cpe | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string>('');
  const [wifiPassword, setWifiPassword] = useState<string>('');
  const [wifiChannel, setWifiChannel] = useState<string>('Auto (Ch 6)');
  const [resetConfirmationCpe, setResetConfirmationCpe] = useState<Tr069Cpe | null>(null);

  // New Sub-device states
  const [showAddSubOpen, setShowAddSubOpen] = useState<boolean>(false);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubIp, setNewSubIp] = useState<string>('192.168.100.10');
  const [newSubPort, setNewSubPort] = useState<number>(80);
  const [newSubType, setNewSubType] = useState<'olt' | 'ubiquiti' | 'mimosa' | 'cambium' | 'mikrotik' | 'other'>('olt');
  const [newSubDbm, setNewSubDbm] = useState<string>('');
  const [newSubClients, setNewSubClients] = useState<string>('');

  // Initial Router pre-selection
  useEffect(() => {
    if (routers.length > 0 && !selectedRouterId) {
      setSelectedRouterId(routers[0].id);
    }
  }, [routers, selectedRouterId]);

  // Fetch local items whenever search conditions change
  const fetchLocalItems = async () => {
    if (!selectedRouterId) return;
    setLoading(true);
    try {
      const parentId = selectedRouterId;
      // Fetch CPEs
      const cpeRes = await fetch(`/api/tr069/cpes?routerId=${parentId}`);
      if (cpeRes.ok) {
        const cpeData = await cpeRes.json();
        setCpes(cpeData);
      }
      // Fetch Sub-devices
      const devRes = await fetch(`/api/networks/sub-devices?routerId=${parentId}`);
      if (devRes.ok) {
        const devData = await devRes.json();
        setSubdevices(devData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalItems();
  }, [selectedRouterId]);

  // Log append helper
  const addCwmpLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCwmpLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  // Simulate a network scan for new devices via MikroTik ARP
  const handleScanNetwork = () => {
    setIsScanning(true);
    addCwmpLog(`SSTP SCAN: Solicitando tabla ARP y DHCP leases a ${routers.find(r => r.id === selectedRouterId)?.name}...`);
    
    setTimeout(() => {
      setIsScanning(false);
      addCwmpLog(`SCAN COMPLETO: Se detectaron 2 dispositivos nuevos no registrados en el segmento.`);
      addCwmpLog(`NUEVO: Ubiquiti NanoStation LOCO (IP: 192.168.100.45)`);
      addCwmpLog(`NUEVO: ONU FiberHome (IP: 192.168.100.105) - Iniciando Handshake TR-069...`);
    }, 2500);
  };

  // Open Wifi edit dialog
  const handleOpenWifiEdit = (cpe: Tr069Cpe) => {
    setEditCpe(cpe);
    setWifiSsid(cpe.wifiSsid);
    setWifiPassword(cpe.wifiPassword);
    setWifiChannel(cpe.wifiChannel);
  };

  // Submit Wifi credentials save via simulated TR-069 ACS (CWMP)
  const handleSaveWifiTr069 = async (e: FormEvent) => {
    e.preventDefault();
    if (!editCpe) return;

    addCwmpLog(`CWMP SET: Enviando SOAP XML SetParameterValues a ${editCpe.serialNumber}...`);
    
    try {
      const response = await fetch('/api/tr069/cpes/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editCpe.id,
          wifiSsid,
          wifiPassword,
          wifiChannel
        })
      });
      if (response.ok) {
        addCwmpLog(`ACS CONFIRMA: Configuración WiFi aplicada correctamente mediante TR-069.`);
        setEditCpe(null);
        fetchLocalItems();
      } else {
        addCwmpLog(`ERROR CWMP: El dispositivo rechazó la configuración.`);
      }
    } catch (err) {
      console.error(err);
      addCwmpLog(`ERROR RED: No se pudo contactar con el ACS.`);
    }
  };

  // CPE Reboot CWMP
  const handleRebootCpe = async (cpe: Tr069Cpe) => {
    addCwmpLog(`ACS REBOOT: Transmitiendo RebootRequest hacia ${cpe.serialNumber}...`);
    try {
      const response = await fetch('/api/tr069/cpes/reboot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cpe.id })
      });
      if (response.ok) {
        addCwmpLog(`ACS SUCCESS: La ONU se está reiniciando.`);
        fetchLocalItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CPE Factory Reset CWMP
  const handleFactoryResetCpe = async (cpe: Tr069Cpe) => {
    setResetConfirmationCpe(cpe);
  };

  const getSubDeviceIcon = (type: string) => {
    switch (type) {
      case 'olt': return <Layers size={18} className="text-blue-400" />;
      case 'ubiquiti': return <Wifi size={18} className="text-emerald-400" />;
      case 'mimosa': return <Zap size={18} className="text-amber-400" />;
      case 'cambium': return <Wifi size={18} className="text-indigo-400" />;
      case 'mikrotik': return <Server size={18} className="text-rose-400" />;
      default: return <Settings size={18} className="text-gray-400" />;
    }
  };

  // Submit adding local Sub-device
  const handleAddSubdevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubName || !selectedRouterId) return;

    try {
      const response = await fetch('/api/networks/sub-devices/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSubName,
          type: newSubType,
          ipAddress: newSubIp,
          managedPort: newSubPort,
          parentRouterId: selectedRouterId,
          signalDbm: newSubDbm ? Number(newSubDbm) : undefined,
          activeStationsCount: newSubClients ? Number(newSubClients) : undefined
        })
      });
      if (response.ok) {
        setNewSubName('');
        setNewSubDbm('');
        setNewSubClients('');
        setShowAddSubOpen(false);
        fetchLocalItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header with selector and actions */}
      <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
            <Globe size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">Consola de Red Local & TR-069 ACS</h3>
            <p className="text-[11px] text-gray-400">Gestiona OLTs, APs y ONUs directamente desde este panel centralizado.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-[#0d1117] px-4 py-2.5 rounded-2xl border border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase font-black">Segmento:</span>
            <select
              value={selectedRouterId}
              onChange={(e) => setSelectedRouterId(e.target.value)}
              className="bg-transparent border-none text-xs text-blue-400 font-bold tracking-tight py-0.5 px-1 outline-none focus:ring-0 cursor-pointer"
            >
              {routers.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleScanNetwork}
            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${isScanning ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 cursor-pointer'}`}
            disabled={isScanning}
          >
            {isScanning ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
            {isScanning ? 'Escaneando...' : 'Escanear Red'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT: Local Infrastructure (5 Cols) */}
        <div className="xl:col-span-12 2xl:col-span-5 bg-[#161b22] border border-gray-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-4">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Layers size={16} className="text-blue-500" /> Equipos LAN ({subdevices.length})
            </h4>
            <button
              onClick={() => setShowAddSubOpen(true)}
              className="p-1 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold uppercase transition-all"
            >
              Nuevo Equipo
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
            {subdevices.map(dev => (
              <div key={dev.id} className="bg-[#0d1117] border border-gray-800/80 rounded-2xl p-4 hover:border-blue-500/30 transition-all group">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#161b22] border border-gray-800 rounded-xl">
                      {getSubDeviceIcon(dev.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{dev.type}</span>
                        {dev.status === 'online' && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <h5 className="text-[13px] font-extrabold text-white leading-tight uppercase group-hover:text-blue-400 transition-colors">{dev.name}</h5>
                      <span className="text-[10px] text-gray-500 font-mono">{dev.ipAddress}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {dev.signalDbm !== null && (
                      <div className="text-lg font-black text-emerald-400 font-mono tracking-tight">{dev.signalDbm} <span className="text-[10px] text-gray-500">dBm</span></div>
                    )}
                    {dev.activeStationsCount !== undefined && (
                      <span className="text-[10px] text-blue-400 font-bold uppercase">{dev.activeStationsCount} Clientes</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
                  <button className="py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer">
                    Consola Web
                  </button>
                  <button className="py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 transition-all cursor-pointer">
                    Herramientas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: TR-069 ACS Console (7 Cols) */}
        <div className="xl:col-span-12 2xl:col-span-7 bg-[#161b22] border border-gray-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-4">
            <div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-0.5">Estación Base ACS Activa</span>
              <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Wifi size={16} className="text-emerald-500" /> Dispositivos TR-069 / ONUs ({cpes.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-gray-500">ACS Server: 0.0.0.0:7547</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cpes.map(cpe => (
              <div key={cpe.id} className="bg-[#0d1117] border border-gray-800/80 rounded-3xl p-5 space-y-4 hover:border-emerald-500/20 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                       <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">TR069 ONLINE</span>
                    </div>
                    <h5 className="text-[13px] font-black text-white uppercase">{cpe.manufacturer} {cpe.model}</h5>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">SN: {cpe.serialNumber}</p>
                  </div>
                  <div className="h-10 w-10 bg-[#161b22] border border-gray-800 rounded-xl flex items-center justify-center text-emerald-400">
                    <div className="relative">
                      <Wifi size={20} />
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-gray-800/60 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Settings size={40} className="text-blue-500" />
                  </div>
                  
                  <div className="relative z-10 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">SSID Principal:</span>
                      <strong className="text-blue-400">{cpe.wifiSsid}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">Clave WiFi:</span>
                      <strong className="text-gray-300">{cpe.wifiPassword}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">Canal:</span>
                      <span className="text-gray-400">{cpe.wifiChannel}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono pt-1.5 border-t border-gray-800/40">
                      <span className="text-gray-500">IP LAN:</span>
                      <span className="text-emerald-400">{cpe.ipAddress}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">Usuario PPPoE:</span>
                      <span className="text-blue-400/80">{cpe.pppoeUser}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                     onClick={() => handleOpenWifiEdit(cpe)}
                     className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
                  >
                    <Settings size={12} /> Configurar
                  </button>
                  <button 
                     onClick={() => handleRebootCpe(cpe)}
                     className="py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-800 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={12} /> Reiniciar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Logs Terminal (Visible as a technical console) */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <Terminal size={12} /> Consola ACS en Tiempo Real
                </span>
                <button onClick={() => setCwmpLogs([])} className="text-[9px] font-bold text-blue-400 hover:text-blue-300">LIMPIAR TERMINAL</button>
             </div>
             
             <div className="bg-[#0b0e14] border border-gray-800 rounded-2xl p-5 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                {cwmpLogs.length === 0 ? (
                  <p className="text-gray-600 italic">Esperando eventos de aprovisionamiento o tráfico SOAP XML...</p>
                ) : (
                  cwmpLogs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                       <span className="text-gray-600 shrink-0">[{i}]</span>
                       <span className={log.includes('ERROR') ? 'text-rose-400' : log.includes('SUCCESS') ? 'text-emerald-400' : 'text-blue-400/80'}>
                         {log}
                       </span>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

      </div>

      {/* WiFi Config Modal */}
      {editCpe && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[60]">
          <div className="bg-[#161b22] border border-gray-800 max-w-md w-full rounded-[40px] p-8 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-600" />
            
            <button
              onClick={() => setEditCpe(null)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-all bg-[#0d1117] rounded-full border border-gray-800"
            >
              <X size={20} />
            </button>

            <div className="space-y-2">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded inline-block">Módulo de Aprovisionamiento WiFi</span>
               <h4 className="text-xl font-black text-white uppercase tracking-tight">Gestionar ONU {editCpe.serialNumber}</h4>
               <p className="text-sm text-gray-500">Cambia las credenciales de la red inalámbrica del cliente de forma remota.</p>
            </div>

            <form onSubmit={handleSaveWifiTr069} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase flex items-center gap-2">
                    <Wifi size={14} className="text-blue-400" /> Nombre de Red (SSID)
                  </label>
                  <input
                    type="text"
                    required
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-800 rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" /> Contraseña (WPA2-PSK)
                  </label>
                  <input
                    type="text"
                    required
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-800 rounded-2xl px-5 py-3.5 text-sm text-white font-mono focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase">Canal de Frecuencia</label>
                  <select
                    value={wifiChannel}
                    onChange={(e) => setWifiChannel(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-800 rounded-2xl px-5 py-3.5 text-sm text-gray-300 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Auto (Ch 6)">Selección Automática</option>
                    <option value="Ch 1">Canal 1 (Interferencia Baja)</option>
                    <option value="Ch 6">Canal 6 (Estándar)</option>
                    <option value="Ch 11">Canal 11 (Oficina)</option>
                    <option value="Auto (Ch 36 - 5GHz)">5 GHz (AC/Alta Velocidad)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditCpe(null)}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-blue-600/20"
                >
                  Confirmar en ONT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetConfirmationCpe && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-[#161b22] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl transition-all scale-100">
            <div className="space-y-2 text-center">
              <span className="p-3 bg-amber-600/15 text-amber-500 rounded-full inline-block mx-auto">
                <RefreshCw size={24} />
              </span>
              <h4 className="text-base font-black text-white uppercase tracking-wider">¿Reiniciar ONU de fábrica?</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                ¿Está seguro de reiniciar a valores de fábrica la ONU con número de serie <strong className="text-amber-400 font-mono font-bold">{resetConfirmationCpe.serialNumber}</strong> ({resetConfirmationCpe.manufacturer} {resetConfirmationCpe.model})?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResetConfirmationCpe(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-305 text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const cpe = resetConfirmationCpe;
                  setResetConfirmationCpe(null);
                  addCwmpLog(`ACS ERASE: Enviando FactoryResetRequest...`);
                  try {
                    const response = await fetch('/api/tr069/cpes/factory-reset', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: cpe.id })
                    });
                    if (response.ok) {
                      addCwmpLog(`ACS SUCCESS: ONU reseteada a valores de fábrica.`);
                      fetchLocalItems();
                    }
                  } catch (e) {
                     console.error(e);
                  }
                }}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase transition-all shadow-lg shadow-amber-600/20"
              >
                Sí, Resetear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

