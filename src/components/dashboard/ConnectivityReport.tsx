import { useState } from 'react';
import { Wifi, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Router } from '../../lib/userService';

interface ConnectivityReportProps {
  routers: Router[];
}

export default function ConnectivityReport({ routers }: ConnectivityReportProps) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTest = async (router: Router) => {
    setLoading(prev => ({ ...prev, [router.id]: true }));
    try {
      const response = await fetch('/api/mikrotik/connectivity-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          routerIp: router.host, 
          routerPort: router.apiPort, 
          user: router.apiUser, 
          password: router.apiPassword 
        }),
      });
      const data = await response.json();
      setResults(prev => ({ ...prev, [router.id]: data }));
    } catch (e) {
      setResults(prev => ({ ...prev, [router.id]: { error: 'Falló la prueba' } }));
    } finally {
      setLoading(prev => ({ ...prev, [router.id]: false }));
    }
  };

  const runAllTests = async () => {
    for (const router of routers) {
      await runTest(router);
    }
  };

  return (
    <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Wifi size={16} className="text-emerald-400" />
          Estado de Conectividad a Internet
        </h3>
        <button 
          onClick={runAllTests}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 text-xs"
        >
          <RotateCcw size={14} />
          Ejecutar Prueba Total
        </button>
      </div>

      <div className="space-y-4">
        {routers.map(router => (
          <div key={router.id} className="p-4 bg-gray-900/40 border border-gray-800 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">{router.name}</p>
              <p className="text-[10px] text-gray-500 font-mono">{router.host}</p>
            </div>
            
            <div className="flex gap-4 items-center">
              {loading[router.id] && <p className="text-[10px] text-blue-400 uppercase font-bold">Probando...</p>}
              {!loading[router.id] && results[router.id] && (
                <div className="flex flex-col gap-2">
                   {results[router.id].error ? (
                     <div className="text-rose-400 text-[10px] break-words w-48">{results[router.id].error}</div>
                   ) : typeof results[router.id] === 'object' ? Object.entries(results[router.id]).map(([target, res]: [string, any]) => {
                     const statusColor = res.avg > 40 ? 'text-rose-500' : (res.avg > 20 ? 'text-amber-500' : 'text-emerald-400');
                     return (
                        <div key={target} className="flex items-center justify-between gap-4 text-[10px]">
                           <span className="text-gray-400 truncate w-16">{target}</span>
                           <span className={`${statusColor} font-bold`}>{res.avg?.toFixed(1) ?? 'N/A'}ms</span>
                           <span className="text-gray-500">J: {res.jitter?.toFixed(1) ?? 'N/A'}ms</span>
                        </div>
                     );
                   }) : <div className="text-gray-500 text-[10px]">No hay datos</div>}
                </div>
              )}
              <button 
                onClick={() => runTest(router)}
                disabled={loading[router.id]}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[10px] uppercase font-bold"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
