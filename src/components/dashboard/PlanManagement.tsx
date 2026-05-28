
import { useState, useEffect, FormEvent } from 'react';
import { Plus, Wifi, Layers, Server, Save, Trash2, Edit3, CheckCircle2, XCircle } from 'lucide-react';
import { 
  ISP, 
  BandwidthPlan, 
  Router, 
  db,
  cleanObject
} from '../../lib/userService';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface PlanManagementProps {
  ispInfo: ISP | null;
  routers: Router[];
  onNotification: (message: string, type: 'success' | 'error') => void;
}

export default function PlanManagement({ ispInfo, routers, onNotification }: PlanManagementProps) {
  const [plans, setPlans] = useState<BandwidthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    downloadMbps: 50,
    uploadMbps: 10,
    price: 65000,
    serviceType: 'Any' as any,
    mikrotikProfile: '',
    targetRouterIds: [] as string[],
    description: '',
    isActive: true
  });

  useEffect(() => {
    loadPlans();
  }, [ispInfo]);

  const loadPlans = async () => {
    if (!ispInfo) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'bandwidthPlans'), where('ispId', '==', ispInfo.id));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BandwidthPlan));
      setPlans(list.sort((a, b) => b.downloadMbps - a.downloadMbps));
    } catch (err) {
      onNotification('Error al cargar planes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ispInfo) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'bandwidthPlans', editingId), cleanObject(formData));
        onNotification('Plan actualizado con éxito.', 'success');
      } else {
        await addDoc(collection(db, 'bandwidthPlans'), {
          ...formData,
          ispId: ispInfo.id,
          currency: 'COP',
          createdAt: new Date().toISOString()
        });
        onNotification('Plan creado con éxito.', 'success');
      }
      setIsAdding(false);
      setEditingId(null);
      loadPlans();
      setFormData({
        name: '', downloadMbps: 50, uploadMbps: 10, price: 65000,
        serviceType: 'Any', mikrotikProfile: '', targetRouterIds: [],
        description: '', isActive: true
      });
    } catch (err) {
      onNotification('Error al procesar el plan.', 'error');
    }
  };

  const handleEdit = (plan: BandwidthPlan) => {
    setFormData({
      name: plan.name,
      downloadMbps: plan.downloadMbps,
      uploadMbps: plan.uploadMbps,
      price: plan.price,
      serviceType: plan.serviceType || 'Any',
      mikrotikProfile: plan.mikrotikProfile || '',
      targetRouterIds: plan.targetRouterIds || [],
      description: plan.description || '',
      isActive: plan.isActive
    });
    setEditingId(plan.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este plan?')) return;
    try {
      await deleteDoc(doc(db, 'bandwidthPlans', id));
      onNotification('Plan eliminado.', 'success');
      loadPlans();
    } catch (err) {
      onNotification('Error al eliminar.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Catálogo de Planes</h3>
          <p className="text-xs text-gray-500 mt-1">Defina los perfiles de velocidad y vinculación técnica con MikroTik.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
        >
          {isAdding ? <XCircle size={18} /> : <Plus size={18} />}
          {isAdding ? 'Cancelar' : 'Nuevo Plan de Internet'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nombre del Plan *</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
                placeholder="Ej: FIBRA HOGAR 100MB"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Descarga (Mbps) *</label>
              <input
                required
                type="number"
                value={formData.downloadMbps}
                onChange={e => setFormData({ ...formData, downloadMbps: parseInt(e.target.value) })}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Subida (Mbps) *</label>
              <input
                required
                type="number"
                value={formData.uploadMbps}
                onChange={e => setFormData({ ...formData, uploadMbps: parseInt(e.target.value) })}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Precio Mensual (COP) *</label>
              <input
                required
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Servicio Asociado</label>
              <select
                value={formData.serviceType}
                onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white"
              >
                <option value="Any">Cualquiera (Any)</option>
                <option value="Static">IP Estática</option>
                <option value="DHCP">DHCP</option>
                <option value="PPPoE">PPPoE</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Perfil MikroTik (Opcional)</label>
              <input
                value={formData.mikrotikProfile}
                onChange={e => setFormData({ ...formData, mikrotikProfile: e.target.value })}
                className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                placeholder="Ej: 100M_PROFILE"
              />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <Server size={12} className="text-blue-500" /> Disponibilidad en Routers
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {routers.map(router => (
                <label key={router.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  formData.targetRouterIds.includes(router.id) 
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' 
                    : 'bg-[#0d1117] border-gray-800 text-gray-400 hover:border-gray-700'
                }`}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.targetRouterIds.includes(router.id)}
                    onChange={() => {
                      const current = [...formData.targetRouterIds];
                      if (current.includes(router.id)) {
                        setFormData({ ...formData, targetRouterIds: current.filter(id => id !== router.id) });
                      } else {
                        setFormData({ ...formData, targetRouterIds: [...current, router.id] });
                      }
                    }}
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.targetRouterIds.includes(router.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-800'}`}>
                    {formData.targetRouterIds.includes(router.id) && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className="text-xs font-medium truncate">{router.name}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 italic mt-1">Si no selecciona ningún router, el plan estará disponible para toda la red.</p>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"
            >
              <Save size={18} />
              {editingId ? 'Actualizar Plan' : 'Guardar Nuevo Plan'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#161b22] border border-dashed border-gray-800 rounded-3xl">
            <Wifi className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-500 text-sm">No hay planes configurados aún.</p>
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className="bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden group hover:border-blue-500/50 transition-all">
              <div className="p-5 border-b border-gray-800 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{plan.name}</h4>
                    <div className="flex items-center gap-2">
                       <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                         plan.serviceType === 'PPPoE' ? 'bg-purple-500/10 text-purple-400' :
                         plan.serviceType === 'DHCP' ? 'bg-amber-500/10 text-amber-400' :
                         plan.serviceType === 'Static' ? 'bg-emerald-500/10 text-emerald-400' :
                         'bg-gray-500/10 text-gray-400'
                       }`}>
                         {plan.serviceType || 'Any'}
                       </span>
                       {!plan.isActive && <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Inactivo</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-blue-400">{plan.price.toLocaleString('es-CO')} {plan.currency}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Residencial</p>
                  </div>
                </div>
              </div>
              
              <div className="p-5 bg-black/20 grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Donwload</p>
                   <p className="text-xl font-black text-white">{plan.downloadMbps} <span className="text-xs text-gray-500">Mbps</span></p>
                 </div>
                 <div className="space-y-1 text-right">
                   <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Upload</p>
                   <p className="text-xl font-black text-white">{plan.uploadMbps} <span className="text-xs text-gray-500">Mbps</span></p>
                 </div>
              </div>

              <div className="p-4 flex items-center justify-between border-t border-gray-800 bg-[#0d1117]/50">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleEdit(plan)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="p-2 text-gray-400 hover:text-rose-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                   <Server size={14} className="text-gray-600" />
                   <span className="text-[10px] text-gray-500 font-bold">
                     {plan.targetRouterIds && plan.targetRouterIds.length > 0 ? `${plan.targetRouterIds.length} Nodos` : 'Red Global'}
                   </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
