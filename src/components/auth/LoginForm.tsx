import { useState, useEffect, FormEvent } from 'react';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { validateUser, seedDefaultUsersIfNeeded, UserAccount } from '../../lib/userService';

interface LoginFormProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(true);
  
  const [alertState, setAlertState] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({
    message: '',
    type: null
  });

  useEffect(() => {
    // Perform database seed checks on mount
    async function initializeDb() {
      try {
        await seedDefaultUsersIfNeeded();
        setAlertState({
          message: 'Base de datos sincronizada. Usuario SuperAdmin por defecto listo.',
          type: 'info'
        });
      } catch (err) {
        console.error('Error seeding on start:', err);
      } finally {
        setSeeding(false);
      }
    }
    initializeDb();
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' | 'info') => {
    setAlertState({ message, type });
    if (type !== 'info') {
      setTimeout(() => {
        setAlertState(prev => prev.message === message ? { message: '', type: null } : prev);
      }, 6000);
    }
  };

  const handleQuickFill = () => {
    setEmail('ticcolcolombia@gmail.com');
    setPassword('adminpassword123');
    showAlert('Credenciales de SuperAdmin agregadas en los campos.', 'success');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showAlert('Por favor, complete todos los campos.', 'error');
      return;
    }

    setLoading(true);
    setAlertState({ message: '', type: null });

    try {
      const user = await validateUser(email, password);
      showAlert(`¡Inicio de sesión exitoso! Bienvenido ${user.name || user.email}`, 'success');
      
      setTimeout(() => {
        onLoginSuccess(user);
      }, 1000);
    } catch (error: any) {
      console.error('Login failed:', error);
      showAlert(error.message || 'Error de inicio de sesión: credenciales incorrectas', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md w-full bg-[#181e29] border border-gray-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          SuperAdmin Platform
        </h2>
        <p className="text-gray-400 text-sm mt-1.5">
          Portal de Control y Gestión de Usuarios
        </p>
      </div>

      {/* Styled Alerts Panel */}
      <AnimatePresence mode="wait">
        {alertState.type && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm border ${
              alertState.type === 'success' 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20' 
                : alertState.type === 'error'
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/20'
                : 'bg-blue-950/40 text-blue-300 border-blue-500/20'
            }`}
          >
            {alertState.type === 'success' ? (
              <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={16} />
            ) : alertState.type === 'error' ? (
              <AlertCircle className="shrink-0 text-rose-400 mt-0.5" size={16} />
            ) : (
              <Sparkles className="shrink-0 text-blue-400 mt-0.5 animate-pulse" size={16} />
            )}
            <div className="flex-1">
              {alertState.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all outline-none"
              placeholder="correo@ticcol.com"
              required
              disabled={loading || seeding}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all outline-none"
              placeholder="••••••••"
              required
              disabled={loading || seeding}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || seeding}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-55 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-blue-500/10"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Iniciando sesión...
            </span>
          ) : (
            <>
              <LogIn size={18} />
              <span>Ingresar</span>
            </>
          )}
        </button>
      </form>

      {/* Auto Test Credentials Helper Panel */}
      <div className="mt-8 pt-6 border-t border-gray-800/80 text-center">
        <p className="text-xs text-gray-500 mb-3">
          ¿Deseas probar el acceso SuperAdmin de prueba ágilmente?
        </p>
        <button
          type="button"
          onClick={handleQuickFill}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-blue-400 hover:text-blue-300 border border-gray-800 rounded-lg transition-colors cursor-pointer"
        >
          <Sparkles size={13} />
          Autocompletar Acceso SuperAdmin
        </button>
      </div>
    </motion.div>
  );
}
