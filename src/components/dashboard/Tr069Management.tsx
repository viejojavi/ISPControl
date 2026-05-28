import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Settings, 
  Terminal, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  Network,
  Zap,
  Activity,
  ChevronRight,
  Database,
  CloudLightning,
  AlertTriangle,
  Play,
  Monitor,
  Wifi
} from 'lucide-react';
import { UserAccount } from '../../lib/userService';

interface Tr069ManagementProps {
  currentUser: UserAccount;
}

export default function Tr069Management({ currentUser }: Tr069ManagementProps) {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'provisioning' | 'logs'>('monitoring');
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for ONUs
  const [onus] = useState([
    { id: 'ONU001', sn: 'HWTC12345678', model: 'HG8245H', status: 'Online', ip: '10.50.0.12', uptime: '12d 4h', pppoe: 'user_client_01', signal: '-18.5dBm' },
    { id: 'ONU002', sn: 'ZTEG98765432', model: 'F660', status: 'Online', ip: '10.50.0.45', uptime: '3d 21h', pppoe: 'user_client_02', signal: '-22.1dBm' },
    { id: 'ONU003', sn: 'VSOL11223344', model: 'V2801RG', status: 'Offline', ip: '---', uptime: '---', pppoe: 'user_client_03', signal: '---' },
  ]);

  const filteredOnus = onus.filter(o => 
    o.sn.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.pppoe.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Microservice */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow-lg shadow-purple-500/5">
            <Globe size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Microservicio TR-069 ACS
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">Gestión de Aprovisionamiento Automático (CWMP) para ONUs y CPEs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text"
              placeholder="Buscar por SN o Usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:border-purple-500/50 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setIsScanning(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            Escanear
          </button>
        </div>
      </div>

      {/* Tabs Microservice */}
      <div className="flex bg-gray-900/50 p-1 rounded-2xl border border-gray-800 w-fit">
        <button 
          onClick={() => setActiveTab('monitoring')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'monitoring' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Monitor size={14} />
          Monitoreo en Vivo
        </button>
        <button 
          onClick={() => setActiveTab('provisioning')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'provisioning' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Zap size={14} />
          Aprovisionamiento
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Database size={14} />
          Logs de Eventos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'monitoring' && (
            <div className="bg-[#161b22] border border-gray-800 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-gray-900/40 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dispositivos bajo TR-069 ({onus.length})</span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  ACS Server Listening: Port 7547
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-[#0d1117] text-gray-500 uppercase font-black tracking-tighter border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-4">SN / ID</th>
                      <th className="px-6 py-4">Modelo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Potencia</th>
                      <th className="px-6 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredOnus.map((onu) => (
                      <tr key={onu.id} className="hover:bg-gray-900/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-purple-400 font-bold">{onu.sn}</span>
                            <span className="text-[10px] text-gray-500">ID: {onu.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-300">{onu.model}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${onu.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className={onu.status === 'Online' ? 'text-emerald-400' : 'text-rose-400'}>{onu.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`font-mono font-bold ${onu.status === 'Online' ? 'text-blue-400' : 'text-gray-600'}`}>{onu.signal}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-all">
                              <Settings size={14} />
                            </button>
                            <button className="p-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/20 transition-all">
                              <Activity size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'provisioning' && (
            <div className="p-8 bg-[#161b22] border border-gray-800 rounded-3xl text-center">
               <CloudLightning size={48} className="text-purple-500/30 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-white">Centro de Aprovisionamiento</h3>
               <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">Configure perfiles TR-069 para que las ONUs se autoconfiguren al conectarse a la red mediante el parámetro "URL de ACS".</p>
               <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-purple-500/30 transition-all cursor-pointer">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg w-fit mb-3">
                      <Network size={20} />
                    </div>
                    <h4 className="text-white font-bold text-sm">Configurar PPPoE Automático</h4>
                    <p className="text-gray-500 text-[11px] mt-1">Inyecta credenciales PPPoE remotamente a la ONU.</p>
                  </div>
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-purple-500/30 transition-all cursor-pointer">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg w-fit mb-3">
                      <Wifi size={20} />
                    </div>
                    <h4 className="text-white font-bold text-sm">Gestión de WiFi Remote</h4>
                    <p className="text-gray-500 text-[11px] mt-1">Cambio de SSID y Contraseña via CWMP.</p>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-gray-950/50 border border-gray-800 rounded-3xl p-6 font-mono text-[11px] text-gray-400 space-y-1">
               <p><span className="text-purple-500">[SYSTEM]</span> ACS Service Started on port 7547...</p>
               <p><span className="text-blue-500">[TR069]</span> Waiting for Inform requests from CPEs...</p>
               <p><span className="text-emerald-500">[HTTP]</span> Status check: HTTP 200 OK for /acs endpoint.</p>
               <p><span className="text-gray-600">[22:42:01]</span> Incoming session from HWTC12345678 (10.50.0.12)</p>
               <p><span className="text-gray-600">[22:42:02]</span> Inform: Event: 0 BOOTSTRAP, 1 BOOT, 2 PERIODIC</p>
               <p><span className="text-gray-600">[22:42:04]</span> Provisioning script applied: HG8245H_STND_V1</p>
               <p><span className="text-indigo-500">[INFO]</span> Session closed for HWTC12345678.</p>
            </div>
          )}
        </div>

        {/* Sidebar microservice details */}
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">Métricas de Servicio ACS</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Sesiones Activas</span>
                <span className="text-sm font-bold text-purple-400">12</span>
              </div>
              <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[45%]" />
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">Carga del Proceso</span>
                <span className="text-sm font-bold text-blue-400">8%</span>
              </div>
              <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[15%]" />
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-800">
               <button className="w-full py-2.5 bg-gray-800 hover:bg-gray-750 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-gray-700">
                 <Terminal size={14} />
                 Terminal de Comandos ACS
               </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group">
            <CloudLightning className="absolute -right-4 -bottom-4 text-purple-500/10 group-hover:scale-125 transition-transform duration-700" size={120} />
            <h4 className="text-white font-bold text-sm mb-2">Integración MikroTik TR-069</h4>
            <p className="text-xs text-gray-400 leading-relaxed relative z-10">
              Utilice el cliente TR-069 del MikroTik para que este actue como Proxy hacia las ONUs, permitiendo gestión directa de terminales fibra desde esta nube.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 relative z-10">
               <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] font-bold rounded uppercase border border-purple-500/20">CWMP Client</span>
               <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded uppercase border border-blue-500/20">XML/SOAP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
