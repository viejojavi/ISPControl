import React, { useState } from 'react';
import { Server, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { DiscoveredDevice, getMonitoredDevices, saveDiscoveredDevice } from '../../lib/userService';

interface NetworkMonitoringProps {
  ispId: string;
  router: any; // Router interface
}

export const NetworkMonitoring: React.FC<NetworkMonitoringProps> = ({ ispId, router }) => {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDiscovery = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/network/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerIp: router.host, user: router.apiUser, password: router.apiPassword }),
      });
      const data = await response.json();
      
      const newDevices: DiscoveredDevice[] = data.map((d: any) => ({
        ...d,
        ispId,
        routerId: router.id,
        lastDiscovered: new Date().toISOString(),
        type: 'Neighbor'
      }));

      for (const dev of newDevices) {
        await saveDiscoveredDevice(dev);
      }
      setDevices(newDevices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectivityTest = async () => {
    setLoading(true);
    setPingResult('Ejecutando prueba de conectividad, por favor espere...');
    try {
      const response = await fetch('/api/mikrotik/connectivity-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerIp: router.host, routerPort: router.apiPort, user: router.apiUser, password: router.apiPassword }),
      });
      const data = await response.json();
      setPingResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setPingResult('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [pingResult, setPingResult] = useState('');

  return (
    <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-black text-white tracking-tight">Descubrimiento de Red</h3>
         <button 
           onClick={handleDiscovery}
           disabled={loading}
           className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
         >
           {loading ? <RefreshCw className="animate-spin" size={14} /> : <Server size={14} />}
           {loading ? 'Escaneando...' : 'Iniciar Escaneo'}
         </button>
      </div>

      <div className="flex gap-2 text-xs">
          <button 
            onClick={handleConnectivityTest}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all"
          >
            {loading ? 'Probando...' : 'Ejecutar Prueba de Conectividad (Internet)'}
          </button>
      </div>
      
      {pingResult && (
        <pre className="text-[10px] text-gray-400 bg-black p-2 rounded-md overflow-x-auto">
          {pingResult}
        </pre>
      )}

      <div className="space-y-2">
         {devices.map(d => (
           <div key={d.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800">
             <div className="flex items-center gap-3">
               {d.status === 'Online' ? <CheckCircle className="text-emerald-500" size={16} /> : <AlertCircle className="text-rose-500" size={16} />}
               <span className="text-sm font-medium text-white">{d.hostname || d.ipAddress}</span>
             </div>
             <span className="text-xs text-gray-500">{d.ipAddress}</span>
           </div>
         ))}
      </div>
    </div>
  );
};
