import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  UserPlus, 
  Database, 
  Wifi, 
  FileText, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  LogOut, 
  CheckCircle, 
  RefreshCw, 
  Search, 
  X, 
  Menu,
  TrendingUp, 
  CreditCard,
  UserCheck,
  Building,
  Server,
  Globe,
  Lock,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserAccount, 
  ISP, 
  ISPPlan, 
  ISPClient, 
  Invoice, 
  getAllISPs, 
  getAllPlans, 
  getISPClients, 
  getAllInvoices,
  getSystemConfig,
  DEFAULT_PLANS,
  getISPRouters,
  Router
} from '../../lib/userService';
import RouterManagement from './RouterManagement';
import OverviewDashboard from './OverviewDashboard';
import ClientManagement from './ClientManagement';
import GeneralSettings from './GeneralSettings';
import PlanManagement from './PlanManagement';
import Tr069Management from './Tr069Management';
import VpnCloudConsole from './VpnCloudConsole';
import { LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';

interface ISPWorkspaceProps {
  currentUser: UserAccount;
  onLogout: () => void;
}

export default function ISPWorkspace({ currentUser, onLogout }: ISPWorkspaceProps) {
  const [ispInfo, setIspInfo] = useState<ISP | null>(null);
  const [trm, setTrm] = useState<number>(4000);
  const [planInfo, setPlanInfo] = useState<ISPPlan | null>(null);
  const [clients, setClients] = useState<ISPClient[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'billing' | 'database' | 'infrastructure' | 'settings' | 'plans' | 'tr069' | 'vpn'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({
    message: '',
    type: null
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev.message === message ? { message: '', type: null } : prev);
    }, 6000);
  };

  const loadISPData = async () => {
    if (!currentUser.ispId) return;
    setLoading(true);
    try {
      const isps = await getAllISPs();
      const currentIsp = isps.find(i => i.id === currentUser.ispId);
      
      if (currentIsp) {
        setIspInfo(currentIsp);
        
        // Fetch config for TRM
        const config = await getSystemConfig();
        setTrm(config.trm);
        
        // Fetch plans to map limit
        const plans = await getAllPlans();
        const plan = plans.find(p => p.id === currentIsp.planId) 
          || DEFAULT_PLANS.find(p => p.id === currentIsp.planId)
          || (plans.length > 0 ? plans[0] : DEFAULT_PLANS[0]);
        if (plan) {
          setPlanInfo(plan);
        }

        // Fetch this ISP's client ledger
        const clientsList = await getISPClients(currentUser.ispId);
        setClients(clientsList);

        // Fetch routers
        const routersList = await getISPRouters(currentUser.ispId);
        setRouters(routersList);

        // Fetch corresponding invoice ledger
        const allInvoices = await getAllInvoices();
        const myInvoices = allInvoices.filter(inv => inv.ispId === currentUser.ispId);
        setInvoices(myInvoices.sort((a,b) => new Date(b.billingDate).getTime() - new Date(a.billingDate).getTime()));
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Error al recuperar registros de base de datos de este ISP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadISPData();
  }, [currentUser.ispId]);

  // Lock interaction if ISP is Suspended
  if (ispInfo && ispInfo.status === 'Suspended') {
    return (
      <div className="min-h-screen bg-[#070a0e] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-[#161b22] border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative"
        >
          <div className="absolute inset-x-0 -top-12 flex justify-center">
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl shadow-xl">
              <AlertTriangle size={36} className="animate-bounce" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-wide mt-6">Acceso Suspendido</h1>
          <p className="text-gray-400 text-sm mt-3 leading-relaxed">
            La plataforma del ISP <span className="text-white font-semibold">"{ispInfo.name}"</span> ha sido inactivada o suspendida temporalmente por la dirección técnica de SuperAdmin.
          </p>

          <div className="my-6 p-4 bg-red-950/20 border border-red-500/10 text-red-300 rounded-xl text-xs text-left">
            <p className="font-semibold mb-1">Causales posibles:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Mora o cobro mensual pendiente de facturar.</li>
              <li>Actualización de políticas internas del sistema.</li>
              <li>Excesos técnicos en la tasa de consumo de clientes.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
            <button
              onClick={loadISPData}
              disabled={loading}
              className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col md:flex-row font-sans relative overflow-hidden">
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#161b22] border-r border-gray-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Wifi size={22} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white truncate tracking-wide">
                  {ispInfo ? ispInfo.name : 'Cargando ISP...'}
                </h1>
                <p className="text-[10px] text-emerald-450 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  Terminal Activa
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Connected User Badge */}
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/40 text-xs">
            <span className="text-gray-500 block uppercase tracking-wider font-semibold">Administrador ISP</span>
            <span className="text-gray-200 block font-semibold truncate mt-1">{currentUser.name || currentUser.email}</span>
            <span className="inline-block mt-2 font-mono text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded uppercase">
              {planInfo ? planInfo.name : 'Consultando Plan...'}
            </span>
          </div>

          {/* ISP Tabs */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setActiveTab('overview');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'overview' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('clients');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'clients' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Users size={17} />
              <span>Clientes de Internet</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('billing');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'billing' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <CreditCard size={17} />
              <span>Estado de Cuenta</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('database');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'database' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Database size={17} />
              <span>Instancia de BD</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('infrastructure');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'infrastructure' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Server size={17} />
              <span>Gestión de Routers</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tr069');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'tr069' 
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Globe size={17} />
              <span>Gestión TR-069 ACS</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vpn');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'vpn' 
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Shield size={17} />
              <span>Cloud VPN Gateway</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('plans');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'plans' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Wifi size={17} />
              <span>Planes de Internet</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <SettingsIcon size={17} />
              <span>Configuración Portal</span>
            </button>
          </nav>
        </div>

        {/* Exit */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-450 hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            <LogOut size={17} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Workspace core */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Dynamic header navigation banner */}
        <header className="p-6 bg-[#161b22] border-b border-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-gray-400 hover:text-white lg:hidden -ml-2"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Building size={18} className="text-blue-400" />
              {activeTab === 'overview' && 'Panel de Resumen Operativo'}
              {activeTab === 'clients' && 'Aprovisionamiento de Clientes de Internet'}
              {activeTab === 'billing' && 'Trazabilidad y Control Facturación'}
              {activeTab === 'database' && 'Instancia y Partición de Base de Datos Única'}
              {activeTab === 'infrastructure' && 'Gestión de Routers MikroTik'}
              {activeTab === 'tr069' && 'Aprovisionamiento Remoto de ONUs (TR-069)'}
              {activeTab === 'vpn' && 'Consola Maestra de Túneles VPN'}
              {activeTab === 'settings' && 'Configuración General del Portal ISP'}
            </h2>
            <p className="text-xs text-gray-405 mt-1">
              {activeTab === 'overview' && 'Consolidado de métricas en tiempo real, estado de red y alertas críticas.'}
              {activeTab === 'clients' && 'Gestiones de ancho de banda contratado, direccionamiento IP interno e historial de altas.'}
              {activeTab === 'billing' && 'Estado de pago, facturas vigentes para el servicio del ISP y recurrencia de cobro.'}
              {activeTab === 'database' && 'Configuración de partición física simulada y esquemas de persistencia.'}
              {activeTab === 'infrastructure' && 'Control centralizado de nodos, API MikroTik y Túneles SSTP para monitoreo.'}
              {activeTab === 'tr069' && 'Control total de terminales fibra óptica mediante protocolos XML/SOAP y CWMP.'}
              {activeTab === 'vpn' && 'Gestión de seguridad perimetral, túneles redundantes y acceso remoto cifrado.'}
              {activeTab === 'settings' && 'Parámetros regionales, microservicios geográficos y personalización técnica del sistema.'}
            </p>
          </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full lg:w-auto self-stretch lg:self-center">
            {planInfo && (
              <div className="flex items-center justify-between sm:justify-start gap-4 bg-[#0d1117]/80 border border-gray-800/80 px-4 py-2 rounded-xl text-xs flex-1 sm:flex-initial">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-gray-500 gap-6">
                    <span>Consumo de Clientes:</span>
                    <span className="font-mono text-blue-400 font-extrabold">{clients.length} / {planInfo.maxClients}</span>
                  </div>
                  <div className="w-full sm:w-28 bg-gray-900 h-1 rounded-full overflow-hidden border border-gray-850">
                    <div 
                      className={`h-full rounded-full transition-all duration-550 ${
                        (clients.length / planInfo.maxClients) > 0.9 
                          ? 'bg-rose-500' 
                          : (clients.length / planInfo.maxClients) > 0.7 
                          ? 'bg-amber-500' 
                          : 'bg-blue-500'
                      }`} 
                      style={{ width: `${Math.min(100, (clients.length / planInfo.maxClients) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end border-l border-gray-800/65 pl-3.5 shrink-0">
                  <span className="text-[11px] font-extrabold text-white">
                    {((clients.length / planInfo.maxClients) * 100).toFixed(0)}%
                  </span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wide">Cuota</span>
                </div>
              </div>
            )}

            <button
              onClick={loadISPData}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-semibold cursor-pointer text-gray-300 transition-all disabled:opacity-50 shrink-0 h-[42px] sm:h-auto"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>Sincronizar</span>
            </button>
          </div>
        </header>

        {/* Main Work space panel */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Toast dynamic responses */}
          <AnimatePresence>
            {notification.type && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-xl flex items-start gap-3 border ${
                  notification.type === 'success' 
                    ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20' 
                    : 'bg-rose-950/30 text-rose-300 border-rose-500/20'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={17} />
                ) : (
                  <AlertTriangle className="text-rose-450 shrink-0 mt-0.5" size={17} />
                )}
                <span className="text-sm font-medium">{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plan Quotas Indicator Grid */}
          {planInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Client quota meter */}
              <div className="bg-[#161b22] border border-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-blue-500/10 pointer-events-none">
                  <Database size={80} />
                </div>
                
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Límite de Clientes</h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-white">{clients.length}</span>
                  <span className="text-sm text-gray-500">/ de {planInfo.maxClients} permitidos</span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="w-full bg-[#0d1117] rounded-full h-2 overflow-hidden border border-gray-800/60">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (clients.length / planInfo.maxClients) > 0.9 
                          ? 'bg-rose-500' 
                          : (clients.length / planInfo.maxClients) > 0.7 
                          ? 'bg-amber-500' 
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (clients.length / planInfo.maxClients) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-450 mt-2 font-mono">
                    <span>ISP Capacidad Utilizada</span>
                    <span>{( (clients.length / planInfo.maxClients) * 100 ).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Bandwidth distribution metrics */}
              <div className="bg-[#161b22] border border-gray-800 p-5 rounded-2xl shadow-lg">
                <h3 className="text-xs text-gray-505 font-bold uppercase tracking-wider">Distribución de Canales</h3>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-[#0d1117] p-2.5 rounded-lg border border-gray-850/60 text-center">
                    <p className="text-gray-505">Activos</p>
                    <p className="text-md font-bold text-emerald-450 mt-1">{clients.filter(c => c.status === 'Active').length}</p>
                  </div>
                  <div className="bg-[#0d1117] p-2.5 rounded-lg border border-gray-850/60 text-center">
                    <p className="text-gray-505">Inactivos</p>
                    <p className="text-md font-bold text-gray-300 mt-1">{clients.filter(c => c.status === 'Inactive').length}</p>
                  </div>
                </div>
              </div>

              {/* Next billing calendar */}
              <div className="bg-[#161b22] border border-gray-800 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-xs text-gray-505 font-bold uppercase tracking-wider">Próximo Vencimiento</h3>
                  <p className="text-lg font-bold text-white mt-1.5 font-sans">
                    {ispInfo ? new Date(ispInfo.nextBillingDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                  </p>
                </div>
                <div className="text-[10px] text-gray-450 mt-3 border-t border-gray-800 pt-2 flex justify-between items-center">
                  <span>Modo de Facturación:</span>
                  <span className="font-semibold text-blue-450 bg-blue-950/20 px-2 py-0.5 rounded border border-blue-500/10">
                    {ispInfo?.billingType === 'Recurring' ? 'Mensual Recurrente' : 'Prepago Manual'}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Active Work Area Panel */}
          <div className={`${activeTab === 'overview' ? '' : 'bg-[#161b22] border border-gray-800 rounded-2xl shadow-xl overflow-hidden'}`}>
            
            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <OverviewDashboard currentUser={currentUser} />
            )}

            {/* Tab: Client Panel */}
            {activeTab === 'clients' && (
              <div className="p-6">
                <ClientManagement 
                  currentUser={currentUser}
                  ispInfo={ispInfo}
                  planInfo={planInfo}
                  onNotification={showNotification}
                />
              </div>
            )}

            {/* Tab: Billing State and Ledger */}
            {activeTab === 'billing' && (
              <div className="p-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6 bg-[#1f242c]/10 p-4 rounded-xl border border-gray-800">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detalles de Costo de Licencia</h3>
                    <p className="text-xs text-gray-400 mt-1">Consulte los cargos y facturas emitidas por concepto de uso de terminal.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Tarifa Mensual Contratada</p>
                    <p className="text-lg font-bold text-emerald-400">${planInfo?.priceMonthly} COP <span className="text-xs text-gray-500 font-normal">(${( (planInfo?.priceMonthly || 0) / trm).toFixed(2)} USD)</span></p>
                  </div>
                </div>

                {/* Invoices List */}
                {loading ? (
                  <div className="p-6 text-center text-gray-400">Cargando bitácora de caja...</div>
                ) : invoices.length === 0 ? (
                  <div className="p-8 text-center bg-gray-900/10 rounded-xl border border-gray-800">
                    <FileText className="mx-auto text-gray-600 mb-2" size={28} />
                    <p className="text-xs text-gray-400">No se registran facturas emitidas en esta cuenta todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest text-gray-400 mb-3">Historial de Transacciones</h4>
                    {invoices.map((inv) => (
                      <div key={inv.id} className="p-4 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-800 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg shrink-0 text-center font-mono text-[10px] uppercase font-bold border border-blue-500/10">
                            Inv
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-white">Adquisición / Licencia - {inv.planName}</p>
                            <p className="text-[10px] text-gray-450 mt-1 font-mono">ID Factura: {inv.id} • Modalidad: {inv.billingType === 'Recurring' ? 'Recurrente Automática' : 'Facturación Prepaga'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-850 pt-2 sm:pt-0">
                          <div>
                            <p className="text-[10px] text-gray-500 text-right">Fecha de Emisión</p>
                            <p className="text-xs text-gray-300 text-right mt-0.5 font-mono">{new Date(inv.billingDate).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono text-gray-450 mr-4">Monto: <strong className="text-white">${inv.amount}</strong></span>
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/10">
                              Pagado
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: DB Isolation Details */}
            {activeTab === 'database' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Esquema Físico de Base de Datos</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Este sistema utiliza nuestro framework de **Aislamiento Multitenant**. Toda la información de tus clientes y registros de consumo de internet se persiste de manera aislada en base de datos bajo el sufijo único de tu ISP:
                  </p>

                  <div className="p-5 bg-gray-900/60 border border-gray-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] text-gray-550 block uppercase tracking-wider font-semibold">Identificador de Instancia</span>
                      <code className="text-sm font-semibold font-mono text-blue-400 mt-1 block">
                        {ispInfo ? ispInfo.customDatabaseSuffix : 'Resolviendo sufijo...'}
                      </code>
                    </div>

                    <div className="bg-[#12161f] px-4 py-2 rounded-xl border border-gray-800 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-450 animate-pulse" />
                      <span className="text-[11px] font-mono text-gray-400">Ruta de colección: <code>/isp_clients</code> [Partition key: <code>ispId={ispInfo?.id}</code>]</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-950/20 border border-blue-500/15 p-5 rounded-2xl flex items-start gap-3">
                  <Wifi className="text-blue-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">Políticas de Tráfico e IP Fija</h4>
                    <p className="text-xs text-gray-400 mt-1leading-relaxed">
                      La red de internet y direccionamiento se simula con los parámetros físicos de tu ISP. Cada registro de cliente que provisionas genera un mapeo técnico simulado que asocia las subredes IP al ancho de banda contratado. El uso excesivo o el intento de sobrepasar la cuota del plan bloqueará el router de aprovisionamiento de manera preventiva.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Infrastructure / Routers */}
            {activeTab === 'infrastructure' && (
              <div className="p-6">
                <RouterManagement 
                  currentUser={currentUser} 
                  onNotification={showNotification}
                />
              </div>
            )}

            {/* Tab: TR-069 Microservice */}
            {activeTab === 'tr069' && (
              <div className="p-6">
                <Tr069Management currentUser={currentUser} />
              </div>
            )}

            {/* Tab: VPN Cloud Microservice */}
            {activeTab === 'vpn' && (
              <div className="p-6">
                <VpnCloudConsole currentUser={currentUser} />
              </div>
            )}

            {/* Tab: Plans Management */}
            {activeTab === 'plans' && (
              <div className="p-6">
                <PlanManagement 
                  ispInfo={ispInfo}
                  routers={routers}
                  onNotification={showNotification}
                />
              </div>
            )}

            {/* Tab: General Settings */}
            {activeTab === 'settings' && (
              <div className="p-6">
                <GeneralSettings 
                  ispInfo={ispInfo} 
                  onNotification={showNotification}
                  onRefresh={loadISPData}
                />
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
