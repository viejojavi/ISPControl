import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit3, 
  Activity, 
  X, 
  Menu,
  Key, 
  UserCheck, 
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Wifi,
  CreditCard,
  DollarSign,
  Layers,
  Sparkles,
  Play,
  Printer,
  Download,
  Mail,
  MessageSquare,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserAccount, 
  AuditLog, 
  ISP, 
  ISPPlan, 
  Invoice,
  SystemConfig,
  BillingRunResult,
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getAuditLogs,
  createAuditLog,
  getAllPlans,
  getAllISPs,
  createISP,
  updateISP,
  deleteISP,
  triggerManualBilling,
  processRecurringBillingRun,
  getAllInvoices,
  getISPClients,
  DEFAULT_PLANS,
  createPlan,
  updatePlan,
  deletePlan,
  getSystemConfig,
  saveSystemConfig,
  updateInvoiceStatus
} from '../../lib/userService';

interface SuperAdminDashboardProps {
  currentUser: UserAccount;
  onLogout: () => void;
}

export default function SuperAdminDashboard({ currentUser, onLogout }: SuperAdminDashboardProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isps, setIsps] = useState<ISP[]>([]);
  const [plans, setPlans] = useState<ISPPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientCounts, setClientCounts] = useState<{ [ispId: string]: number }>({});
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'isps' | 'plans' | 'users' | 'add_isp' | 'logs' | 'permissions' | 'system_config' | 'billing_management'>('isps');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Searches & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [ispSearchQuery, setIspSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');

  // ISP Custom Drawer states (Create & Update)
  const [showAddISPDrawer, setShowAddISPDrawer] = useState(false);
  const [ispName, setIspName] = useState('');
  const [ispEmail, setIspEmail] = useState('');
  const [ispPassword, setIspPassword] = useState('');
  const [ispPlanId, setIspPlanId] = useState('plan_basic');
  const [ispBillingType, setIspBillingType] = useState<'Manual' | 'Recurring'>('Manual');
  const [ispStatus, setIspStatus] = useState<'Active' | 'Suspended'>('Active');

  // Editing ISP states
  const [editingISP, setEditingISP] = useState<ISP | null>(null);
  const [editIspName, setEditIspName] = useState('');
  const [editIspPassword, setEditIspPassword] = useState('');
  const [editIspPlan, setEditIspPlan] = useState('');
  const [editIspBilling, setEditIspBilling] = useState<'Manual' | 'Recurring'>('Manual');
  const [editIspStatus, setEditIspStatus] = useState<'Active' | 'Suspended'>('Active');

  // Plan Custom Drawer states (Create & Update)
  const [showAddPlanDrawer, setShowAddPlanDrawer] = useState(false);
  const [planIdInput, setPlanIdInput] = useState('');
  const [planName, setPlanName] = useState('');
  const [planMaxClients, setPlanMaxClients] = useState('100');
  const [planPriceMonthly, setPlanPriceMonthly] = useState('49.99');
  const [planDescription, setPlanDescription] = useState('');

  // Editing Plan states
  const [editingPlan, setEditingPlan] = useState<ISPPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanMaxClients, setEditPlanMaxClients] = useState('100');
  const [editPlanPriceMonthly, setEditPlanPriceMonthly] = useState('49.99');
  const [editPlanDescription, setEditPlanDescription] = useState('');

  // Manual Billing flow states
  const [billingTargetISP, setBillingTargetISP] = useState<ISP | null>(null);
  const [manualBillAmount, setManualBillAmount] = useState('49.99');
  const [manualBillDate, setManualBillDate] = useState(() => new Date().toISOString().substring(0, 10));

  // User standard registers state (Admin/SuperAdmin collaborators)
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'SuperAdmin' | 'Admin' | 'User'>('User');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  
  // Editing state for standard Users (collaborators)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'SuperAdmin' | 'Admin' | 'User'>('User');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editName, setEditName] = useState('');

  // System Configuration states (Módulo de Configuración)
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [configGracePeriodDays, setConfigGracePeriodDays] = useState('5');
  const [configSuspendOverdue, setConfigSuspendOverdue] = useState(true);
  const [configSystemBillingEmail, setConfigSystemBillingEmail] = useState('facturacion@ticcol.co');
  const [configAutoInvoicingStatus, setConfigAutoInvoicingStatus] = useState<'Paid' | 'Pending'>('Pending');
  const [configSmtpHost, setConfigSmtpHost] = useState('smtp.gmail.com');
  const [configSmtpPort, setConfigSmtpPort] = useState('587');
  const [configSmtpUser, setConfigSmtpUser] = useState('facturacion@ticcol.co');
  const [configSmtpPassword, setConfigSmtpPassword] = useState('app-password-example-key');
  const [configSmtpSecure, setConfigSmtpSecure] = useState(true);
  const [configTrm, setConfigTrm] = useState('4000');
  const [configWhatsappApiUrl, setConfigWhatsappApiUrl] = useState('https://graph.facebook.com/v19.0');
  const [configWhatsappToken, setConfigWhatsappToken] = useState('EAAG6...');
  const [configWhatsappPhoneId, setConfigWhatsappPhoneId] = useState('28198711...');
  const [savingConfig, setSavingConfig] = useState(false);

  // States for Invoice preview and transmission
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  // Billing run status summaries
  const [lastBillingRunResult, setLastBillingRunResult] = useState<BillingRunResult | null>(null);

  // Schedulers run visual feedbacks
  const [billingProcessing, setBillingProcessing] = useState(false);

  // Notifications banner object
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({
    message: '',
    type: null
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev.message === message ? { message: '', type: null } : prev);
    }, 6000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      const fetchedLogs = await getAuditLogs();
      const fetchedIsps = await getAllISPs();
      const fetchedPlans = await getAllPlans();
      const fetchedInvoices = await getAllInvoices();
      
      // Fetch system configuration
      const config = await getSystemConfig();
      setSystemConfig(config);
      if (config) {
        setConfigGracePeriodDays(config.gracePeriodDays.toString());
        setConfigSuspendOverdue(config.suspendOverdue);
        setConfigSystemBillingEmail(config.systemBillingEmail);
        setConfigAutoInvoicingStatus(config.autoInvoicingStatus);
        setConfigSmtpHost(config.smtpHost || 'smtp.gmail.com');
        setConfigSmtpPort((config.smtpPort || 587).toString());
        setConfigSmtpUser(config.smtpUser || 'facturacion@ticcol.co');
        setConfigSmtpPassword(config.smtpPassword || 'app-password-example-key');
        setConfigSmtpSecure(config.smtpSecure !== false);
        setConfigWhatsappApiUrl(config.whatsappApiUrl || 'https://graph.facebook.com/v19.0');
        setConfigWhatsappToken(config.whatsappToken || 'EAAG6...');
        setConfigWhatsappPhoneId(config.whatsappPhoneId || '28198711...');
        setConfigTrm((config.trm ?? 4000).toString());
      }
      
      setUsers(fetchedUsers);
      setLogs(fetchedLogs);
      setIsps(fetchedIsps);
      setPlans(fetchedPlans);
      setInvoices(fetchedInvoices);

      // Extract client counts for each active ISP
      const countMap: { [ispId: string]: number } = {};
      for (const singleIsp of fetchedIsps) {
        try {
          const clients = await getISPClients(singleIsp.id);
          countMap[singleIsp.id] = clients.length;
        } catch (e) {
          countMap[singleIsp.id] = 0;
        }
      }
      setClientCounts(countMap);

    } catch (error: any) {
      console.error(error);
      showNotification('Error al contactar base de datos Firestore.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Plans CRUD Handlers
  const handleCreatePlanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!planName) {
      showNotification('Por favor complete el Nombre del plan.', 'error');
      return;
    }

    try {
      const maxClientsNum = parseInt(planMaxClients);
      const priceMonthlyNum = parseFloat(planPriceMonthly);

      if (isNaN(maxClientsNum) || maxClientsNum <= 0) {
        showNotification('Límite de clientes inválido.', 'error');
        return;
      }
      if (isNaN(priceMonthlyNum) || priceMonthlyNum < 0) {
        showNotification('Precio mensual inválido.', 'error');
        return;
      }

      // Generate a planId if input is provided, or let firestore generate it
      const finalPlanId = planIdInput.trim() ? planIdInput.trim() : undefined;

      await createPlan({
        name: planName,
        maxClients: maxClientsNum,
        priceMonthly: priceMonthlyNum,
        description: planDescription,
        id: finalPlanId,
      }, currentUser.email);

      showNotification(`El Plan "${planName}" ha sido registrado correctamente en la base de datos.`, 'success');
      
      // Reset variables
      setPlanIdInput('');
      setPlanName('');
      setPlanMaxClients('100');
      setPlanPriceMonthly('200000');
      setPlanDescription('');
      setShowAddPlanDrawer(false);
      
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al crear plan.', 'error');
    }
  };

  const handleUpdatePlanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      const maxClientsNum = parseInt(editPlanMaxClients);
      const priceMonthlyNum = parseFloat(editPlanPriceMonthly);

      if (isNaN(maxClientsNum) || maxClientsNum <= 0) {
        showNotification('Límite de clientes inválido.', 'error');
        return;
      }
      if (isNaN(priceMonthlyNum) || priceMonthlyNum < 0) {
        showNotification('Precio mensual inválido.', 'error');
        return;
      }

      await updatePlan(editingPlan.id, {
        name: editPlanName,
        maxClients: maxClientsNum,
        priceMonthly: priceMonthlyNum,
        description: editPlanDescription,
      }, currentUser.email);

      showNotification(`Plan "${editPlanName}" actualizado con éxito.`, 'success');
      setEditingPlan(null);
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar el Plan.', 'error');
    }
  };

  const handleDeletePlanClick = async (planToDelete: ISPPlan) => {
    // Check if any ISP is currently using this plan
    const isPlanInUse = isps.some(isp => isp.planId === planToDelete.id);
    if (isPlanInUse) {
      showNotification(`No se puede eliminar el Plan "${planToDelete.name}" porque está asignado actualmente a uno o más ISPs. Modifica los ISPs primero.`, 'error');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente el Plan "${planToDelete.name}"? Los ISPs no podrán seleccionarlo en el futuro.`)) {
      return;
    }

    try {
      await deletePlan(planToDelete.id, planToDelete.name, currentUser.email);
      showNotification(`El Plan "${planToDelete.name}" ha sido eliminado.`, 'success');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar el Plan.', 'error');
    }
  };

  // ISPs Handlers
  const handleCreateISPSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ispName || !ispEmail || !ispPassword) {
      showNotification('Por favor complete Nombre, Correo y Contraseña inicial.', 'error');
      return;
    }

    try {
      // Find plan details
      const matchedPlan = plans.find(p => p.id === ispPlanId) || DEFAULT_PLANS.find(p => p.id === ispPlanId) || plans[0] || DEFAULT_PLANS[0];
      
      await createISP({
        name: ispName,
        email: ispEmail,
        password: ispPassword,
        planId: matchedPlan.id,
        billingType: ispBillingType,
        status: ispStatus,
        lastBillingDate: new Date().toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }, currentUser.email);

      showNotification(`El ISP "${ispName}" ha sido registrado correctamente y se configuró un acceso administrativo para su correo.`, 'success');
      
      // Reset variables
      setIspName('');
      setIspEmail('');
      setIspPassword('');
      setIspPlanId('plan_basic');
      setIspBillingType('Manual');
      setIspStatus('Active');
      setShowAddISPDrawer(false);
      
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al aprovisionar ISP.', 'error');
    }
  };

  const handleUpdateISPSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingISP) return;

    try {
      const updateFields: Partial<ISP> = {
        name: editIspName,
        planId: editIspPlan,
        billingType: editIspBilling,
        status: editIspStatus,
      };

      if (editIspPassword) {
        updateFields.password = editIspPassword;
      }

      await updateISP(editingISP.id, updateFields, currentUser.email);
      showNotification(`ISP "${editIspName}" actualizado con éxito.`, 'success');
      setEditingISP(null);
      setEditIspPassword('');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar el ISP.', 'error');
    }
  };

  const handleStatusToggle = async (ispItem: ISP) => {
    const nextStatus = ispItem.status === 'Active' ? 'Suspended' : 'Active';
    const actionLabel = nextStatus === 'Active' ? 'Reactivar' : 'Suspender';
    
    if (!window.confirm(`¿Está seguro de que desea ${actionLabel} el ISP "${ispItem.name}"? Los cambios restringirán de inmediato el panel operativo del inquilino.`)) {
      return;
    }

    try {
      await updateISP(ispItem.id, { status: nextStatus }, currentUser.email);
      showNotification(`ISP "${ispItem.name}" ha sido ${nextStatus === 'Active' ? 'Activado' : 'Suspendido'} con éxito.`, 'success');
      loadAllData();
    } catch (err: any) {
      showNotification('Error al alternar estado del inquilino.', 'error');
    }
  };

  const handleDeleteISPClick = async (ispToDelete: ISP) => {
    if (!window.confirm(`¡CRÍTICO! ¿Está seguro que desea eliminar a "${ispToDelete.name}" de forma definitiva? Se eliminarán todas sus credenciales, base de datos del cliente e historial de forma definitiva. Esta acción no se puede revertir.`)) {
      return;
    }

    try {
      await deleteISP(ispToDelete.id, ispToDelete.name, currentUser.email);
      showNotification(`ISP prugado por completo del sistema global.`, 'success');
      loadAllData();
    } catch (err: any) {
      showNotification('Error al eliminar ISP.', 'error');
    }
  };

  // manual invoice execution
  const handleTriggerManualBillingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!billingTargetISP) return;

    const amount = parseFloat(manualBillAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification('Monto de cobro inválido.', 'error');
      return;
    }

    try {
      const plansList = plans.length > 0 ? plans : DEFAULT_PLANS;
      const matchedPlan = plansList.find(p => p.id === billingTargetISP.planId) || plansList[0];
      
      await triggerManualBilling(
        billingTargetISP.id, 
        amount, 
        `${matchedPlan.name} (Cobro Manual)`, 
        manualBillDate, 
        currentUser.email
      );

      showNotification(`Factura manual autorizada por $${amount.toLocaleString()} COP para ${billingTargetISP.name}. Ciclo de pago actualizado.`, 'success');
      setBillingTargetISP(null);
      loadAllData();
    } catch (err: any) {
      showNotification('Error al emitir factura manual.', 'error');
    }
  };

  // run billing cron routine
  const handleRunAutomatedBillingEngine = async () => {
    setBillingProcessing(true);
    showNotification('Ejecutando motor de reconciliación de cobros para ISPs Recurrentes...', 'info');

    try {
      const result = await processRecurringBillingRun(currentUser.email);
      setLastBillingRunResult(result);
      
      const parts = [
        `Se han emitido ${result.invoicesGenerated} nuevas facturas mensuales ($${result.billingTotalGenerated.toLocaleString()} COP).`
      ];
      if (result.ispsSuspendedCount > 0) {
        parts.push(`Se suspendió a ${result.ispsSuspendedCount} ISPs en mora (${result.ispsSuspendedNames.join(', ')}).`);
      }
      if (result.ispsReactivatedCount > 0) {
        parts.push(`Se reactivó a ${result.ispsReactivatedCount} ISPs liquidados (${result.ispsReactivatedNames.join(', ')}).`);
      }
      
      showNotification(`Procesador de Cobros: ${parts.join(' ')}`, 'success');
      loadAllData();
    } catch (err) {
      showNotification('Error al procesar ciclo de cobro y analizar suspensiones.', 'error');
    } finally {
      setBillingProcessing(false);
    }
  };

  const handleSaveSystemConfigSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const graceDays = parseInt(configGracePeriodDays);
      if (isNaN(graceDays) || graceDays < 0) {
        showNotification('El periodo de gracia debe ser un entero válido (>= 0).', 'error');
        setSavingConfig(false);
        return;
      }
      const portVal = parseInt(configSmtpPort);
      if (isNaN(portVal) || portVal <= 0) {
        showNotification('El puerto SMTP debe ser un número entero válido.', 'error');
        setSavingConfig(false);
        return;
      }
      await saveSystemConfig({
        gracePeriodDays: graceDays,
        suspendOverdue: configSuspendOverdue,
        systemBillingEmail: configSystemBillingEmail,
        autoInvoicingStatus: configAutoInvoicingStatus,
        smtpHost: configSmtpHost,
        smtpPort: portVal,
        smtpUser: configSmtpUser,
        smtpPassword: configSmtpPassword,
        smtpSecure: configSmtpSecure,
        whatsappApiUrl: configWhatsappApiUrl,
        whatsappToken: configWhatsappToken,
        whatsappPhoneId: configWhatsappPhoneId,
        trm: parseFloat(configTrm)
      }, currentUser.email);

      showNotification('Parámetros de facturación, correo SMTP y WhatsApp Meta actualizados con éxito.', 'success');
      loadAllData();
    } catch (err) {
      showNotification('Error al persistir configuraciones en el microservicio.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Automated Invoice Send & Print handlers
  const handleSendInvoiceEmail = async (invoice: Invoice) => {
    setIsSendingEmail(true);
    showNotification(`Iniciando Cola SMTP para factura ${invoice.id}...`, 'info');
    
    // Simulate multi-phase SMTP connection and relay
    const phases = [
      `[SMTP] Conectando a servidor de correo de terceros: ${configSmtpHost}:${configSmtpPort}...`,
      `[SMTP] Negociando cifrado seguro TLS/SSL (Secure: ${configSmtpSecure ? 'SÍ' : 'NO'})...`,
      `[SMTP] Autenticando credenciales de origen: ${configSmtpUser}...`,
      `[SMTP] Generando PDF virtual para ISP Inquilino: ${invoice.ispName}...`,
      `[SMTP] Transmitiendo cuerpo del email a la plantilla de facturación...`,
      `[SMTP] Mensaje entregado exitosamente al servidor relay corporativo.`
    ];

    for (let i = 0; i < phases.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      console.log(phases[i]);
    }

    try {
      await createAuditLog(
        'Invoice Sent via Email',
        `Factura #${invoice.id} ($${invoice.amount.toLocaleString()} COP) enviada con éxito desde SMTP (${configSmtpUser}) a los administradores del ISP ${invoice.ispName}.`,
        currentUser.email
      );
      showNotification(`¡Factura #${invoice.id} enviada via Email con éxito por SMTP relay!`, 'success');
    } catch (err) {
      showNotification('Error al registrar auditoría de transmisión.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendInvoiceWhatsapp = async (invoice: Invoice) => {
    setIsSendingWhatsapp(true);
    showNotification(`Iniciando API de WhatsApp para factura ${invoice.id}...`, 'info');

    // Simulate WhatsApp meta submission
    const phases = [
      `[WhatsApp API] Contatando Endpoint de Meta Business: ${configWhatsappApiUrl}/${configWhatsappPhoneId}/messages...`,
      `[WhatsApp API] Validando Token de acceso de seguridad (Bearer ${configWhatsappToken.substring(0, 8)}...)...`,
      `[WhatsApp API] Renderizando plantilla multimedia con enlace PDF de la factura...`,
      `[WhatsApp API] Transmitiendo de forma inmediata a los canales registrados...`,
      `[WhatsApp API] Mensaje enviado éxitosamente. MSGID: wa_msg_${Math.random().toString(36).substring(7)}`
    ];

    for (let i = 0; i < phases.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(phases[i]);
    }

    try {
      await createAuditLog(
        'Invoice Sent via WhatsApp',
        `Factura #${invoice.id} notificada vía WhatsApp (Meta Client ID ${configWhatsappPhoneId}) de forma instantánea al canal móvil del ISP ${invoice.ispName}.`,
        currentUser.email
      );
      showNotification(`¡Notificación de factura #${invoice.id} enviada con éxito vía WhatsApp!`, 'success');
    } catch (err) {
      showNotification('Error al registrar auditoría de WhatsApp.', 'error');
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleDownloadInvoiceTXT = (invoice: Invoice) => {
    try {
      const content = `========================================================
             FACTURA DE SERVICIOS - MULTITENANT PORTAL
========================================================
ID FACTURA  : ${invoice.id}
FECHA EMISION: ${new Date(invoice.billingDate).toLocaleString()}
FECHA VENCE  : ${new Date(invoice.dueDate).toLocaleString()}
--------------------------------------------------------
CLIENTE      : ${invoice.ispName}
SOPORTE      : ${configSystemBillingEmail}
ESTADO       : ${invoice.status.toUpperCase()}
MODALIDAD    : ${invoice.billingType === 'Recurring' ? 'RECURRENTE MENSUAL' : 'MANUAL'}
--------------------------------------------------------
PLAN OPERACION: ${invoice.planName}
TOTAL A PAGAR : $${invoice.amount.toLocaleString()} COP (Equiv. aprox. $${(invoice.amount / (systemConfig?.trm || 4000)).toFixed(2)} USD)
--------------------------------------------------------
Información de Pago:
Realizar transferencia bancaria o pago por consignación
a la cuenta corporativa autorizada por el Kernel.
========================================================
            GRACIAS POR SU PREFERENCIA - TICCOL CO
========================================================`;
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factura_${invoice.id}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      
      showNotification(`Descargando datos oficiales de la Factura #${invoice.id}...`, 'success');
    } catch (err) {
      showNotification('Error al descargar estructura de la factura.', 'error');
    }
  };

  const handlePrintInvoice = (invoice: Invoice | null) => {
    if (!invoice) return;
    
    // Create an iframe to print cleanly without messing up the main app layout
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position: absolute; width: 0; height: 0; left: -9999px;');
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <title>Factura de Venta #${invoice.id}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #111; background: #fff; }
              .invoice-card { max-width: 650px; margin: 0 auto; border: 1px solid #ddd; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 20px; }
              .company-info { text-align: left; }
              .title { font-size: 24px; font-weight: bold; color: #1d4ed8; letter-spacing: -0.025em; }
              .subtitle { font-size: 11px; text-transform: uppercase; tracking: 0.1em; color: #6b7280; font-weight: bold; margin-top: 4px; }
              .meta { font-size: 11px; color: #4b5563; text-align: right; line-height: 1.6; }
              .bill-to { margin-vertical: 30px; font-size: 13px; line-height: 1.5; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; }
              .bill-title { text-transform: uppercase; font-size: 9px; font-weight: 800; color: #64748b; margin-bottom: 6px; letter-spacing: 0.05em; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .table th { background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 10px; font-size: 11px; text-transform: uppercase; text-align: left; color: #475569; font-weight: bold; }
              .table td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; font-size: 12px; }
              .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
              .summary-box { width: 280px; line-height: 1.8; font-size: 12px; }
              .summary-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 5px 0; color: #475569; }
              .total { font-weight: bold; font-size: 15px; border-top: 2px solid #cbd5e1; padding-top: 8px; color: #0f172a; }
              .stamp-container { display: flex; justify-content: flex-end; margin-top: 15px; }
              .stamp { display: inline-block; padding: 6px 14px; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 11px; border: 2px dashed; letter-spacing: 0.05em; }
              .stamp-Paid { color: #16a34a; border-color: #16a34a; background: #f0fdf4; }
              .stamp-Pending { color: #d97706; border-color: #d97706; background: #fffbeb; }
              .stamp-Overdue { color: #e11d48; border-color: #e11d48; background: #fff1f2; }
              .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="invoice-card">
              <div class="header">
                <div class="company-info">
                  <div class="title">TICCOL S.A.S.</div>
                  <div class="subtitle">Soluciones de Conectividad Multitenant</div>
                </div>
                <div class="meta">
                  <strong>NIT:</strong> 901.442.115-3<br/>
                  <strong>Dirección:</strong> Av. El Dorado #68C-41, Bogotá<br/>
                  <strong>Soporte:</strong> ${configSystemBillingEmail}<br/>
                  <strong>F. Emisión:</strong> ${new Date(invoice.billingDate).toLocaleDateString()}<br/>
                  <strong>F. Vence:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}
                </div>
              </div>
              
              <div style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: bold; color: #334155; font-family: monospace;">FACTURA No. #${invoice.id}</span>
                <span style="font-size: 11px; color: #64748b; font-weight: 500;">Generado de forma inmutable</span>
              </div>

              <div class="bill-to">
                <div class="bill-title">Facturado A:</div>
                <strong style="font-size: 14px; color: #0f172a;">${invoice.ispName}</strong><br/>
                <span style="color: #475569; font-size: 12px; margin-top: 2px; display: block;">Inquilino ISP Autorizado en el Sistema</span>
                <span style="color: #64748b; font-size: 11px; display: block; margin-top: 4px;">Modalidad de Pago: ${invoice.billingType === 'Recurring' ? 'Cobro Recurrente Amortizado' : 'Orden Prepago Manual'}</span>
              </div>

              <table class="table">
                <thead>
                  <tr>
                    <th>Descripción de Licencia</th>
                    <th style="text-align: center; width: 60px;">Cant.</th>
                    <th style="text-align: right; width: 100px;">Unitario</th>
                    <th style="text-align: right; width: 100px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong style="color: #1e293b;">Servicio Core / Licenciamiento Mensual - Plan ${invoice.planName}</strong>
                      <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
                        Aprovisionamiento de cuota de clientes dedicados, bases de datos aisladas e infraestructura Cloud Run.
                      </div>
                    </td>
                    <td style="text-align: center;">1</td>
                    <td style="text-align: right;">$${invoice.amount.toLocaleString()} COP</td>
                    <td style="text-align: right; font-weight: 500; color: #0f172a;">$${invoice.amount.toLocaleString()} COP</td>
                  </tr>
                </tbody>
              </table>

              <div class="summary">
                <div class="summary-box">
                  <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>$${invoice.amount.toLocaleString()} COP</span>
                  </div>
                  <div class="summary-row">
                    <span>Amortización / Descuentos:</span>
                    <span>$0 COP</span>
                  </div>
                  <div class="summary-row">
                    <span>Impuestos (IVA 0.00%):</span>
                    <span>$0 COP</span>
                  </div>
                  <div class="summary-row total">
                    <span>Total Neto a Pagar:</span>
                    <span style="font-family: monospace;">$${invoice.amount.toLocaleString()} COP</span>
                  </div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 10px; text-align: right;">
                    Equivalente en USD: $${(invoice.amount / (systemConfig?.trm || 4000)).toFixed(2)} USD (TRM: ${systemConfig?.trm || 4000})
                  </div>
                  <div class="stamp-container">
                    <span class="stamp stamp-${invoice.status}">
                      ${invoice.status === 'Paid' ? 'PAGADA / LIQUIDADA' : invoice.status === 'Pending' ? 'PENDIENTE DE PAGO' : 'VENCIDA / EN MORA'}
                    </span>
                  </div>
                </div>
              </div>

              <div class="footer">
                Este recibo digital ha sido generado de manera automática y auditada por el Kernel corporativo de TICCOL.<br/>
                Para reportes de incidencias o reclamaciones, contactar con soporte técnico a través de: <strong>${configSystemBillingEmail}</strong>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.frameElement.remove();
                }, 100);
              }
            </script>
          </body>
        </html>
      `);
      iframeDoc.close();
    }
  };

  // Collaborators CRUD handlers
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formPassword) {
      showNotification('Email y Contraseña son campos obligatorios.', 'error');
      return;
    }
    
    try {
      await createUser({
        email: formEmail,
        password: formPassword,
        name: formName || formEmail.split('@')[0],
        role: formRole,
        status: formStatus
      }, currentUser.email);

      showNotification(`Colaborador ${formEmail} creado de forma exitosa.`, 'success');
      
      // Reset
      setFormEmail('');
      setFormPassword('');
      setFormName('');
      setFormRole('User');
      setFormStatus('Active');
      setActiveTab('users');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al registrar colaborador.', 'error');
    }
  };

  const handleUpdateCollaboratorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const fieldsToUpdate: Partial<UserAccount> = {
        name: editName,
        role: editRole,
        status: editStatus,
      };

      if (editPassword) {
        fieldsToUpdate.password = editPassword;
      }

      await updateUser(editingUser.uid, fieldsToUpdate, currentUser.email);
      showNotification(`Colaborador actualizado con éxito.`, 'success');
      setEditingUser(null);
      setEditPassword('');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar el colaborador.', 'error');
    }
  };

  const handleDeleteCollaboratorClick = async (userToDelete: UserAccount) => {
    if (userToDelete.email.toLowerCase() === currentUser.email.toLowerCase()) {
      showNotification('No puedes eliminar tu propia cuenta SuperAdmin activa.', 'error');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea retirar al colaborador "${userToDelete.email}"?`)) {
      return;
    }

    try {
      await deleteUser(userToDelete.uid, userToDelete.email, currentUser.email);
      showNotification(`Cuenta de colaborador removida del panel.`, 'success');
      loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Error al retirar la cuenta.', 'error');
    }
  };

  // Filters results
  const filteredUsers = users.filter(user => {
    const isCollaborator = !user.ispId; // exclude those users belonging to ISPs inside the collaborator tab
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return isCollaborator && matchesSearch && matchesRole;
  });

  const filteredISPs = isps.filter(isp => {
    const matchesQuery = 
      isp.name.toLowerCase().includes(ispSearchQuery.toLowerCase()) || 
      isp.email.toLowerCase().includes(ispSearchQuery.toLowerCase());
    const matchesPlan = planFilter === 'All' || isp.planId === planFilter;
    return matchesQuery && matchesPlan;
  });

  // Calculate Metrics Panel
  const ispCount = isps.length;
  const activeIsps = isps.filter(i => i.status === 'Active').length;
  const totalRevenue = invoices.reduce((acc, current) => acc + current.amount, 0);
  const totalClientsManaged = Object.values(clientCounts).reduce((a: number, b: number) => a + b, 0);

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

      {/* Sidebar navigation panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#161b22] border-r border-gray-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          
          <div className="p-6 border-b border-gray-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Shield size={22} className="animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-md font-bold text-white tracking-wide">Control Center</h1>
                <span className="text-[10px] text-emerald-450 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  SuperAdmin Live
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Connected Admin identity tag */}
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/40">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">SuperUsuario</p>
            <p className="text-xs font-semibold text-white truncate mt-1">{currentUser.name || currentUser.email}</p>
            <span className="inline-block bg-purple-950 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/20 mt-1.5 uppercase">
              {currentUser.role} Control
            </span>
          </div>

          {/* Navigation Links list */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setActiveTab('isps');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'isps' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Wifi size={17} />
              <span>Gestión de ISPs</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('plans');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'plans' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Layers size={17} />
              <span>Gestión de Planes</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'users' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Users size={17} />
              <span>Colaboradores</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('add_isp');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'add_isp' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <UserPlus size={17} />
              <span>Aprovisionamiento</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('permissions');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'permissions' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Shield size={17} />
              <span>Tabla de Privilegios</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('system_config');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'system_config' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Settings size={17} />
              <span>Configuración y Gateways</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('billing_management');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'billing_management' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <CreditCard size={17} />
              <span>Facturador y Cobros</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('logs');
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'logs' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold' 
                  : 'text-gray-400 hover:bg-[#1f242c] hover:text-gray-200'
              }`}
            >
              <Activity size={17} />
              <span>Bitácora Auditora</span>
            </button>
          </nav>

        </div>

        {/* Action button: system logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-455 hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            <LogOut size={17} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Primary operating workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Banner header titles */}
        <header className="p-6 bg-[#161b22] border-b border-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-gray-400 hover:text-white md:hidden -ml-2"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
              {activeTab === 'isps' && 'Consola de Control de ISPs Registrados'}
              {activeTab === 'plans' && 'Gestión de Planes de Suscripción'}
              {activeTab === 'users' && 'Colaboradores del Portal Principal'}
              {activeTab === 'add_isp' && 'Dar de Alta Inquilino / ISP'}
              {activeTab === 'logs' && 'Bitácora Transaccional y Auditoría Real-Time'}
              {activeTab === 'permissions' && 'Modelado Jerárquico de Autorizaciones'}
              {activeTab === 'system_config' && 'Configuración de Parámetros y Pasarelas'}
              {activeTab === 'billing_management' && 'Gestión de Cobros y Libro Contable'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'isps' && 'Súpervisión de cuota de clientes, activación, suspensión, facturación manual u automática amortizada.'}
              {activeTab === 'plans' && 'Defina, edite y elimine los planes de precios y cuotas máximas de clientes para los ISPs.'}
              {activeTab === 'users' && 'Registre o revoque accesos del equipo de ingeniería principal.'}
              {activeTab === 'add_isp' && 'Registre un ISP configurando sus límites máximos, direccionamiento y ciclos de contabilidad.'}
              {activeTab === 'logs' && 'Registro inmutable de acciones críticas procesadas por el sistema corporativo.'}
              {activeTab === 'permissions' && 'Matriz detallada para las políticas de resguardo basadas en roles.'}
              {activeTab === 'system_config' && 'Ajuste periodos de gracia, suspenciones por mora automática e ingrese los datos de SMTP (Gmail) y WhatsApp Meta API.'}
              {activeTab === 'billing_management' && 'Inicie cobros recurrentes a sus inquilinos de manera manual o automática, y administre, descargue y notifique facturas.'}
            </p>
          </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg border border-gray-700 transition-all cursor-pointer disabled:opacity-50 text-gray-300"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>Sincronizar Firestore</span>
            </button>
          </div>
        </header>

        {/* Content container */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Notifications banner box */}
          <AnimatePresence>
            {notification.type && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl flex items-start gap-3 border ${
                  notification.type === 'success'
                    ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20'
                    : notification.type === 'error'
                    ? 'bg-rose-950/30 text-rose-300 border-rose-500/20'
                    : 'bg-blue-950/30 text-blue-300 border-blue-500/20'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={17} />
                ) : notification.type === 'error' ? (
                  <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={17} />
                ) : (
                  <Sparkles className="text-blue-400 shrink-0 mt-0.5 animate-pulse" size={17} />
                )}
                <span className="text-sm font-medium">{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium stats widgets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <motion.div whileHover={{ y: -2 }} className="bg-[#161b22] border border-gray-800 p-4 rounded-xl flex items-center gap-3.5 shadow-lg">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Wifi size={18} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total ISPs Registrados</p>
                <p className="text-lg font-extrabold text-white mt-0.5">{loading ? '...' : ispCount}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="bg-[#161b22] border border-gray-800 p-4 rounded-xl flex items-center gap-3.5 shadow-lg">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-[10px] text-gray-505 font-bold uppercase tracking-wider">ISPs Activos</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{loading ? '...' : activeIsps}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="bg-[#161b22] border border-gray-800 p-4 rounded-xl flex items-center gap-3.5 shadow-lg">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Layers size={18} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Clientes de Internet Activos</p>
                <p className="text-lg font-extrabold text-white mt-0.5">{loading ? '...' : totalClientsManaged}</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="bg-[#161b22] border border-gray-800 p-4 rounded-xl flex items-center gap-3.5 shadow-lg">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Facturación Consolidada</p>
                <p className="text-lg font-extrabold text-amber-450 mt-0.5">
                  ${loading ? '...' : totalRevenue.toLocaleString()} COP 
                  <span className="text-xs font-normal text-gray-500 ml-1.5">
                    (${(totalRevenue / (systemConfig?.trm || 4000)).toFixed(2)} USD)
                  </span>
                </p>
              </div>
            </motion.div>

          </div>

          {/* Primary View Area layout */}
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            
            {/* Tab: ISPs management Panel */}
            {activeTab === 'isps' && (
              <div>
                
                {/* Search controls + Recurring Billings engine trigger */}
                <div className="p-6 border-b border-gray-800 bg-[#1f242c]/20 flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="w-full sm:w-72 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={15} />
                      <input
                        type="text"
                        placeholder="Buscar ISP por nombre o correo..."
                        value={ispSearchQuery}
                        onChange={(e) => setIspSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-300 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="w-full sm:w-auto bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm px-3 py-2 text-gray-450 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="All">Todos los Planes</option>
                        {/* Se actualiza para contemplar los planes personalizados */}
                        {(plans.length > 0 ? plans : DEFAULT_PLANS).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Engine triggers */}
                  <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                    <button
                      onClick={handleRunAutomatedBillingEngine}
                      disabled={billingProcessing || loading}
                      className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      title="Procesa y emite facturas recurrentes de los ISPs en ciclo vencido"
                    >
                      <Play size={14} className={billingProcessing ? "animate-spin" : ""} />
                      <span>Ejecutar Procesador Recurrente</span>
                    </button>
                    
                    <button
                      onClick={() => setShowAddISPDrawer(true)}
                      className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Plus size={16} />
                      <span>Nuevo ISP</span>
                    </button>
                  </div>
                </div>

                {/* ISPs List inside Firestore */}
                {loading ? (
                  <div className="p-12 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-xs mt-3">Recuperando terminales y lecturas de cuota en vivo...</p>
                  </div>
                ) : filteredISPs.length === 0 ? (
                  <div className="p-12 text-center">
                    <Wifi size={44} className="mx-auto text-gray-700 mb-3" />
                    <h4 className="text-sm font-bold text-gray-300">No hay ISPs aprovisionados</h4>
                    <p className="text-xs text-gray-500 mt-1">Haga clic en "Nuevo ISP" superior para agregar su primer terminal inquilino.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/10 text-[10px] uppercase tracking-wider font-bold text-gray-500">
                          <th className="py-4 px-6">ISP inquilino</th>
                          <th className="py-4 px-6">Plan asignado</th>
                          <th className="py-2.5 px-6">Consumo de clientes (Cuota)</th>
                          <th className="py-4 px-6">Ciclo de facturación</th>
                          <th className="py-4 px-6">Estado</th>
                          <th className="py-4 px-6 text-right">Controles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/70 text-xs">
                        {filteredISPs.map((isp) => {
                          const matchedPlan = plans.find(p => p.id === isp.planId) || DEFAULT_PLANS.find(p => p.id === isp.planId);
                          const clientsLimit = matchedPlan?.maxClients || 100;
                          const currentClients = clientCounts[isp.id] || 0;
                          const ratio = clientsLimit > 0 ? (currentClients / clientsLimit) * 100 : 0;
                          
                          return (
                            <tr key={isp.id} className="hover:bg-gray-900/10 transition-colors">
                              {/* Name & Credentials Info */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center shrink-0 text-xs border ${
                                    isp.status === 'Active' 
                                      ? 'bg-blue-500/15 text-blue-450 border-blue-500/20' 
                                      : 'bg-rose-500/15 text-rose-455 border-rose-500/20'
                                  }`}>
                                    {isp.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-sm">{isp.name}</p>
                                    <p className="text-[11px] text-gray-505 mt-0.5">{isp.email}</p>
                                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">Sufijo DB: <strong className="text-gray-500">{isp.customDatabaseSuffix}</strong></p>
                                  </div>
                                </div>
                              </td>

                              {/* Selected Plan Details */}
                              <td className="py-4 px-6">
                                <span className="bg-gray-905 border border-gray-800 px-2.5 py-1 rounded text-[11px] text-gray-300 font-medium">
                                  {matchedPlan?.name || 'Plan Indeterminado'}
                                </span>
                                <p className="text-[10px] text-orange-450 mt-1 font-mono">${matchedPlan?.priceMonthly ?? 0} COP <span className="text-[8px] text-gray-500">(${( (matchedPlan?.priceMonthly || 0) / (systemConfig?.trm || 4000)).toFixed(2)} USD)</span>/mes</p>
                              </td>

                              {/* Limit Mettering gauge */}
                              <td className="py-4 px-6">
                                <div className="flex items-baseline gap-1">
                                  <span className="font-extrabold text-white">{currentClients}</span>
                                  <span className="text-gray-505 font-mono text-[10px]">/ de {clientsLimit >= 9999 ? 'Sin límite' : clientsLimit}</span>
                                </div>
                                <div className="w-28 bg-gray-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-gray-850/40">
                                  <div 
                                    className={`h-full rounded-full ${ratio > 90 ? 'bg-rose-500' : ratio > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.min(100, ratio)}%` }}
                                  />
                                </div>
                              </td>

                              {/* Billing periodicity and Dates */}
                              <td className="py-4 px-6">
                                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  isp.billingType === 'Recurring' 
                                    ? 'bg-purple-950/40 text-purple-300 border border-purple-500/10' 
                                    : 'bg-blue-950/40 text-blue-300 border border-blue-500/10'
                                }`}>
                                  {isp.billingType === 'Recurring' ? 'Mensual Recurrente' : 'Prepago Manual'}
                                </span>
                                <p className="text-[10px] text-gray-505 mt-1 font-mono">Última: {new Date(isp.lastBillingDate).toLocaleDateString()}</p>
                                <p className="text-[10px] text-gray-450 font-semibold font-mono">Vencimiento: {new Date(isp.nextBillingDate).toLocaleDateString()}</p>
                              </td>

                              {/* Status Badges */}
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => handleStatusToggle(isp)}
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer ${
                                    isp.status === 'Active' 
                                      ? 'text-emerald-450' 
                                      : 'text-rose-455'
                                  }`}
                                  title="Haga clic para suspender/reactivar este inquilino"
                                >
                                  {isp.status === 'Active' ? (
                                    <>
                                      <CheckCircle size={14} className="shrink-0" />
                                      Activo
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={14} className="shrink-0 animate-pulse" />
                                      Suspendido
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Actions controls */}
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  
                                  {/* billing triggers and plan editing in one div */}
                                  <div className="flex flex-row items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        const matched = plans.find(p => p.id === isp.planId);
                                        setBillingTargetISP(isp);
                                        setManualBillAmount(String(matched?.priceMonthly || '200000'));
                                        setManualBillDate(new Date().toISOString().substring(0, 10));
                                      }}
                                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded border border-amber-500/20 cursor-pointer transition-colors"
                                      title="Emitir cobro manual (Facturar)"
                                    >
                                      <DollarSign size={13} />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingISP(isp);
                                        setEditIspName(isp.name);
                                        setEditIspPlan(isp.planId);
                                        setEditIspBilling(isp.billingType);
                                        setEditIspStatus(isp.status);
                                        setEditIspPassword('');
                                      }}
                                      className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
                                      title="Modificar asignaciones de plan"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                  </div>
                                  
                                  {/* Delete action in a separate div */}
                                  <div className="flex justify-end ml-1">
                                    <button
                                      onClick={() => handleDeleteISPClick(isp)}
                                      className="p-1.5 hover:bg-rose-950/20 text-gray-450 hover:text-rose-400 rounded cursor-pointer transition-colors"
                                      title="Inactivar y purgar"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}

            {/* Tab: Plans Management Panel */}
            {activeTab === 'plans' && (
              <div>
                {/* Header Actions */}
                <div className="p-6 border-b border-gray-800 bg-[#1f242c]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h3 className="text-sm font-bold text-gray-300">
                    Suscripciones y Políticas de Cuotas ({plans.length} planes catalogados)
                  </h3>
                  <button
                    onClick={() => {
                      setPlanIdInput('');
                      setPlanName('');
                      setPlanMaxClients('100');
                      setPlanPriceMonthly('200000');
                      setPlanDescription('');
                      setShowAddPlanDrawer(true);
                    }}
                    className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus size={16} />
                    <span>Nuevo Plan</span>
                  </button>
                </div>

                {/* Table list of custom plans */}
                {loading ? (
                  <div className="p-12 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-xs mt-3">Sincronizando planes de suscripción...</p>
                  </div>
                ) : plans.length === 0 ? (
                  <div className="p-12 text-center">
                    <Layers size={44} className="mx-auto text-gray-700 mb-3" />
                    <h4 className="text-sm font-bold text-gray-300">No hay planes custom creados</h4>
                    <p className="text-xs text-gray-500 mt-1">Haga clic en "Nuevo Plan" para agregar la primera cuota comercial.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/10 text-[10px] uppercase tracking-wider font-bold text-gray-500">
                          <th className="py-4 px-6">Código (ID)</th>
                          <th className="py-4 px-6">Nombre de Plan</th>
                          <th className="py-4 px-6">Límite de Clientes</th>
                          <th className="py-2.5 px-6">Tarifa Mensual</th>
                          <th className="py-2.5 px-6">Descripción</th>
                          <th className="py-4 px-6 text-right">Controles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/70 text-xs">
                        {plans.map((p) => {
                          const isDefault = ['plan_basic', 'plan_medium', 'plan_unlimited'].includes(p.id);
                          return (
                            <tr key={p.id} className="hover:bg-gray-900/10 transition-colors">
                              <td className="py-4 px-6 font-mono text-gray-400 select-all">
                                {p.id}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">{p.name}</span>
                                  {isDefault && (
                                    <span className="bg-blue-950 text-blue-300 text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20 uppercase font-semibold">
                                      Por Defecto
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6 font-semibold text-gray-300">
                                {p.maxClients >= 9999 ? (
                                  <span className="text-emerald-400">Ilimitados (∞)</span>
                                ) : (
                                  `${p.maxClients} clientes`
                                )}
                              </td>
                              <td className="py-4 px-6 font-semibold text-amber-450 font-mono">
                                ${p.priceMonthly.toLocaleString()} COP
                              </td>
                              <td className="py-4 px-6 text-gray-400 max-w-xs truncate" title={p.description || ''}>
                                {p.description || 'Sin descripción adicional'}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2 px-1">
                                  <button
                                    onClick={() => {
                                      setEditingPlan(p);
                                      setEditPlanName(p.name);
                                      setEditPlanMaxClients(String(p.maxClients));
                                      setEditPlanPriceMonthly(String(p.priceMonthly));
                                      setEditPlanDescription(p.description || '');
                                    }}
                                    className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
                                    title="Modificar Plan"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDeletePlanClick(p)}
                                    className="p-1.5 hover:bg-rose-950/20 text-gray-450 hover:text-rose-400 rounded cursor-pointer transition-colors"
                                    title="Remover Plan"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Collaborators (default user accounts) view */}
            {activeTab === 'users' && (
              <div>
                
                {/* Search collaborators */}
                <div className="p-6 border-b border-gray-800 bg-[#1f242c]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-80 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={15} />
                    <input
                      type="text"
                      placeholder="Buscar por correo o nombre..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm placeholder-gray-500 text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                      <Filter size={12} /> Filtrar Rol:
                    </span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm px-3 py-1.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="All">Todos los Roles</option>
                      <option value="SuperAdmin">SuperAdmin</option>
                      <option value="Admin">Admin</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                {loading ? (
                  <div className="p-12 text-center text-gray-400">Consultando colaboradores...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Users size={36} className="mx-auto mb-2" />
                    No se registran colaboradores coincientes.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 uppercase tracking-wider font-semibold text-[10px] text-gray-450 bg-gray-900/10">
                          <th className="py-4 px-6">Colaborador</th>
                          <th className="py-4 px-6">Nivel de Acceso</th>
                          <th className="py-4 px-6">Credencial</th>
                          <th className="py-4 px-6">Estado</th>
                          <th className="py-4 px-6 text-right">Controles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/60 text-xs">
                        {filteredUsers.map((user) => (
                          <tr key={user.uid} className="hover:bg-gray-900/10 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-semibold text-white">{user.name || 'Sin nombre asignado'}</p>
                              <p className="text-[11px] text-gray-505 mt-0.5">{user.email}</p>
                            </td>

                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                user.role === 'SuperAdmin' 
                                  ? 'bg-purple-950/40 text-purple-300 border border-purple-500/20' 
                                  : 'bg-blue-950/40 text-blue-300 border border-blue-500/20'
                              }`}>
                                <Shield size={11} /> {user.role}
                              </span>
                            </td>

                            <td className="py-4 px-6">
                              <code className="bg-gray-900 border border-gray-800 px-2 py-1 text-[11px] rounded font-mono text-gray-300">{user.password}</code>
                            </td>

                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 text-xs ${user.status === 'Active' ? 'text-emerald-450' : 'text-gray-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                {user.status === 'Active' ? 'Vigente' : 'Inactivo'}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditName(user.name || '');
                                    setEditRole(user.role);
                                    setEditStatus(user.status);
                                    setEditPassword('');
                                  }}
                                  className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCollaboratorClick(user)}
                                  className="p-1.5 hover:bg-rose-950/20 text-gray-450 hover:text-rose-400 rounded cursor-pointer transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}

            {/* Tab: Aprovisionamiento (ISP Register inline subview) */}
            {activeTab === 'add_isp' && (
              <div className="p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-3">
                    <UserPlus size={24} className="animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Alta Global de ISP</h3>
                  <p className="text-xs text-gray-400 mt-1">Sinfonía e integración multitenant inmediata de un nuevo nodo proveedor.</p>
                </div>

                <form onSubmit={handleCreateISPSubmit} className="space-y-6 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-2">Nombre Comercial ISP *</label>
                      <input
                        type="text"
                        placeholder="Ej: Fibra Soluciones S.A.S."
                        value={ispName}
                        onChange={(e) => setIspName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm placeholder-gray-600 text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-2">Correo de Acceso ISP *</label>
                      <input
                        type="email"
                        placeholder="admin@fibrasol.com"
                        value={ispEmail}
                        onChange={(e) => setIspEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm placeholder-gray-600 text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-2">Contraseña Operador ISP *</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Mínimo 6 caracteres"
                          value={ispPassword}
                          onChange={(e) => setIspPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm placeholder-gray-600 text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
                            let pass = '';
                            for (let i = 0; i < 9; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            setIspPassword(pass);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] bg-gray-800 hover:bg-gray-700 text-blue-450 px-2 py-1 rounded"
                        >
                          Generar
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-2">Plan y Límites de Canal</label>
                      <select
                        value={ispPlanId}
                        onChange={(e) => setIspPlanId(e.target.value)}
                        className="w-full bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer p-1"
                      >
                        {(plans.length > 0 ? plans : DEFAULT_PLANS).map(p => (
                          <option key={p.id} value={p.id}>{p.name} - Máx {p.maxClients >= 9999 ? 'Ilimitados' : `${p.maxClients} clientes`}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-2">Modalidad Tarifaria de Cobro</label>
                      <select
                        value={ispBillingType}
                        onChange={(e) => setIspBillingType(e.target.value as any)}
                        className="w-full bg-[#0d1117] border border-gray-800 rounded-xl text-xs sm:text-sm px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer p-1"
                      >
                        <option value="Manual">Prepago Manual (Emisión de factura bajo demanda)</option>
                        <option value="Recurring">Mensual Recurrente (Facturación automática automática)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-2.5">Estado Inicial de Conectividad</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="radio"
                            name="initialIspStatus"
                            checked={ispStatus === 'Active'}
                            onChange={() => setIspStatus('Active')}
                            className="bg-gray-900 border-gray-800 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span>Activo (Conectado)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="radio"
                            name="initialIspStatus"
                            checked={ispStatus === 'Suspended'}
                            onChange={() => setIspStatus('Suspended')}
                            className="bg-gray-900 border-gray-800 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span>Mora (Suspendido)</span>
                        </label>
                      </div>
                    </div>

                  </div>

                  <div className="pt-5 border-t border-gray-800/80 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setActiveTab('isps')}
                      className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-xl transition-colors cursor-pointer hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                    >
                      <Plus size={16} />
                      Crear IPS
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: Audit Logs */}
            {activeTab === 'logs' && (
              <div>
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#1f242c]/20">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity size={15} className="text-emerald-400" />
                    Auditoría del Kernel
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-2.5 py-0.5 rounded border border-gray-850/40 bg-gray-901">Security Live</span>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-400">Leyendo logs de seguridad...</div>
                ) : logs.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">No se registran eventos.</div>
                ) : (
                  <div className="divide-y divide-gray-850/80">
                    {logs.map((log) => (
                      <div key={log.id} className="p-5 hover:bg-gray-900/10 transition-colors flex items-start gap-4 text-xs">
                        <div className={`p-2 rounded-lg shrink-0 border ${
                          log.action.includes('Registration') || log.action.includes('Registered')
                            ? 'bg-emerald-950/40 text-emerald-350 border-emerald-500/20' 
                            : log.action.includes('Delete') || log.action.includes('Deregistration') || log.action.includes('pruge')
                            ? 'bg-rose-955/40 text-rose-350 border-rose-500/20' 
                            : log.action.includes('Update') || log.action.includes('Modified')
                            ? 'bg-amber-955/40 text-amber-350 border-amber-500/20'
                            : 'bg-blue-955/40 text-blue-350 border-blue-500/20'
                        }`}>
                          <Activity size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                            <span className="text-sm font-bold text-white">{log.action}</span>
                            <span className="text-[10px] font-mono text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{log.details}</p>
                          <p className="text-[10px] font-mono text-gray-505 mt-1.5 flex items-center gap-1.5">
                            <ArrowRight size={8} /> Firma: <span className="text-gray-400">{log.performedBy}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Permissions Policy Review */}
            {activeTab === 'permissions' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 text-gray-400">Políticas Generales del Servicio</h3>
                  <p className="text-xs text-gray-400 mb-6">Matriz corporativa que detalla los privilegios concedidos en esta plataforma.</p>
                  
                  <div className="overflow-x-auto border border-gray-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-900/50 text-[10px] font-bold text-gray-505 border-b border-gray-800 uppercase tracking-wider">
                          <th className="py-3.5 px-5">Operación / Dominio</th>
                          <th className="py-3.5 px-5 text-center">ISP Agent</th>
                          <th className="py-3.5 px-5 text-center">ISP Admin</th>
                          <th className="py-3.5 px-5 text-center bg-blue-500/5 text-blue-400 font-bold">SuperAdmin Portal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850 text-xs">
                        <tr>
                          <td className="py-4 px-5 font-semibold text-gray-300">Administración de clientes (ISP Workspace)</td>
                          <td className="py-4 px-5 text-center text-emerald-450">✅ (Solo Ver)</td>
                          <td className="py-4 px-5 text-center text-emerald-450">✅ (Completo)</td>
                          <td className="py-4 px-5 text-center text-emerald-450 bg-blue-500/5">✅ (Auditor)</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-5 font-semibold text-gray-300">Aprovisionar altas / nuevos ISPs</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-emerald-450 bg-blue-500/5">✅</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-5 font-semibold text-gray-300">Suspender de inmediato nodos de red</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-emerald-450 bg-blue-500/5">✅</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-5 font-semibold text-gray-300">Forzar facturación manual / prepago</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-emerald-450 bg-blue-500/5">✅</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-5 font-semibold text-gray-300">Ejecución del cron de cobro automático</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-emerald-450 bg-blue-500/5">✅ (Automático)</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-5 font-semibold text-gray-300">Consultar Bitácora del Kernel</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-rose-505">❌</td>
                          <td className="py-4 px-5 text-center text-emerald-450 bg-blue-500/5">✅</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DB Info Card */}
                <div className="bg-[#0f141a]/60 border border-gray-800 p-5 rounded-2xl flex items-start gap-3">
                  <HelpCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Acuerdo técnico de aislamiento</h4>
                    <p className="text-xs text-gray-400 mt-1leading-relaxed leading-relaxed">
                      La seguridad multitenancy está blindada en el nivel de cliente. Al registrar un nuevo ISP en la plataforma, Firestore inyecta un document de seguridad en `/users` que restringe el scope ID al `ispId` asignado. Cualquier intento de consulta o de rebasar la cuota de clientes del plan correspondiente disparará una excepción de seguridad gobernada por el validador del Kernel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: System Configuration and Core Gateways */}
            {activeTab === 'system_config' && (
              <div className="max-w-4xl mx-auto bg-[#161b22] border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="p-5 border-b border-gray-800 bg-[#1f242c]/20">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Settings size={15} className="text-blue-400" />
                        Microservicio de Configuración Corporativa y Gateways
                      </h3>
                    </div>
                    
                    <form onSubmit={handleSaveSystemConfigSubmit} className="p-6 space-y-6">
                      
                      {/* Section 1: General Portal Config */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest border-b border-gray-850 pb-1">
                          1. Parámetros del Portal y Conciliaciones
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                              Email del Sistema para Notificaciones
                            </label>
                            <input
                              type="email"
                              required
                              value={configSystemBillingEmail}
                              onChange={(e) => setConfigSystemBillingEmail(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 transition-colors"
                              placeholder="facturacion@ticcol.co"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                              Periodo de Gracia para Vencimientos (Días)
                            </label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={configGracePeriodDays}
                              onChange={(e) => setConfigGracePeriodDays(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 transition-colors"
                              placeholder="5"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                              Tasa Representativa del Mercado (TRM)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={configTrm}
                              onChange={(e) => setConfigTrm(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 transition-colors"
                              placeholder="4000"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                            Estado por Defecto de Nuevas Facturas Recurrentes
                          </label>
                          <select
                            value={configAutoInvoicingStatus}
                            onChange={(e) => setConfigAutoInvoicingStatus(e.target.value as 'Paid' | 'Pending')}
                            className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="Pending">Pendiente (Requiere pago manual / Transferencia)</option>
                            <option value="Paid">Pagada por Defecto (Amortización instantánea)</option>
                          </select>
                          <p className="text-[9px] text-gray-500 mt-1 leading-relaxed">
                            Las facturas en estado 'Pendiente' que rebasen su fecha límite de pago triggererán suspensiones automatizadas.
                          </p>
                        </div>

                        <div className="p-3 bg-gray-901 border border-gray-850 rounded-xl">
                          <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={configSuspendOverdue}
                              onChange={(e) => setConfigSuspendOverdue(e.target.checked)}
                              className="mt-0.5 accent-blue-500 border-gray-800 rounded bg-gray-950 cursor-pointer"
                            />
                            <div>
                              <span className="text-[11px] font-semibold text-white block">Corte Automático por Impago (Suspensiones)</span>
                              <span className="text-[9px] text-gray-450 mt-0.5 block leading-normal">
                                Si está habilitado, el Kernel suspenderá de inmediato el portal del ISP si tiene facturas vencidas (Overdue) tras finalizar el cron de escaneo.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Section 2: Email SMTP Config (including Google Gmail / Outlook compatibility) */}
                      <div className="space-y-4 pt-2 border-t border-gray-850">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            2. Servidor de Correo Corporativo (SMTP Gmail / Terceros)
                          </h4>
                          <span className="text-[8px] bg-blue-950 text-blue-400 border border-blue-800/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Relay Activo</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                              Servidor SMTP Host
                            </label>
                            <input
                              type="text"
                              required
                              value={configSmtpHost}
                              onChange={(e) => setConfigSmtpHost(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                              placeholder="smtp.gmail.com"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                              Puerto
                            </label>
                            <input
                              type="number"
                              required
                              value={configSmtpPort}
                              onChange={(e) => setConfigSmtpPort(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                              placeholder="587"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                              Usuario / Correo Emisor
                            </label>
                            <input
                              type="text"
                              required
                              value={configSmtpUser}
                              onChange={(e) => setConfigSmtpUser(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              placeholder="facturacion@ticcol.co"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                              Contraseña de Aplicación / Credencial
                            </label>
                            <input
                              type="password"
                              required
                              value={configSmtpPassword}
                              onChange={(e) => setConfigSmtpPassword(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-805 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 tracking-widest font-mono"
                              placeholder="••••••••••••••••"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="smtp_secure_chk"
                            checked={configSmtpSecure}
                            onChange={(e) => setConfigSmtpSecure(e.target.checked)}
                            className="accent-blue-500 rounded cursor-pointer"
                          />
                          <label htmlFor="smtp_secure_chk" className="text-[10px] font-semibold text-gray-450 select-none cursor-pointer">
                            Usar Conexión Segura TLS / Certificado SSL Obligatorio
                          </label>
                        </div>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          Configura tu cuenta de Gmail activando la verificación en dos pasos y generando una <strong>"Contraseña de Aplicación"</strong> de 16 dígitos exclusiva para realizar conexiones seguras desde el portal.
                        </p>
                      </div>

                      {/* Section 3: WhatsApp Service Meta API Setup */}
                      <div className="space-y-4 pt-2 border-t border-gray-850">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            3. Endpoint de Notificaciones WhatsApp (Meta Suite Dev)
                          </h4>
                          <span className="text-[8px] bg-amber-950/60 text-amber-300 border border-amber-800/10 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Próximo Módulo</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                              ID de Teléfono Remitente (Phone ID)
                            </label>
                            <input
                              type="text"
                              required
                              value={configWhatsappPhoneId}
                              onChange={(e) => setConfigWhatsappPhoneId(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-855 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                              placeholder="28198711411516"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                              URL API Base de Meta Cloud
                            </label>
                            <input
                              type="text"
                              required
                              value={configWhatsappApiUrl}
                              onChange={(e) => setConfigWhatsappApiUrl(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-855 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                              placeholder="https://graph.facebook.com/v19.0"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">
                            Token Permanente o Temporal (Meta System User Token)
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={configWhatsappToken}
                            onChange={(e) => setConfigWhatsappToken(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-855 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                            placeholder="EAAG6dbE8H0wBO..."
                          />
                          <p className="text-[9px] text-gray-500 mt-1 leading-relaxed">
                            Las conexiones de WhatsApp para facturación automática se diseñarán en el portafolio Meta. Por ahora, registre las variables del API de desarrollador para la futura integración directa.
                          </p>
                        </div>
                      </div>

                      {/* Submit action */}
                      <div className="pt-3 border-t border-gray-850 flex justify-end">
                        <button
                          type="submit"
                          disabled={savingConfig}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          {savingConfig ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          <span>Guardar Parámetros de Configuración</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

            {/* Tab: Real-Time Operational Billing Deck & Invoices Catalog */}
            {activeTab === 'billing_management' && (
              <div className="space-y-6">
                
                {/* Trigger Engine Control Grid panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Conceptual Info and Automated Runner trigger */}
                  <div className="lg:col-span-7 bg-[#161b22] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div className="space-y-4 font-sans">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            Motor de Amortizaciones Recurrentes TICCOL
                          </h3>
                          <span className="text-[9px] text-gray-500 uppercase font-bold font-mono tracking-widest block mt-0.5">Operación e Integraciones de Kernel</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 leading-relaxed font-normal">
                        El Kernel de Facturación evalúa de manera periódica el estado operativo y la cuota de clientes contratados para cada ISP multitenant. Al presionar el trigger del microservicio, la plataforma recalculará los consolidados, emitirá los cargos inmutables y de haber cuentas en mora ejecutará la desconexión segura en tiempo real.
                      </p>
                      <p className="text-xs text-gray-450 leading-relaxed font-normal">
                        El proceso de facturación automática genera notificaciones SMTP seguras enviando el formato oficial en PDF. Además, el libro contable de la parte inferior le confiere control inmediato para auditar, imprimir, actualizar estados de cartera o compartir estados a WhatsApp.
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-gray-850 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <button
                        type="button"
                        disabled={billingProcessing || loading}
                        onClick={handleRunAutomatedBillingEngine}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-650 hover:bg-emerald-555 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg flex items-center justify-center gap-2.5 font-bold text-xs cursor-pointer"
                      >
                        {billingProcessing ? (
                          <RefreshCw size={14} className="animate-spin text-white" />
                        ) : (
                          <Play size={14} className="text-white" />
                        )}
                        <span>Gatillar Procesamiento de Ciclo Mensual</span>
                      </button>
                      <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-wider">Última validación de ciclo activa</span>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Terminal logger output */}
                  <div className="lg:col-span-5 bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="p-5 border-b border-gray-800 bg-[#1f242c]/20">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                          <Play size={15} className="text-emerald-400 animate-pulse" />
                          Terminal de Control y Monitoreo del Kernel
                        </h3>
                      </div>
                      
                      <div className="p-6 space-y-4">
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Este panel interactúa con el microservicio de facturaciones recurrentes. Ejecuta la validación de ciclo mes a mes de los ISPs activos, emite sus facturas automáticas basándose en su plan de operaciones actual, y ejecuta el control general de cortes para suspender portales de deudores morosos de inmediato.
                        </p>

                        <button
                          type="button"
                          disabled={billingProcessing || loading}
                          onClick={handleRunAutomatedBillingEngine}
                          className="w-full py-3 px-4 bg-emerald-650 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 font-bold text-xs cursor-pointer"
                        >
                          {billingProcessing ? (
                            <RefreshCw size={15} className="animate-spin" />
                          ) : (
                            <Play size={15} />
                          )}
                          <span>Proceder a Facturación y Reconciliación</span>
                        </button>
                      </div>
                    </div>

                    {/* Console Logger for latest execution */}
                    <div className="p-5 border-t border-gray-800 bg-gray-950 font-mono text-[10px] space-y-2 text-gray-400">
                      <p className="text-gray-500 uppercase tracking-wider font-bold text-[9px] mb-2 border-b border-gray-900 pb-1 flex items-center justify-between">
                        <span>Terminal del Kernel</span>
                        <span className="text-emerald-500 bg-emerald-950/40 px-1.5 py-0.5 rounded text-[8px] uppercase">Online</span>
                      </p>
                      {lastBillingRunResult ? (
                        <>
                          <p className="text-blue-400">&gt; Cobros procesados con éxito.</p>
                          <p className="text-white">&gt; Facturas generadas: <span className="text-emerald-400">{lastBillingRunResult.invoicesGenerated}</span> (Monto: <span className="text-blue-400">${lastBillingRunResult.billingTotalGenerated.toLocaleString()} COP</span>)</p>
                          <p className="text-white">&gt; ISPs Suspendidos: <span className="text-rose-400">{lastBillingRunResult.ispsSuspendedCount}</span> {lastBillingRunResult.ispsSuspendedNames.length > 0 && `(${lastBillingRunResult.ispsSuspendedNames.join(', ')})`}</p>
                          <p className="text-white">&gt; Inquilinos Reactivados: <span className="text-emerald-400">{lastBillingRunResult.ispsReactivatedCount}</span> {lastBillingRunResult.ispsReactivatedNames.length > 0 && `(${lastBillingRunResult.ispsReactivatedNames.join(', ')})`}</p>
                        </>
                      ) : (
                        <p className="text-gray-650 italic">&gt; Esperando ejecución del motor de cobros...</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Bottom Section: Full Corporate Invoice Table */}
                <div className="bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1f242c]/20">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={15} className="text-blue-400" />
                        Libro Contable y Facturaciones Emitidas
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Historial unificado de transacciones. Modifique los estados de cobro para testear de manera interactiva la suspensión automatizada de portales.
                      </p>
                    </div>
                  </div>

                  {invoices.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 space-y-2">
                      <CreditCard size={28} className="mx-auto text-gray-600" />
                      <p className="text-xs">No se han registrado facturas ni cobros en la base de datos.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-900/50 text-[10px] font-bold text-gray-400 border-b border-gray-800 uppercase tracking-wider">
                            <th className="py-4 px-5">ID Factura</th>
                            <th className="py-4 px-5">Nombre ISP</th>
                            <th className="py-4 px-5">Plan Suscripto</th>
                            <th className="py-4 px-5">Modalidad</th>
                            <th className="py-4 px-5 text-right">Monto</th>
                            <th className="py-4 px-5">F. Emisión</th>
                            <th className="py-4 px-5">Vencimiento</th>
                            <th className="py-4 px-5">Estado</th>
                            <th className="py-4 px-5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850 text-xs">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-900/30 transition-colors">
                              <td className="py-3.5 px-5 font-mono text-[10px] text-blue-400">{inv.id}</td>
                              <td className="py-3.5 px-5 font-semibold text-white">{inv.ispName}</td>
                              <td className="py-3.5 px-5 text-gray-300">{inv.planName}</td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                                  inv.billingType === 'Recurring'
                                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/20'
                                    : 'bg-amber-950/40 text-amber-300 border-amber-500/20'
                                }`}>
                                  {inv.billingType === 'Recurring' ? 'Recurrente' : 'Manual'}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-right font-bold text-white font-mono">${inv.amount.toFixed(2)}</td>
                              <td className="py-3.5 px-5 text-gray-400">{new Date(inv.billingDate).toLocaleDateString()}</td>
                              <td className="py-3.5 px-5 text-gray-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20'
                                    : inv.status === 'Pending'
                                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/20'
                                    : 'bg-rose-950/40 text-rose-300 border-rose-500/20'
                                }`}>
                                  {inv.status === 'Paid' ? 'Pagada' : inv.status === 'Pending' ? 'Pendiente' : 'Expirada / Overdue'}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-center flex items-center justify-center gap-2">
                                <select
                                  value={inv.status}
                                  onChange={async (e) => {
                                    const nextStatus = e.target.value as 'Paid' | 'Pending' | 'Overdue';
                                    try {
                                      await updateInvoiceStatus(inv.id, nextStatus, currentUser.email);
                                      showNotification(`Estado de factura ${inv.id} actualizado a ${nextStatus}`, 'success');
                                      loadAllData();
                                    } catch (err) {
                                      showNotification('Error al reposicionar estado de factura.', 'error');
                                    }
                                  }}
                                  className="bg-gray-950 border border-gray-800 rounded-lg py-1 px-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                                >
                                  <option value="Paid">Marcar Pagada</option>
                                  <option value="Pending">Marcar Pendiente</option>
                                  <option value="Overdue">Marcar Vencida / Overdue</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setShowInvoicePreviewModal(true);
                                  }}
                                  className="p-1 px-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                                  title="Ver Factura PDF / Enviar / Imprimir"
                                >
                                  <Eye size={13} />
                                  <span>PDF</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </main>

      {/* DRAWER: Add/Edit ISP */}
      <AnimatePresence>
        {showAddISPDrawer && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#161b22] border-l border-gray-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus size={16} className="text-blue-400" />
                    Registrar ISP Inquilino
                  </h3>
                  <button
                    onClick={() => setShowAddISPDrawer(false)}
                    className="p-1.5 hover:bg-gray-850 rounded-lg text-gray-400 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateISPSubmit} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-1.5">Nombre Comercial</label>
                    <input
                      type="text"
                      placeholder="Ej: Fibra Soluciones"
                      value={ispName}
                      onChange={(e) => setIspName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Email de Acceso Operativo</label>
                    <input
                      type="email"
                      placeholder="ejemplo@isp.com"
                      value={ispEmail}
                      onChange={(e) => setIspEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Contraseña Operativa Inicial</label>
                    <input
                      type="text"
                      placeholder="Contraseña del nodo"
                      value={ispPassword}
                      onChange={(e) => setIspPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Plan de Capacidad</label>
                    <select
                      value={ispPlanId}
                      onChange={(e) => setIspPlanId(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl font-medium px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {(plans.length > 0 ? plans : DEFAULT_PLANS).map(p => (
                        <option key={p.id} value={p.id}>{p.name} - ${p.priceMonthly}/mes</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Tipo de Facturación</label>
                    <select
                      value={ispBillingType}
                      onChange={(e) => setIspBillingType(e.target.value as any)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Manual">Manual prepago</option>
                      <option value="Recurring">Recurrente Automática</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Estado Inicial</label>
                    <select
                      value={ispStatus}
                      onChange={(e) => setIspStatus(e.target.value as any)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Active">Activo</option>
                      <option value="Suspended">Suspendido</option>
                    </select>
                  </div>

                  <div className="pt-5 border-t border-gray-800 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setShowAddISPDrawer(false)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      Aprovisionar
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 text-[11px] text-gray-450 mt-6 flex items-start gap-2">
                <Wifi size={14} className="text-gray-500 mt-0.5" />
                <span>La creación inyectará automáticamente un usuario de nivel Admin ligado a su consola dedicada.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER: Edit ISP Asignations */}
      <AnimatePresence>
        {editingISP && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#161b22] border-l border-gray-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 size={16} className="text-blue-400" />
                    Editar Parámetros de ISP
                  </h3>
                  <button
                    onClick={() => setEditingISP(null)}
                    className="p-1.5 hover:bg-gray-850 rounded-lg text-gray-400 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleUpdateISPSubmit} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-1.5">Nombre ISP</label>
                    <input
                      type="text"
                      value={editIspName}
                      onChange={(e) => setEditIspName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-1.5">Nueva contraseña (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Dejar vacío para conservar contraseña"
                      value={editIspPassword}
                      onChange={(e) => setEditIspPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-1.5">Plan de Consumo</label>
                    <select
                      value={editIspPlan}
                      onChange={(e) => setEditIspPlan(e.target.value)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {(plans.length > 0 ? plans : DEFAULT_PLANS).map(p => (
                        <option key={p.id} value={p.id}>{p.name} - Max {p.maxClients >= 9999 ? 'Ilimitados' : `${p.maxClients} cls`}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-450 mb-1.5">Amortización / Cobro</label>
                    <select
                      value={editIspBilling}
                      onChange={(e) => setEditIspBilling(e.target.value as any)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Manual">Prepago Manual</option>
                      <option value="Recurring">Recurrencia Automática</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Estado Operacional</label>
                    <select
                      value={editIspStatus}
                      onChange={(e) => setEditIspStatus(e.target.value as any)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Active">Activo</option>
                      <option value="Suspended">Suspendido (Panel bloqueado)</option>
                    </select>
                  </div>

                  <div className="pt-5 border-t border-gray-800 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setEditingISP(null)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 text-[11px] text-gray-450 mt-6 flex items-start gap-2">
                <Wifi size={14} className="text-gray-500 mt-0.5" />
                <span>Modificar el estado a "Suspendido" congelará las operaciones de este nodo inquilino de inmediato.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Trigger Manual Billing Invoicing */}
      <AnimatePresence>
        {billingTargetISP && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#161b22] border border-gray-800 p-6 rounded-2xl shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-amber-450" />
                  Emitir Factura de Cobro Manual
                </h3>
                <button
                  onClick={() => setBillingTargetISP(null)}
                  className="p-1.5 hover:bg-gray-850 rounded-lg text-gray-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-[#0f141a] p-4 rounded-xl border border-gray-800 mb-4 text-xs">
                <p className="text-gray-450">ISP Destinatario:</p>
                <p className="text-sm font-bold text-white mt-0.5">{billingTargetISP.name}</p>
                <p className="text-gray-505 font-mono mt-0.5">Plan de Servicio: {plans.find(p => p.id === billingTargetISP.planId)?.name}</p>
              </div>

              <form onSubmit={handleTriggerManualBillingSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-405 uppercase tracking-wide mb-1.5">Monto de cobro ($ COP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Monto"
                    value={manualBillAmount}
                    onChange={(e) => setManualBillAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-405 uppercase tracking-wide mb-1.5">Fecha de Emisión de Factura *</label>
                  <input
                    type="date"
                    value={manualBillDate}
                    onChange={(e) => setManualBillDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                  <button
                    type="button"
                    onClick={() => setBillingTargetISP(null)}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl transition-colors cursor-pointer hover:bg-gray-750"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg"
                  >
                    Confirmar Cobro e Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OTHER DRAWER: Create / Modify collaborators */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#161b22] border-l border-gray-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 size={16} className="text-blue-400" />
                    Modificar Acceso Colaborador
                  </h3>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="p-1.5 hover:bg-gray-850 rounded-lg text-gray-400 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleUpdateCollaboratorSubmit} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Correo Electrónico (Solo Lectura)</label>
                    <input
                      type="text"
                      value={editingUser.email}
                      disabled
                      className="w-full px-4 py-2 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Nombre Completo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Nueva contraseña (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Dejar vacío para conservar contraseña"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Nivel Jerárquico</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                      <option value="SuperAdmin">SuperAdmin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Estado</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="pt-5 border-t border-gray-800 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 text-[11px] text-gray-450 mt-6 flex items-start gap-2">
                <Shield size={14} className="text-gray-500 mt-0.5" />
                <span>Las modificaciones registradas en logs quedarán grabadas en la bitácora pública de seguridad.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER: Create new Subscription Plan */}
      <AnimatePresence>
        {showAddPlanDrawer && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#161b22] border-l border-gray-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-6 font-semibold">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus size={16} className="text-blue-400" />
                    Registrar Nuevo Plan ISP
                  </h3>
                  <button
                    onClick={() => setShowAddPlanDrawer(false)}
                    className="p-1.5 hover:bg-gray-850 rounded-lg text-gray-400 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreatePlanSubmit} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Código Único (ID / Slug) (Opcional)</label>
                    <input
                      type="text"
                      placeholder="e.g. plan_gold (O dejar vacío para auto-generar)"
                      value={planIdInput}
                      onChange={(e) => setPlanIdInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">De preferencia usar minúsculas y guiones bajos.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Nombre Comercial del Plan *</label>
                    <input
                      type="text"
                      placeholder="e.g. Plan Fibra Premium"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Capacidad Máxima de Clientes *</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={planMaxClients}
                      onChange={(e) => setPlanMaxClients(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Use 9999 o superior para clientes ilimitados.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Precio de Licencia Mensual ($ COP) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 99.99"
                      value={planPriceMonthly}
                      onChange={(e) => setPlanPriceMonthly(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Descripción o Comentarios</label>
                    <textarea
                      rows={3}
                      placeholder="Soporte VIP, servidores prioritarios, etc."
                      value={planDescription}
                      onChange={(e) => setPlanDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="pt-5 border-t border-gray-800 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setShowAddPlanDrawer(false)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      Crear Plan
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 text-[11px] text-gray-450 mt-6 flex items-start gap-2">
                <Shield size={14} className="text-gray-500 mt-0.5" />
                <span>La creación de planes quedará auditada inmediatamente en la bitácora del sistema global.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER: Edit existing Subscription Plan */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#161b22] border-l border-gray-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-6 font-semibold">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 size={16} className="text-blue-400" />
                    Modificar Plan de Suscripción
                  </h3>
                  <button
                    onClick={() => setEditingPlan(null)}
                    className="p-1.5 hover:bg-gray-850 rounded-lg text-gray-400 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleUpdatePlanSubmit} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-405 mb-1.5">Código / ID del Plan (Lectura únicamente)</label>
                    <input
                      type="text"
                      value={editingPlan.id}
                      disabled
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-850 rounded-xl text-gray-500 font-mono cursor-not-allowed outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Nombre Comercial</label>
                    <input
                      type="text"
                      value={editPlanName}
                      onChange={(e) => setEditPlanName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Capacidad Máxima de Clientes</label>
                    <input
                      type="number"
                      value={editPlanMaxClients}
                      onChange={(e) => setEditPlanMaxClients(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Use 9999 o superior para clientes ilimitados.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Precio de Licencia Mensual ($ COP)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPlanPriceMonthly}
                      onChange={(e) => setEditPlanPriceMonthly(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-455 mb-1.5">Descripción del Plan</label>
                    <textarea
                      rows={3}
                      value={editPlanDescription}
                      onChange={(e) => setEditPlanDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-gray-800 rounded-xl text-gray-205 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="pt-5 border-t border-gray-800 flex justify-end gap-3 font-semibold text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => setEditingPlan(null)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 text-[11px] text-gray-450 mt-6 flex items-start gap-2">
                <Shield size={14} className="text-gray-500 mt-0.5" />
                <span>La edición del plan actualizará todos los cálculos de facturación e invoices futuros de forma inmediata.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Invoice Preview and Transmission Deck (PDF format) */}
      <AnimatePresence>
        {showInvoicePreviewModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-[#0d1117] border border-gray-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px]"
            >
              
              {/* LEFT HALF: Aesthetic Digital PDF Canvas (Physical Letterhead) */}
              <div className="w-full md:w-[60%] bg-white p-6 sm:p-10 text-gray-900 flex flex-col justify-between shadow-inner relative overflow-hidden">
                
                {/* Diagonal Vintage Stamp Watermark overlaid dynamically */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 pointer-events-none select-none opacity-20">
                  <div className={`text-4xl sm:text-5xl font-extrabold uppercase tracking-widest border-4 border-dashed p-4 sm:p-6 rounded-2xl whitespace-nowrap ${
                    selectedInvoice.status === 'Paid'
                      ? 'text-emerald-600 border-emerald-600 font-mono'
                      : selectedInvoice.status === 'Pending'
                      ? 'text-amber-600 border-amber-600 font-mono'
                      : 'text-rose-600 border-rose-600 font-mono'
                  }`}>
                    {selectedInvoice.status === 'Paid' ? 'LIQUIDADA' : selectedInvoice.status === 'Pending' ? 'PENDIENTE' : 'VENCIDA / MORA'}
                  </div>
                </div>

                <div>
                  {/* Company Header */}
                  <div className="flex justify-between items-start border-b-2 border-gray-200 pb-5 mb-5">
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-blue-700 tracking-tight">TICCOL S.A.S.</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Soluciones de Conectividad Multitenant</p>
                    </div>
                    <div className="text-[10px] text-gray-550 text-right space-y-0.5 leading-relaxed">
                      <p><strong>NIT:</strong> 901.442.115-3</p>
                      <p><strong>Dirección:</strong> Av. El Dorado No. 68C-41, Bogotá</p>
                      <p><strong>Servicio:</strong> {configSystemBillingEmail}</p>
                    </div>
                  </div>

                  {/* Billing ID & Timestamps Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 text-xs text-gray-600">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block mb-0.5">Identificador de Venta</span>
                      <strong className="text-gray-900 font-mono text-sm">#INV-{selectedInvoice.id}</strong>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block mb-0.5 font-sans">F. Emisión</span>
                        <span className="font-semibold text-gray-800">{new Date(selectedInvoice.billingDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block mb-0.5 font-sans">F. Control / Vence</span>
                        <span className="font-semibold text-rose-600">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bill To Block */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 block mb-1">FACTURADO A:</span>
                    <h5 className="text-sm font-bold text-gray-900">{selectedInvoice.ispName}</h5>
                    <p className="text-[11px] text-gray-500 mt-1">Socio ISP Autorizado - Aprovisionamiento Cloud Integrado</p>
                    <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-4">
                      <span><strong>Modo:</strong> {selectedInvoice.billingType === 'Recurring' ? 'Recurrente Automático' : 'Prepago Manual'}</span>
                      <span><strong>Plan Inicial:</strong> {selectedInvoice.planName}</span>
                    </div>
                  </div>

                  {/* Concept List Grid table */}
                  <div className="overflow-hidden border border-gray-200 rounded-xl mb-6">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] uppercase font-extrabold text-gray-500 border-b border-gray-200">
                          <th className="py-3 px-4">Concepto / Descripción del Licenciamiento</th>
                          <th className="py-3 px-4 text-center w-12">Cant</th>
                          <th className="py-3 px-4 text-right w-24">Unitario</th>
                          <th className="py-3 px-4 text-right w-24">Neto Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                        <tr>
                          <td className="py-4 px-4 leading-relaxed">
                            <strong>Licencia Core Operativa - Plan {selectedInvoice.planName}</strong>
                            <span className="text-[10px] text-gray-450 block mt-1 font-normal">Aislamiento tenant, base de datos integrada y cuota de clientes contratada.</span>
                          </td>
                          <td className="py-4 px-4 text-center">1</td>
                          <td className="py-4 px-4 text-right font-mono">${selectedInvoice.amount.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right font-bold text-gray-900 font-mono">${selectedInvoice.amount.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ledger summary & stamp */}
                <div>
                  <div className="flex justify-end mb-6">
                    <div className="w-64 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal Neto:</span>
                        <span className="font-mono">${selectedInvoice.amount.toLocaleString()} COP</span>
                      </div>
                      <div className="flex justify-between text-gray-650 border-t border-gray-200 pt-2 font-bold text-sm text-gray-900">
                        <span>Total Liquidado:</span>
                        <span className="font-mono text-blue-700">${selectedInvoice.amount.toLocaleString()} COP</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 text-center text-[9px] text-gray-400 leading-relaxed font-normal">
                    Soporte Automático de Facturación para ISPs. Documento generado bajo las reglas del Kernel Integrado TICCOL.
                  </div>
                </div>

              </div>

              {/* RIGHT HALF: Transmission Console & Action Deck */}
              <div className="w-full md:w-[40%] bg-[#12161f] border-t md:border-t-0 md:border-l border-gray-800 p-6 flex flex-col justify-between">
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-6 font-semibold">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <CreditCard size={15} className="text-blue-400" />
                      Gestión del Comprobante
                    </h3>
                    <button
                      onClick={() => setShowInvoicePreviewModal(false)}
                      className="p-1 hover:bg-gray-800 rounded text-gray-400 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-6 font-normal">
                    Realice descargas oficiales de la transacción en curso, imprima el documento final o despache notificaciones automatizadas a los gateways de correo (SMTP Gmail) y WhatsApp (Meta Suite Api) configurados.
                  </p>

                  {/* Actions vertical pile */}
                  <div className="space-y-3 font-semibold text-xs sm:text-sm">
                    
                    {/* Native Print Action */}
                    <button
                      type="button"
                      onClick={() => handlePrintInvoice(selectedInvoice)}
                      className="w-full py-3 px-4 bg-gray-800 text-white rounded-xl hover:bg-gray-750 transition-colors cursor-pointer flex items-center gap-3"
                    >
                      <Printer size={15} className="text-blue-400" />
                      <div className="text-left flex-1 min-w-0">
                        <span className="block text-xs font-bold text-white">Imprimir o Guardar a PDF</span>
                        <span className="block text-[9px] text-gray-400 font-medium">Dispara la preconfiguración de impresora local</span>
                      </div>
                    </button>

                    {/* Download RAW Text Ledger */}
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoiceTXT(selectedInvoice)}
                      className="w-full py-3 px-4 bg-gray-800 text-white rounded-xl hover:bg-gray-750 transition-colors cursor-pointer flex items-center gap-3"
                    >
                      <Download size={15} className="text-emerald-450" />
                      <div className="text-left flex-1 min-w-0">
                        <span className="block text-xs font-bold text-white">Descargar TXT Ledger</span>
                        <span className="block text-[9px] text-gray-400 font-medium">Extrae los hashes y códigos de auditoría</span>
                      </div>
                    </button>

                    {/* Send Email Action */}
                    <button
                      type="button"
                      disabled={isSendingEmail || isSendingWhatsapp}
                      onClick={() => handleSendInvoiceEmail(selectedInvoice)}
                      className="w-full py-3 px-4 bg-blue-600/10 border border-blue-500/25 text-blue-400 rounded-xl hover:bg-blue-600/20 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-3"
                    >
                      {isSendingEmail ? (
                        <RefreshCw size={15} className="animate-spin text-blue-400" />
                      ) : (
                        <Mail size={15} className="text-blue-400" />
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <span className="block text-xs font-bold text-blue-300">Despachar por Email</span>
                        <span className="block text-[9px] text-blue-400/80 font-medium truncate">Relay SMTP: {configSmtpUser}</span>
                      </div>
                    </button>

                    {/* Send WhatsApp Action */}
                    <button
                      type="button"
                      disabled={isSendingEmail || isSendingWhatsapp}
                      onClick={() => handleSendInvoiceWhatsapp(selectedInvoice)}
                      className="w-full py-3 px-4 bg-emerald-600/10 border border-emerald-500/25 text-emerald-400 rounded-xl hover:bg-emerald-600/20 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-3"
                    >
                      {isSendingWhatsapp ? (
                        <RefreshCw size={15} className="animate-spin text-emerald-400" />
                      ) : (
                        <MessageSquare size={15} className="text-emerald-400" />
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <span className="block text-xs font-bold text-emerald-300">Notificar por WhatsApp</span>
                        <span className="block text-[9px] text-emerald-400/80 font-medium truncate">Meta Phone ID: {configWhatsappPhoneId}</span>
                      </div>
                    </button>

                  </div>
                </div>

                {/* Simulated Handshake logs console log outputs */}
                <div className="mt-6 p-4 bg-gray-950 rounded-xl border border-gray-850 font-mono text-[9px] space-y-1.5 text-gray-400 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-1.5 mb-2">
                    <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Gateway Monitor Logs</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${isSendingEmail || isSendingWhatsapp ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  </div>
                  {isSendingEmail ? (
                    <>
                      <p className="text-blue-400 animate-pulse">&gt; Estableciendo conexión con SMTP {configSmtpHost}:{configSmtpPort}...</p>
                      <p className="text-gray-500">&gt; Negociando encriptación TLS con certificado seguro...</p>
                      <p className="text-gray-500">&gt; Transmitiendo envelope MIME para {selectedInvoice.ispName}...</p>
                      <p className="text-gray-600 italic">&gt; Cargando adjunctor binario estático...</p>
                    </>
                  ) : isSendingWhatsapp ? (
                    <>
                      <p className="text-emerald-400 animate-pulse">&gt; Lanzando request HTTPS POST a Meta Cloud API...</p>
                      <p className="text-gray-500">&gt; Endpoint: {configWhatsappApiUrl}/{configWhatsappPhoneId}/messages</p>
                      <p className="text-gray-500">&gt; Validando estructura JSON de plantilla oficial...</p>
                      <p className="text-gray-650 italic">&gt; Esperando ACK positivo de Meta Brokers...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600">&gt; Esperando gatillar una transmisión externa...</p>
                      <p className="text-[8px] text-gray-700">Conexión SMTP Relay: {configSmtpHost}:{configSmtpPort}</p>
                      <p className="text-[8px] text-gray-700">Meta API Endpoint: {configWhatsappApiUrl}</p>
                    </>
                  )}
                </div>

              </div>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
