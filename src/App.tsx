import { useState, useEffect } from 'react';
import LoginForm from './components/auth/LoginForm';
import SuperAdminDashboard from './components/dashboard/SuperAdminDashboard';
import ISPWorkspace from './components/dashboard/ISPWorkspace';
import ClientPortal from './components/dashboard/ClientPortal';
import { UserAccount } from './lib/userService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if session exists in localStorage
    try {
      const savedUser = localStorage.getItem('ticcol_superadmin_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error recovering session:', e);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ticcol_superadmin_user', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving session:', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ticcol_superadmin_user');
    } catch (e) {
      console.error('Error purging session:', e);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-sm font-semibold tracking-wide">Recuperando sesión activa...</p>
        </div>
      </div>
    );
  }

  // Authentication router
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0d13] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Soft immersive background ambient glow shapes */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] -z-10" />
        
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Multi-tenant router based on Role and ISP assignment
  if (currentUser.role === 'SuperAdmin') {
    return (
      <SuperAdminDashboard currentUser={currentUser} onLogout={handleLogout} />
    );
  }

  if (currentUser.role === 'Admin' && currentUser.ispId) {
    return (
      <ISPWorkspace currentUser={currentUser} onLogout={handleLogout} />
    );
  }

  if (currentUser.role === 'User' && currentUser.ispId) {
    return (
      <ClientPortal currentUser={currentUser} onLogout={handleLogout} />
    );
  }

  // Fallback for unexpected roles or missing ISP data
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-300 p-8">
      <div className="text-center max-w-md">
        <div className="text-rose-500 mb-6">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Acceso No Autorizado</h2>
        <p className="text-sm text-gray-400 mb-6">Tu cuenta no tiene un rol válido o faltan parámetros de inquilino (ISP). Por favor contacta a soporte.</p>
        <button 
          onClick={handleLogout}
          className="px-6 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold border border-gray-700"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
