import { useState, useEffect } from 'react';
import { 
  Users, 
  Server, 
  Wifi, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  CircuitBoard, 
  Cpu, 
  Database,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  UserAccount, 
  Router, 
  ISPClient, 
  Invoice,
  getISPRouters,
  getISPClients,
  getAllInvoices
} from '../../lib/userService';

interface OverviewDashboardProps {
  currentUser: UserAccount;
}

export default function OverviewDashboard({ currentUser }: OverviewDashboardProps) {
  const [routers, setRouters] = useState<Router[]>([]);
  const [clients, setClients] = useState<ISPClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Mocked trend data for "attractive graphics"
  const [netTrendData] = useState([
    { time: '00:00', load: 12 },
    { time: '04:00', load: 8 },
    { time: '08:00', load: 45 },
    { time: '12:00', load: 68 },
    { time: '16:00', load: 82 },
    { time: '20:00', load: 43 },
    { time: '23:59', load: 15 },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser.ispId) return;
      try {
        const [rRes, cRes, invRes] = await Promise.all([
          getISPRouters(currentUser.ispId),
          getISPClients(currentUser.ispId),
          getAllInvoices()
        ]);
        setRouters(rRes);
        setClients(cRes);
        setInvoices(invRes.filter(inv => inv.ispId === currentUser.ispId));
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh summary data every 30s
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser.ispId]);

  const onlineRouters = routers.filter(r => r.status === 'Online').length;
  const offlineRouters = routers.length - onlineRouters;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length; // Or logic for unpaid
  
  // router status data for pie chart
  const routerData = [
    { name: 'Online', value: onlineRouters, color: '#10b981' },
    { name: 'Offline', value: Math.max(0, offlineRouters), color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity size={32} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Generando resumen de red...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/5 p-6 rounded-3xl border border-blue-500/10">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Bienvenido al Centro de Control</h2>
          <p className="text-gray-400 text-xs mt-1">Sincronización en tiempo real de todos sus microservicios e infraestructura.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sistemas OK</span>
          </div>
          <div className="px-4 py-2 bg-gray-900/60 border border-gray-800 rounded-xl flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <span className="text-[10px] font-mono text-gray-300">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Nodos Online" 
          value={routers.length > 0 ? `${onlineRouters} / ${routers.length}` : '0'} 
          icon={<Server size={18} />} 
          color="blue"
          trend="+2.5%"
          isUp={true}
        />
        <StatsCard 
          title="Terminales Activas" 
          value={activeClients.toString()} 
          icon={<Users size={18} />} 
          color="emerald"
          trend="+12"
          isUp={true}
        />
        <StatsCard 
          title="Carga de Red" 
          value="42%" 
          icon={<Activity size={18} />} 
          color="amber"
          trend="Estable"
          isUp={null}
        />
        <StatsCard 
          title="Cartera Pendiente" 
          value={`$${(invoices.length * 45000).toLocaleString()}`} // Mocked sum for example
          icon={<CreditCard size={18} />} 
          color="rose"
          trend="3 Facturas"
          isUp={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Network Load Trend */}
        <div className="lg:col-span-2 bg-[#161b22] border border-gray-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" />
                Carga del Sistema (CPU/Red)
              </h3>
              <p className="text-[10px] text-gray-500 mt-1 uppercase">Promedio histórico de las últimas 24 horas</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2 h-2 bg-blue-500 rounded-full" /> Load Avg
              </div>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netTrendData}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#4b5563" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="load" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorLoad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Router Status Distro */}
        <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Estado de Nodos</h3>
          <p className="text-[10px] text-gray-500 uppercase mb-8">Disponibilidad de infraestructura</p>
          
          <div className="flex-1 flex flex-col items-center justify-center py-4">
             <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={routerData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {routerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Stats in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-white">{((onlineRouters / (routers.length || 1)) * 100).toFixed(0)}%</span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Up-time</span>
                </div>
             </div>

             <div className="mt-8 grid grid-cols-2 gap-4 w-full px-4">
                <div className="p-3 bg-gray-900/40 rounded-2xl border border-emerald-500/10">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Online</p>
                  <p className="text-lg font-black text-emerald-400">{onlineRouters}</p>
                </div>
                <div className="p-3 bg-gray-900/40 rounded-2xl border border-rose-500/10">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Offline</p>
                  <p className="text-lg font-black text-rose-400">{offlineRouters}</p>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Microservices & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Active Clients List Preview or Service Status */}
        <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-blue-400" />
                Clientes Recientes
              </h3>
              <button className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">
                Ver todos
              </button>
           </div>
           
           <div className="space-y-3">
              {clients.slice(0, 4).map(client => (
                <div key={client.id} className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-800 rounded-2xl hover:bg-gray-800/60 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{client.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{client.ipAddress}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${client.status === 'Active' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {client.status === 'Active' ? 'Live' : 'Off'}
                  </span>
                </div>
              ))}
              {clients.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-6 italic">No hay clientes activos en este momento.</p>
              )}
           </div>
        </div>

        {/* System Logs / Alerts */}
        <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6">
           <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
             <CircuitBoard size={16} className="text-blue-400" />
             Microservicios NMS
           </h3>
           
           <div className="grid grid-cols-2 gap-4">
              <ServiceStatus name="MikroTik API" status="online" delay="12ms" />
              <ServiceStatus name="SNMP Engine" status="online" delay="45ms" />
              <ServiceStatus name="SSTP Gateway" status="warning" delay="310ms" />
              <ServiceStatus name="Billing API" status="online" delay="22ms" />
              <ServiceStatus name="Auth Service" status="online" delay="8ms" />
              <ServiceStatus name="DB Instance" status="online" delay="5ms" />
           </div>

           <div className="mt-8 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Sugerencia de Optimización</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                El router Principal-Edge está operando al 82% de su capacidad nominal. Considere balancear el tráfico de los clientes de la Subred 10.0.0.0/24.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color, trend, isUp }: any) {
  const colors: any = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5',
  };

  return (
    <div className={`bg-[#161b22] border border-gray-800 p-5 rounded-3xl shadow-xl hover:border-gray-700 transition-all group overflow-hidden relative`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl border ${colors[color]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && (
           <div className={`flex items-center gap-1 text-[10px] font-bold ${isUp === true ? 'text-emerald-400' : isUp === false ? 'text-rose-400' : 'text-gray-500'}`}>
             {isUp === true ? <ArrowUpRight size={10} /> : isUp === false ? <ArrowDownRight size={10} /> : null}
             {trend}
           </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-black text-white">{value}</p>
      </div>
      
      {/* Background visual accent */}
      <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-white/5 rounded-full blur-xl pointer-events-none group-hover:bg-white/10 transition-colors" />
    </div>
  );
}

function ServiceStatus({ name, status, delay }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/40 border border-gray-850 rounded-xl">
      <div>
        <p className="text-[10px] font-bold text-gray-300 truncate">{name}</p>
        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{delay}</p>
      </div>
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
    </div>
  );
}
