import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  ChevronRight, 
  Wifi, 
  Server,
  Zap,
  Globe,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle,
  AlertCircle,
  Lock,
  MoreVertical,
  IdCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ISPClient, 
  UserAccount, 
  ISP, 
  ISPPlan,
  BandwidthPlan,
  getISPClients, 
  getBandwidthPlans,
  createISPClient, 
  updateISPClient, 
  deleteISPClient,
  getISPRouters,
  validateGovernmentID,
  Router,
  getNextAvailableIP,
  generateNextIPv6
} from '../../lib/userService';
import { COLOMBIA_GEO_DATA } from '../../lib/geoData';

interface ClientManagementProps {
  currentUser: UserAccount;
  ispInfo: ISP | null;
  planInfo: ISPPlan | null;
  onNotification: (message: string, type: 'success' | 'error') => void;
}

const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'PP'];
const TECH_TYPES = ['FTTH', 'Wireless'];
const IP_CONFIG_TYPES = ['Static', 'DHCP', 'PPPoE'];

export default function ClientManagement({ currentUser, ispInfo, planInfo, onNotification }: ClientManagementProps) {
  const [clients, setClients] = useState<ISPClient[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [allPlans, setAllPlans] = useState<BandwidthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingID, setValidatingID] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<ISPClient | null>(null);

  // Form State
  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    country: ispInfo?.defaultCountry || 'Colombia',
    department: ispInfo?.defaultDepartment || '',
    municipality: ispInfo?.defaultMunicipality || '',
    address: '',
    documentType: 'CC' as 'CC' | 'CE' | 'NIT' | 'PP',
    documentNumber: '',
    bandwidthPlanId: '20mb',
    technology: 'FTTH' as 'FTTH' | 'Wireless',
    ipConfigType: 'Static' as 'Static' | 'DHCP' | 'PPPoE',
    ipAddress: '192.168.100.',
    macAddress: '',
    ipv6Address: '',
    pppoeUser: '',
    pppoePassword: '',
    pppoeProfile: 'default',
    routerId: '',
    servicePoint: '',
    billingDay: 5,
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended'
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // Geo data filters
  const departments = COLOMBIA_GEO_DATA;
  const currentDept = departments.find(d => d.name === formData.department);
  const municipalities = currentDept ? currentDept.municipalities : [];

  const loadData = async () => {
    if (!currentUser.ispId) return;
    setLoading(true);
    try {
      const [clientsList, routersList, plansList] = await Promise.all([
        getISPClients(currentUser.ispId),
        getISPRouters(currentUser.ispId),
        getBandwidthPlans(currentUser.ispId)
      ]);
      setClients(clientsList);
      setAllPlans(plansList);
      // Filter routers by ispId
      setRouters(routersList);
      
      // Select first router by default if available
      if (routersList.length > 0 && !formData.routerId) {
        setFormData(prev => ({ ...prev, routerId: routersList[0].id }));
      }
    } catch (err) {
      console.error(err);
      onNotification('Error al cargar clientes, infraestructura o planes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availablePlans = allPlans.filter(p => 
    p.isActive && 
    (p.serviceType === 'Any' || p.serviceType === formData.ipConfigType) &&
    (!p.targetRouterIds || p.targetRouterIds.length === 0 || p.targetRouterIds.includes(formData.routerId))
  );

  const handleBandwidthChange = (planId: string) => {
    const plan = allPlans.find(p => p.id === planId);
    if (plan) {
      setFormData(prev => ({ 
        ...prev, 
        bandwidthPlanId: planId,
        ipConfigType: plan.serviceType === 'Any' ? prev.ipConfigType : plan.serviceType,
        pppoeProfile: plan.mikrotikProfile || prev.pppoeProfile
      }));
    } else {
      setFormData(prev => ({ ...prev, bandwidthPlanId: planId }));
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.ispId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser.ispId || !planInfo) return;

    try {
      await createISPClient({
        ...formData,
        ispId: currentUser.ispId,
      }, planInfo.maxClients, currentUser.email);

      onNotification(`Cliente "${formData.firstName} ${formData.lastName}" registrado con éxito.`, 'success');
      setShowAddClient(false);
      setFormData(initialFormState);
      loadData();
    } catch (err: any) {
      onNotification(err.message || 'Error al registrar cliente.', 'error');
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      await updateISPClient(editingClient.id, formData, currentUser.email);
      onNotification('Cliente actualizado correctamente.', 'success');
      setEditingClient(null);
      setFormData(initialFormState);
      loadData();
    } catch (err: any) {
      onNotification(err.message || 'Error al actualizar cliente.', 'error');
    }
  };

  const handleDelete = async (client: ISPClient) => {
    if (!currentUser.ispId) return;
    if (!window.confirm(`¿Está seguro de retirar definitivamente al cliente ${client.firstName} ${client.lastName}?`)) return;

    try {
      await deleteISPClient(client.id, `${client.firstName} ${client.lastName}`, currentUser.ispId, currentUser.email);
      onNotification('Cliente retirado del sistema.', 'success');
      loadData();
    } catch (err: any) {
      onNotification(err.message || 'Error al eliminar registro.', 'error');
    }
  };

  const filteredClients = clients.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ipAddress.includes(searchQuery) ||
    c.documentNumber.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Inactive': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'Suspended': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const handleValidateId = async () => {
    if (!formData.documentNumber || formData.documentNumber.length < 5) {
      onNotification('Ingrese un número de documento válido para consultar.', 'error');
      return;
    }

    setValidatingID(true);
    setIdVerified(false);
    try {
      const result = await validateGovernmentID(formData.documentType, formData.documentNumber);
      setFormData(prev => ({
        ...prev,
        firstName: result.firstName,
        lastName: result.lastName || '',
        country: result.country || prev.country,
        department: result.department || prev.department,
        municipality: result.municipality || prev.municipality,
        address: result.address || prev.address,
        phoneNumber: result.phoneNumber || prev.phoneNumber,
        email: result.email || prev.email
      }));
      setIdVerified(true);
      onNotification(`Información recuperada de: ${result.source}`, 'success');
    } catch (err: any) {
      onNotification(err.message || 'Error al validar documento.', 'error');
    } finally {
      setValidatingID(false);
    }
  };

  const isNIT = formData.documentType === 'NIT';
  
  const handleAutoAssignIP = () => {
    const selectedRouter = routers.find(r => r.id === formData.routerId);
    if (!selectedRouter) {
      onNotification('Primero debe seleccionar un Router de gestión.', 'error');
      return;
    }
    
    try {
      const nextIP = getNextAvailableIP(selectedRouter, clients, formData.ipConfigType);
      const nextIPv6 = generateNextIPv6(selectedRouter, clients);
      setFormData(prev => ({ 
        ...prev, 
        ipAddress: nextIP,
        ipv6Address: nextIPv6
      }));
      onNotification(`IP ${nextIP}${nextIPv6 ? ' y IPv6 ' + nextIPv6 : ''} asignadas automáticamente.`, 'success');
    } catch (err: any) {
      onNotification(err.message || 'Error al asignar IP.', 'error');
    }
  };

  // ... (previous methods)

  return (
    <div className="space-y-6">
      {/* Search and Add Action */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-lg">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, ID, Email o IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-sm text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
        <button
          onClick={() => {
            setFormData(initialFormState);
            setIdVerified(false);
            const myRouters = routers.filter(r => r.ispId === currentUser.ispId);
            if (myRouters.length > 0) setFormData(prev => ({ ...prev, routerId: myRouters[0].id }));
            setShowAddClient(true);
          }}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <UserPlus size={18} />
          Registrar Nuevo Cliente
        </button>
      </div>

      {/* Grid of Clients */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] rounded-2xl border border-gray-800">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm font-medium">Consultando registros de clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] rounded-2xl border border-gray-800 text-center px-6">
          <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
            <Users size={40} className="text-gray-700" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron clientes</h3>
          <p className="text-gray-500 text-sm max-w-md">No hay resultados que coincidan con tu búsqueda o aún no has aprovisionado clientes en tu red.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
          {filteredClients.map((client) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={client.id}
              className="group bg-[#161b22] border border-gray-800 hover:border-blue-500/50 rounded-2xl p-5 transition-all shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center shrink-0">
                    <User size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight leading-tight">
                      {client.firstName} {client.lastName}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                      <IdCard size={10} className="text-blue-500/50" />
                      {client.documentType}: {client.documentNumber}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                      <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                        <Zap size={8} />
                        {allPlans.find(p => p.id === client.bandwidthPlanId)?.name || client.bandwidthPlanId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={() => {
                      setEditingClient(client);
                      setFormData({ ...client });
                      setIdVerified(false);
                    }}
                    className="p-2 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 rounded-lg transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(client)}
                    className="p-2 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Client Technical Details Card */}
              <div className="mt-4 grid grid-cols-2 gap-3 p-3 bg-black/20 rounded-xl border border-white/5 relative z-10">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Globe size={10} /> Direccionamiento
                  </p>
                  <p className="text-[11px] font-mono font-bold text-emerald-400">{client.ipAddress}</p>
                  {client.ipv6Address && <p className="text-[10px] font-mono font-bold text-blue-400 mt-1 truncate">{client.ipv6Address}</p>}
                  <p className="text-[9px] text-gray-400 italic">Modo {client.ipConfigType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Wifi size={10} /> Tecnología FTTH/Wireless
                  </p>
                  <p className="text-[11px] font-bold text-blue-300">{client.technology}</p>
                  <p className="text-[9px] text-gray-400 truncate" title={client.servicePoint}>{client.servicePoint || 'Punto No Asignado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Mail size={10} /> Contacto
                  </p>
                  <p className="text-[10px] text-gray-300 truncate">{client.email}</p>
                  <p className="text-[10px] text-gray-300">{client.phoneNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <CreditCard size={10} /> Facturación
                  </p>
                  <p className="text-[10px] text-gray-300">Día {client.billingDay} de cada mes</p>
                  <LinkRouterInfo routerId={client.routerId} routers={routers} />
                </div>
              </div>

              {/* Subtle background decoration */}
              <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-blue-500/5 transition-colors">
                <Users size={120} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* MODAL: CREATE / EDIT CLIENT */}
      <AnimatePresence>
        {(showAddClient || editingClient) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddClient(false);
                setEditingClient(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#161b22] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                    {editingClient ? <Edit3 size={24} /> : <UserPlus size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {editingClient ? 'Modificar Perfil de Cliente' : 'Aprovisiónamiento de Nuevo Usuario'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Cumplimiento de normatividad DIAN y Registraduría</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowAddClient(false);
                    setEditingClient(null);
                  }}
                  className="p-2 hover:bg-gray-800 text-gray-500 hover:text-white rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form 
                onSubmit={editingClient ? handleUpdate : handleCreate}
                className="overflow-y-auto p-6 space-y-8"
              >
                {/* Section: Basic Information (Reordered to start with ID) */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                    <IdCard size={14} className="text-blue-400" />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identificación y Origen</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo Identificación</label>
                      <select
                        value={formData.documentType}
                        onChange={(e) => {
                          setFormData({ ...formData, documentType: e.target.value as any });
                          setIdVerified(false);
                        }}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nro. Documento / NIT *</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          value={formData.documentNumber}
                          onChange={(e) => {
                            setFormData({ ...formData, documentNumber: e.target.value });
                            setIdVerified(false);
                          }}
                          className="flex-1 px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all font-mono"
                          placeholder={isNIT ? "Ej: 900800700-1" : "Ej: 1085332..."}
                        />
                        <button
                          type="button"
                          onClick={handleValidateId}
                          disabled={validatingID}
                          className="px-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 group"
                        >
                          {validatingID ? (
                             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                             <Search size={14} className="group-hover:scale-110 transition-transform" />
                          )}
                          <span>Validar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={isNIT ? "col-span-full space-y-2" : "space-y-2"}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                        {isNIT ? 'Razón Social / Nombre de Empresa *' : 'Primeros Nombres *'}
                        {idVerified && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all ${idVerified ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                        placeholder={isNIT ? "Ej: Servicios Globales SAS" : "Ej: Juan Sebastián"}
                      />
                    </div>
                    
                    {!isNIT && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                          Apellidos *
                          {idVerified && formData.lastName && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                        </label>
                        <input
                          required
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all ${idVerified && formData.lastName ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                          placeholder="Ej: Pérez García"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Celular / Teléfono *
                        {idVerified && formData.phoneNumber && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                      </label>
                      <input
                        required
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all ${idVerified && formData.phoneNumber ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                        placeholder="+57 3..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Email Principal *
                        {idVerified && formData.email && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all ${idVerified && formData.email ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                        placeholder="cliente@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                         Departamento *
                         {idVerified && formData.department && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                       </label>
                       <select
                        required
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value, municipality: '' })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer ${idVerified && formData.department ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                      >
                        <option value="">Seleccione Departamento</option>
                        {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                         Municipio *
                         {idVerified && formData.municipality && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                       </label>
                       <select
                        required
                        disabled={!formData.department}
                        value={formData.municipality}
                        onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer disabled:opacity-50 ${idVerified && formData.municipality ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                      >
                        <option value="">Seleccione Municipio</option>
                        {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="col-span-full space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                         Dirección de Instalación *
                         {idVerified && formData.address && <span className="ml-2 text-emerald-500 font-black text-[8px]">VALIDADO</span>}
                       </label>
                       <input
                        required
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border rounded-xl text-sm focus:border-blue-500 outline-none transition-all ${idVerified && formData.address ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-gray-800'}`}
                        placeholder="Calle, Barrio, Casa, Apartamento..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Service Configuration */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                    <Wifi size={14} className="text-blue-400" />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Configuración Técnica del Servicio</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Plan de Ancho de Banda</label>
                      <select
                        required
                        value={formData.bandwidthPlanId}
                        onChange={(e) => handleBandwidthChange(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Seleccione un plan</option>
                        {availablePlans.map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.downloadMbps}M/{plan.uploadMbps}M)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tecnología de Red</label>
                      <select
                        value={formData.technology}
                        onChange={(e) => setFormData({ ...formData, technology: e.target.value as any })}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        {TECH_TYPES.map(tech => <option key={tech} value={tech}>{tech}</option>)}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Configuración IP</label>
                      <select
                        value={formData.ipConfigType}
                        onChange={(e) => setFormData({ ...formData, ipConfigType: e.target.value as any })}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        {IP_CONFIG_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                        IP Asignada *
                        {!editingClient && (
                          <button 
                            type="button"
                            onClick={handleAutoAssignIP}
                            className="text-blue-500 hover:text-blue-400 cursor-pointer hover:underline lowercase font-black text-[9px]"
                          >
                            [AUTO-ASIGNAR]
                          </button>
                        )}
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.ipAddress}
                        onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all font-mono text-emerald-400"
                        placeholder="192.168.10.x"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dirección MAC (Amarre)</label>
                      <input
                        required={formData.ipConfigType === 'DHCP'}
                        type="text"
                        value={formData.macAddress}
                        onChange={(e) => setFormData({ ...formData, macAddress: e.target.value.toUpperCase() })}
                        className={`w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all font-mono ${formData.ipConfigType === 'DHCP' ? 'text-amber-400' : 'text-gray-400'}`}
                        placeholder="AA:BB:CC:DD:EE:FF"
                      />
                    </div>

                    {formData.ipConfigType === 'PPPoE' && (
                      <>
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Usuario PPPoE *</label>
                          <input
                            required
                            type="text"
                            value={formData.pppoeUser}
                            onChange={(e) => setFormData({ ...formData, pppoeUser: e.target.value })}
                            className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all text-blue-400 font-bold"
                            placeholder="Ej: cliente_123"
                          />
                        </div>
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Contraseña PPPoE *</label>
                          <input
                            required
                            type="password"
                            value={formData.pppoePassword}
                            onChange={(e) => setFormData({ ...formData, pppoePassword: e.target.value })}
                            className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all text-blue-400 font-bold"
                            placeholder="********"
                          />
                        </div>
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Perfil PPPoE (MikroTik) *</label>
                          <select
                            required
                            value={formData.pppoeProfile}
                            onChange={(e) => setFormData({ ...formData, pppoeProfile: e.target.value })}
                            className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer text-blue-400 font-bold"
                          >
                            <option value="default">default</option>
                            <option value="profile_fiber">profile_fiber</option>
                            <option value="profile_premium">profile_premium</option>
                            <option value="profile_standard">profile_standard</option>
                            <option value="profile_dedicated">profile_dedicated</option>
                            <option value="default-encryption">default-encryption</option>
                          </select>
                        </div>
                      </>
                    )}

                    {routers.find(r => r.id === formData.routerId)?.ipv6Enabled && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">IPv6 Asignada</label>
                        <input
                          type="text"
                          value={formData.ipv6Address}
                          onChange={(e) => setFormData({ ...formData, ipv6Address: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all font-mono text-blue-400"
                          placeholder="2001:db8:..."
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">MikroTik de Gestión *</label>
                      <select
                        required
                        value={formData.routerId}
                        onChange={(e) => setFormData({ ...formData, routerId: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Seleccione un Nodo</option>
                        {routers.map(router => (
                          <option key={router.id} value={router.id}>
                            {router.equipmentIdentity || router.name} ({router.host})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Punto de Entrega (NAP/AP)</label>
                      <input
                        type="text"
                        value={formData.servicePoint}
                        onChange={(e) => setFormData({ ...formData, servicePoint: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
                        placeholder={formData.technology === 'FTTH' ? 'NAP-04-A, Puerto 3' : 'Sectorial Norte, Cliente 2'}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Status and Billing */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                    <CreditCard size={14} className="text-blue-400" />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Facturación y Estado</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Día de Corte de Facturación</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="28"
                          value={formData.billingDay}
                          onChange={(e) => setFormData({ ...formData, billingDay: parseInt(e.target.value) })}
                          className="flex-1 accent-blue-500"
                        />
                        <span className="w-12 py-2 bg-[#0d1117] border border-gray-800 rounded-lg text-center text-sm font-bold text-white">
                          {formData.billingDay}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-1">El sistema generará facturas automáticamente este día.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estado del Servicio</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="Active">ACTIVO (En Servicio)</option>
                        <option value="Inactive">INACTIVO (Pre-Aprobado)</option>
                        <option value="Suspended">SUSPENDIDO (Mora/Técnico)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddClient(false);
                      setEditingClient(null);
                    }}
                    className="flex-1 px-6 py-4 bg-gray-900 hover:bg-gray-800 text-gray-400 font-bold rounded-2xl transition-all border border-gray-800 cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/10 active:scale-95 cursor-pointer text-sm"
                  >
                    {editingClient ? 'Actualizar Cliente' : 'Confirmar Aprovisionamiento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LinkRouterInfo({ routerId, routers }: { routerId: string, routers: Router[] }) {
  const router = routers.find(r => r.id === routerId);
  if (!router) return <p className="text-[10px] text-rose-450 font-bold mt-1 uppercase">Router No Vinculado</p>;
  
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className={`w-1 h-1 rounded-full ${router.status === 'Online' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
      <span className="text-[9px] font-bold text-gray-400 uppercase truncate" title={router.equipmentIdentity || router.name}>
        {router.equipmentIdentity || router.name}
      </span>
    </div>
  );
}
