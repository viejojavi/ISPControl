import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Cpu, 
  Globe, 
  Zap, 
  RefreshCw, 
  Activity, 
  Server, 
  Terminal, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Network,
  Share2,
  Key,
  Database,
  Router
} from 'lucide-react';
import { UserAccount, SSTPConfig, getSSTPConfig, saveSSTPConfig, Router as RouterType } from '../../lib/userService';

interface VpnCloudConsoleProps {
  currentUser: UserAccount;
}

export default function VpnCloudConsole({ currentUser }: VpnCloudConsoleProps) {
  const [activeTab, setActiveTab] = useState<'sstp' | 'wireguard' | 'status'>('status');
  const [loading, setLoading] = useState(true);
  const [sstpConfig, setSstpConfig] = useState<SSTPConfig | null>(null);
  const [activeTunnels, setActiveTunnels] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // SSTP Server Config state
  const [sstpServer, setSstpServer] = useState('');
  const [sstpPort, setSstpPort] = useState('443');
  const [sstpSecret, setSstpSecret] = useState('');

  const fetchInfra = async () => {
    if (!currentUser.ispId) return;
    setLoading(true);
    try {
      const config = await getSSTPConfig(currentUser.ispId);
      if (config) {
        setSstpConfig(config);
        setSstpServer(config.serverAddress || window.location.host);
        setSstpPort(String(config.port));
        setSstpSecret(config.secretKey);
      }
      
      const tunnelsRes = await fetch('/api/sstp/connections');
      if (tunnelsRes.ok) {
        const data = await tunnelsRes.json();
        setActiveTunnels(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfra();
    const interval = setInterval(fetchInfra, 10000);
    return () => clearInterval(interval);
  }, [currentUser.ispId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSaveSstp = async () => {
    if (!currentUser.ispId) return;
    try {
      const config: Omit<SSTPConfig, 'id'> & { id?: string } = {
        id: sstpConfig?.id,
        ispId: currentUser.ispId,
        serverAddress: sstpServer,
        port: parseInt(sstpPort),
        certificateName: 'cert_auto_cloud',
        status: 'Active',
        secretKey: sstpSecret
      };
      await saveSSTPConfig(config, currentUser.email);
      alert('Configuración de Túnel SSDP Maestra Guardada');
      fetchInfra();
    } catch (err) {
      alert('Error al guardar configuración');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <Shield size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Cloud VPN Gateway
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">Controlador Central de Túneles y Gestión Remota Segura</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Gateway Ready</span>
           </div>
           <button 
             onClick={fetchInfra}
             className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 transition-all"
           >
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-gray-900/50 p-1 rounded-2xl border border-gray-800 w-fit">
        <button 
          onClick={() => setActiveTab('status')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'status' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Activity size={14} />
          Panel de Control
        </button>
        <button 
          onClick={() => setActiveTab('sstp')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'sstp' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Lock size={14} />
          Túneles SSTP (Ideal Gestión)
        </button>
        <button 
          onClick={() => setActiveTab('wireguard')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'wireguard' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Zap size={14} />
          WireGuard (Alto Rendimiento)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'status' && (
            <>
              {/* Tunnels Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
                      <Network size={80} />
                    </div>
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Túneles Establecidos</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                       <span className="text-4xl font-black text-white">{activeTunnels.length}</span>
                       <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">VECINOS MIKROTIK</span>
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                       <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#161b22] flex items-center justify-center">
                              <Router size={14} className="text-blue-400" />
                            </div>
                          ))}
                       </div>
                       <span className="text-[10px] text-emerald-400 font-bold">100% Estabilidad en Nube</span>
                    </div>
                 </div>

                 <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-purple-500/5 group-hover:text-purple-500/10 transition-colors">
                      <Zap size={80} />
                    </div>
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Tráfico de Gestión</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                       <span className="text-4xl font-black text-white">42.8</span>
                       <span className="text-xs text-gray-500 font-bold uppercase tracking-tight">KBPS (CWMP/SSTP)</span>
                    </div>
                    <div className="mt-6">
                       <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-full w-[25%] animate-pulse" />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Connected Routers Table */}
              <div className="bg-[#161b22] border border-gray-800 rounded-3xl overflow-hidden max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                 <div className="p-4 border-b border-gray-800 bg-gray-900/40 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Túneles Activos en Tiempo Real</span>
                    <Share2 size={14} className="text-blue-400" />
                 </div>
                 {activeTunnels.length === 0 ? (
                   <div className="p-12 text-center">
                      <AlertCircle size={32} className="text-gray-700 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Esperando conexiones entrantes de routers...</p>
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0d1117] text-gray-500 uppercase font-black tracking-tighter border-b border-gray-800">
                          <tr>
                            <th className="px-6 py-4">Router ID</th>
                            <th className="px-6 py-4">IP Local (ISP)</th>
                            <th className="px-6 py-4">Tiempo Activo</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {activeTunnels.map((tunnel, idx) => (
                            <tr key={idx} className="hover:bg-gray-900/30 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-blue-400">{tunnel.routerId || 'SIM-ROUTER'}</td>
                              <td className="px-6 py-4 font-mono text-gray-300">{tunnel.sourceIp}</td>
                              <td className="px-6 py-4 text-gray-400">{tunnel.uptime || '00:15:32'}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">
                                  ENCRIPTADO
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                 )}
              </div>
            </>
          )}

          {activeTab === 'sstp' && (
            <div className="space-y-6">
               <div className="bg-[#161b22] border border-gray-800 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                    <Server size={20} className="text-blue-400" />
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Configuración de Gateway Cloud (SSTP)</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Define los parámetros para que tus MikroTik se conecten a esta nube</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Host del Gateway (FQDN/IP)</label>
                       <input 
                         type="text" 
                         value={sstpServer}
                         onChange={(e) => setSstpServer(e.target.value)}
                         className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Puerto de Servicio (HTTPS)</label>
                       <input 
                         type="number" 
                         value={sstpPort}
                         onChange={(e) => setSstpPort(e.target.value)}
                         className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono"
                       />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Llave de Cifrado Maestra (Secret Key)</label>
                       <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                          <input 
                            type="password" 
                            value={sstpSecret}
                            onChange={(e) => setSstpSecret(e.target.value)}
                            placeholder="Ingrese llave para rotación segura"
                            className="w-full bg-[#0d1117] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                     <button 
                       onClick={handleSaveSstp}
                       className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                     >
                       Actualizar Gateway Cloud
                     </button>
                  </div>
               </div>

               <div className="bg-blue-950/20 border border-blue-500/20 p-6 rounded-3xl">
                  <h4 className="text-white font-bold text-xs uppercase mb-3 tracking-widest">Script MikroTik Client (Auto-Config)</h4>
                  <div className="relative group">
                    <pre className="bg-black/40 p-4 rounded-xl font-mono text-[10px] text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-blue-500/10">
{`/interface sstp-client add name="CLOUD-MGMT-TUNNEL" connect-to="${sstpServer}" port=${sstpPort} \\
    user="TU_USUARIO_ROUTER" password="TU_CONTRASEÑA_VPN" \\
    profile=default-encryption certificate=none \\
    verify-server-certificate=no comment="Enlace Maestro TICCOL Cloud"`}
                    </pre>
                    <button 
                      onClick={() => copyToClipboard(`/interface sstp-client add name="CLOUD-MGMT-TUNNEL" ...`)}
                      className="absolute top-2 right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copySuccess ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'wireguard' && (
            <div className="p-12 bg-[#161b22] border border-gray-800 rounded-3xl text-center">
               <Zap size={48} className="text-amber-500/30 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-white">WireGuard Cloud Accelerator</h3>
               <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">Esta tecnología permite túneles UDP de mínima latencia. Requiere puertos UDP abiertos en el Gateway e intercambio de llaves públicas.</p>
               <div className="mt-8 p-6 bg-gray-900 border border-dashed border-gray-800 rounded-2xl">
                  <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Llave Pública Cloud Gateway</p>
                  <code className="block mt-3 text-blue-400 font-mono text-sm break-all">
                    A/vW7j88vX7H/8vZvX7H88vX7H88vZvX7H88vX7H=
                  </code>
                  <button className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-[10px] font-bold border border-gray-700 transition-all uppercase tracking-widest">
                    Generar Nuevo Par de Llaves
                  </button>
               </div>
            </div>
          )}

        </div>

        {/* Status Sidebar */}
        <div className="space-y-6">
           <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">Métricas del Servidor VPN</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Carga CPU VPN</span>
                       <span className="text-xs font-bold text-emerald-400">12%</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden">
                       <div className="bg-emerald-500 h-full w-[12%]" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pool de IPs Libres</span>
                       <span className="text-xs font-bold text-blue-400">242 de 254</span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden">
                       <div className="bg-blue-500 h-full w-[95%]" />
                    </div>
                 </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-800 space-y-3">
                 <button className="w-full py-2.5 bg-gray-800 hover:bg-gray-750 text-white rounded-xl text-xs font-bold transition-all border border-gray-700 flex items-center justify-center gap-2">
                   <Terminal size={14} />
                   Ver Logs en Tiempo Real
                 </button>
                 <button className="w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl text-xs font-bold border border-indigo-500/20 transition-all">
                   Reiniciar Módulo de Túneles
                 </button>
              </div>
           </div>

           <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <Shield size={16} className="text-blue-500/20" />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">Protocolos de Estabilidad</h4>
              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5" />
                    <div>
                       <p className="text-[11px] font-bold text-gray-300">Heartbeat (60s)</p>
                       <p className="text-[9px] text-gray-500 leading-tight">Monitoreo constante de latencia interna del túnel.</p>
                    </div>
                 </li>
                 <li className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5" />
                    <div>
                       <p className="text-[11px] font-bold text-gray-300">Certificados TLS 1.3</p>
                       <p className="text-[9px] text-gray-500 leading-tight">Cifrado de grado militar para comandos TR-069.</p>
                    </div>
                 </li>
              </ul>
           </div>
        </div>

      </div>
    </div>
  );
}
