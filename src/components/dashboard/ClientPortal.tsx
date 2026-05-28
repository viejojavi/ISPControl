import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  CreditCard, 
  CircleUser, 
  LogOut, 
  Menu, 
  X, 
  Activity, 
  Download, 
  Clock, 
  Globe, 
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  UserAccount, 
  ISP, 
  ISPClient, 
  Invoice, 
  getAllISPs, 
  getISPClients, 
  getAllInvoices 
} from '../../lib/userService';

interface ClientPortalProps {
  currentUser: UserAccount;
  onLogout: () => void;
}

export default function ClientPortal({ currentUser, onLogout }: ClientPortalProps) {
  const [ispInfo, setIspInfo] = useState<ISP | null>(null);
  const [clientInfo, setClientInfo] = useState<ISPClient | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'support'>('overview');

  useEffect(() => {
    const loadClientData = async () => {
      try {
        setLoading(true);
        
        // Load ISP details
        const isps = await getAllISPs();
        const myIsp = isps.find(i => i.id === currentUser.ispId);
        if (myIsp) setIspInfo(myIsp);

        // Load Client Profile (matching email and ispId)
        if (currentUser.ispId) {
          const clients = await getISPClients(currentUser.ispId);
          const myProfile = clients.find(c => c.email.toLowerCase() === currentUser.email.toLowerCase());
          if (myProfile) setClientInfo(myProfile);

          // Load Invoices (though currently only main ISP invoices are stored globally, 
          // in a production app we would filter by a client-specific invoice collection)
          // For now, we'll simulate an empty list or fetch global ones if needed for demo
          const allInvoices = await getAllInvoices();
          // Simulating client-facing invoices filtered by email prefix or similar logic if applicable
          // In this implementation, we focus on the UI/Redirection logic
          setInvoices([]); 
        }
      } catch (err) {
        console.error('Error loading client portal data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClientData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Cargando tu portal de cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 font-sans flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-[#161b22] border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Wifi size={20} />
          </div>
          <span className="font-bold text-sm">{ispInfo?.name || 'Mi Internet'}</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar navigation */}
      <AnimatePresence>
        {(isMenuOpen || true) && (
          <motion.aside 
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#161b22] border-r border-gray-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:block'}`}
            initial={false}
          >
            <div>
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                    <Globe size={24} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">Portal Cliente</h1>
                    <p className="text-[10px] text-emerald-450 font-bold uppercase tracking-widest">Servicio Activo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-white md:hidden"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 mt-2">
                <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800/50 flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {currentUser.name?.charAt(0) || 'C'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name || 'Cliente'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('overview'); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === 'overview' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                    }`}
                  >
                    <Activity size={18} />
                    Mi Conexión
                  </button>
                  <button
                    onClick={() => { setActiveTab('billing'); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === 'billing' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                    }`}
                  >
                    <CreditCard size={18} />
                    Facturación
                  </button>
                  <button
                    onClick={() => { setActiveTab('support'); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === 'support' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                    }`}
                  >
                    <HelpCircle size={18} />
                    Soporte Técnico
                  </button>
                </nav>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* Welcome Header */}
        <header className="mb-8">
          <h2 className="text-2xl font-black text-white tracking-tight">
            ¡Hola, {currentUser.name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Gestión de servicios de Internet provistos por <span className="text-blue-400 font-semibold">{ispInfo?.name}</span>
          </p>
        </header>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Connection Status Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${clientInfo?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      <Wifi size={32} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Estado de la Línea</p>
                      <h3 className="text-xl font-bold text-white">
                        {clientInfo?.status === 'Active' ? 'Conectado / En Línea' : 'Servicio Suspendido'}
                      </h3>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 bg-gray-900 rounded-full border border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    ID: {clientInfo?.id.substring(0, 8)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Plan Contratado</p>
                    <p className="text-lg font-bold text-blue-400">{clientInfo?.bandwidthPlan || 'Plata Premium'}</p>
                  </div>
                  <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Dirección IP Asignada</p>
                    <p className="text-lg font-mono text-white">{clientInfo?.ipAddress || '192.168.1.5'}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
                    <Activity size={18} />
                    Test de Velocidad
                  </button>
                  <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                    <Download size={18} />
                    Consumo del Mes
                  </button>
                </div>
              </div>

              {/* Tips Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 flex gap-4">
                  <AlertCircle className="text-amber-400 shrink-0" size={24} />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Evita suspensiones</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Realiza tus pagos antes de la fecha de vencimiento para mantener tu navegación activa.</p>
                  </div>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5 flex gap-4">
                  <ShieldCheck className="text-indigo-400 shrink-0" size={24} />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Navegación protegida</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">Tu ISP garantiza una conexión cifrada y segura para todos tus dispositivos domésticos.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Snapshot sidebar */}
            <div className="space-y-6">
              <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl" />
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-400" />
                  Facturación
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/80 rounded-2xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Próximo Vencimiento</p>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-black text-white">Julio 15</p>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Clock size={12} />
                        Faltan 10 días
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-900/80 rounded-2xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Valor a pagar</p>
                    <p className="text-3xl font-black text-blue-400">$65.000 <span className="text-xs text-gray-500 font-normal">COP</span></p>
                  </div>

                  <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-extrabold transition-all shadow-xl shadow-emerald-600/20 mt-2">
                    PAGAR FACTURA AHORA
                  </button>
                  
                  <button className="w-full py-3 bg-transparent hover:bg-gray-800 text-gray-400 text-xs font-bold rounded-xl transition-all border border-gray-800">
                    DESCARGAR FACTURA (PDF)
                  </button>
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6">
                <h4 className="text-sm font-bold text-white mb-4">Información Técnica</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Nodo:</span>
                    <span className="text-gray-300 font-mono">NORTH-ZONE-04</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">MAC Address:</span>
                    <span className="text-gray-300 font-mono">00:1A:2B:3C:4D:5E</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Dirección:</span>
                    <span className="text-gray-300 text-right">{clientInfo?.address || 'Calle Principal #123'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Placeholder for other tabs */}
        {(activeTab === 'billing' || activeTab === 'support') && (
          <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-dashed border-gray-800 rounded-3xl">
            <div className="p-5 bg-gray-900 rounded-full mb-4">
              <ShieldCheck size={40} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-white">Módulo en Desarrollo</h3>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
              Esta sección está siendo aprovisionada para tu ISP. Muy pronto podrás gestionar tickets y reportes históricos.
            </p>
            <button 
              onClick={() => setActiveTab('overview')}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
            >
              Volver al inicio
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
