
import { useState } from 'react';
import { Settings, Globe, MapPin, Save, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { ISP, updateISPConfig, clearISPData } from '../../lib/userService';
import { COLOMBIA_GEO_DATA, COUNTRIES } from '../../lib/geoData';

interface GeneralSettingsProps {
  ispInfo: ISP | null;
  onNotification: (message: string, type: 'success' | 'error') => void;
  onRefresh: () => void;
}

export default function GeneralSettings({ ispInfo, onNotification, onRefresh }: GeneralSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [formData, setFormData] = useState({
    defaultCountry: ispInfo?.defaultCountry || 'Colombia',
    defaultDepartment: ispInfo?.defaultDepartment || '',
    defaultMunicipality: ispInfo?.defaultMunicipality || ''
  });

  const handleSave = async () => {
    if (!ispInfo) return;
    setSaving(true);
    try {
      await updateISPConfig(ispInfo.id, formData);
      onNotification('Configuración general actualizada con éxito.', 'success');
      onRefresh();
    } catch (err: any) {
      onNotification(err.message || 'Error al guardar configuración.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!ispInfo) return;
    
    const confirmation = window.confirm(
      '¿ESTÁ COMPLETAMENTE SEGURO? Esta acción ELIMINARÁ PERMANENTEMENTE todos los routers, clientes, facturas y configuraciones de red de su ISP. Esta acción NO se puede deshacer.'
    );

    if (!confirmation) return;

    const finalCode = window.prompt('Para confirmar el borrado total, escriba el nombre de su ISP en mayúsculas:');
    if (finalCode !== ispInfo.name.toUpperCase()) {
      onNotification('Confirmación fallida. El nombre no coincide.', 'error');
      return;
    }

    setClearing(true);
    try {
      await clearISPData(ispInfo.id, ispInfo.email);
      onNotification('Base de datos limpiada con éxito. El sistema se encuentra en estado inicial.', 'success');
      onRefresh();
    } catch (err: any) {
      onNotification(err.message || 'Error al limpiar base de datos.', 'error');
    } finally {
      setClearing(false);
    }
  };

  const departments = COLOMBIA_GEO_DATA;
  const currentDept = departments.find(d => d.name === formData.defaultDepartment);
  const municipalities = currentDept ? currentDept.municipalities : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-800 mb-6">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Preferencias Regionales</h3>
            <p className="text-xs text-gray-500 mt-1">Defina los parámetros geográficos por defecto para la operación de su ISP.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Globe size={12} className="text-blue-500" /> País de Operación
            </label>
            <select
              value={formData.defaultCountry}
              onChange={(e) => setFormData({ ...formData, defaultCountry: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm text-gray-200 focus:border-blue-500 outline-none transition-all cursor-pointer"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <MapPin size={12} className="text-blue-500" /> Departamento Principal
            </label>
            <select
              value={formData.defaultDepartment}
              onChange={(e) => setFormData({ ...formData, defaultDepartment: e.target.value, defaultMunicipality: '' })}
              className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm text-gray-200 focus:border-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Seleccione Departamento</option>
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <MapPin size={12} className="text-blue-500" /> Municipio / Ciudad Sede
            </label>
            <select
              value={formData.defaultMunicipality}
              disabled={!formData.defaultDepartment}
              onChange={(e) => setFormData({ ...formData, defaultMunicipality: e.target.value })}
              className="w-full px-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-sm text-gray-200 focus:border-blue-500 outline-none transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="">Seleccione Municipio</option>
              {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Guardando...' : 'Aplicar Configuración Regional'}
          </button>
        </div>
      </div>

      <div className="bg-blue-950/10 border border-blue-500/10 p-5 rounded-2xl flex items-start gap-3">
        <Settings className="text-blue-400 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wide">Nota sobre Microservicios Geográficos</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Los datos seleccionados aquí se utilizarán automáticamente para rellenar los formularios de aprovisionamiento de clientes, optimizando el tiempo de registro y garantizando la coherencia territorial en su red MikroTik. El país seleccionado determina la base de datos de departamentos y municipios disponible.
          </p>
        </div>
      </div>

      <div className="bg-rose-950/10 border border-rose-500/15 rounded-3xl p-8 mt-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <AlertTriangle size={120} className="text-rose-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="text-rose-500" size={24} />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Zona de Peligro</h3>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed mb-8">
            Si desea reiniciar su operación desde cero, puede limpiar todas las colecciones de datos asociadas a su cuenta. 
            Esta acción es irreversible y eliminará todos los registros históricos, configuraciones de túneles y bases de datos de clientes.
          </p>
          
          <button
            onClick={handleClearDatabase}
            disabled={clearing}
            className="flex items-center gap-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {clearing ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {clearing ? 'Realizando limpieza profunda...' : 'Limpiar Base de Datos del ISP (Wipe System)'}
          </button>
        </div>
      </div>
    </div>
  );
}
