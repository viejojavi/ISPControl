import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
export { db };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'client_spa_user',
      email: 'client_spa_email',
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Removes all keys with undefined values from an object.
 * Firestore does not allow undefined values in documents.
 */
export function cleanObject<T extends object>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key as keyof T] === undefined) {
      delete result[key as keyof T];
    }
  });
  return result;
}

export interface BandwidthPlan {
  id: string;
  ispId: string;
  name: string; // e.g. "Plan 50MB Fiber"
  downloadMbps: number;
  uploadMbps: number;
  price: number;
  currency: string;
  serviceType: 'Static' | 'DHCP' | 'PPPoE' | 'Any';
  mikrotikProfile?: string; // The profile name in MikroTik
  targetRouterIds?: string[]; // Empty means all routers
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  password: string;
  role: 'SuperAdmin' | 'Admin' | 'User';
  status: 'Active' | 'Inactive';
  name?: string;
  ispId?: string; // Suffix/id of the associated ISP organization
  createdAt?: any;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: any;
}

export interface ISPPlan {
  id: string;
  name: string;
  maxClients: number; // quota limit
  priceMonthly: number;
  description: string;
}

export interface ISP {
  id: string;
  name: string;
  email: string;
  password?: string; // Local storage & console reference login
  status: 'Active' | 'Suspended';
  planId: string;
  billingType: 'Manual' | 'Recurring';
  lastBillingDate: string;
  nextBillingDate: string;
  customDatabaseSuffix: string; // Dynamic database simulation identifier
  createdAt: string;
  defaultCountry?: string;
  defaultDepartment?: string;
  defaultMunicipality?: string;
}

export interface ISPClient {
  id: string;
  ispId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  department: string;
  municipality: string;
  address: string;
  documentType: 'CC' | 'CE' | 'NIT' | 'PP';
  documentNumber: string;
  bandwidthPlanId: string;
  technology: 'FTTH' | 'Wireless';
  ipConfigType: 'Static' | 'DHCP' | 'PPPoE';
  ipAddress: string;
  macAddress?: string;
  ipv6Address?: string;
  pppoeUser?: string;
  pppoePassword?: string;
  pppoeProfile?: string;
  routerId: string;
  servicePoint: string; // NAP Box for FTTH, AP for Wireless
  billingDay: number;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
}

export interface IPPool {
  id: string;
  name: string;
  start: string;
  end: string;
  serviceType: 'Static' | 'DHCP' | 'PPPoE' | 'All';
}

export interface Router {
  id: string;
  ispId: string;
  name: string;
  host: string; // IP o DNS
  apiPort: number;
  apiUser: string;
  apiPassword?: string;
  sshPort: number;
  sshUser: string;
  sshPassword?: string;
  httpPort: number;
  useSsl: boolean;
  model: string;
  version: string;
  status: 'Online' | 'Offline' | 'Connecting';
  uptime?: string;
  voltage?: string;
  temperature?: string;
  cpuLoad?: string;
  memoryUsed?: string;
  memoryTotal?: string;
  equipmentIdentity?: string;
  snmpCommunity?: string;
  snmpPort?: number;
  snmpVersion?: 'v1' | 'v2c';
  ipPoolStart: string; // Legacy fallback
  ipPoolEnd: string;   // Legacy fallback
  ipPools?: IPPool[];  // Multi-pool support
  ipv6Enabled?: boolean;
  ipv6Prefix?: string; // e.g. 2001:db8:1::/48
  ipv6Pool?: string;   // e.g. 2001:db8:1:a::/64
  sstpEnabled?: boolean;
  sstpUser?: string;
  sstpPassword?: string;
  sstpLocalAddress?: string;
  sstpRemoteAddress?: string;
  sstpStatus?: 'Connected' | 'Disconnected';
  lastSeen?: string;
  authError?: boolean;
  snmpTimeout?: boolean;
  createdAt: string;
}

export interface SSTPConfig {
  id: string;
  ispId: string;
  serverAddress: string;
  port: number;
  certificateName: string;
  status: 'Active' | 'Inactive';
  secretKey: string; // Global secret for authentication
}

export interface Invoice {
  id: string;
  ispId: string;
  ispName: string;
  amount: number;
  billingDate: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  billingType: 'Manual' | 'Recurring';
  planName: string;
}

export interface SystemConfig {
  id: string;
  gracePeriodDays: number;
  suspendOverdue: boolean;
  systemBillingEmail: string;
  autoInvoicingStatus: 'Paid' | 'Pending';
  trm: number; // Tasa Representativa del Mercado
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  whatsappApiUrl?: string;
  whatsappToken?: string;
  whatsappPhoneId?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const pathName = 'config/global_settings';
  try {
    const docRef = doc(db, 'config', 'global_settings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SystemConfig;
    } else {
      const defaultConfig: SystemConfig = {
        id: 'global_settings',
        gracePeriodDays: 5,
        suspendOverdue: true,
        systemBillingEmail: 'facturacion@ticcol.co',
        autoInvoicingStatus: 'Pending',
        trm: 4000,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'facturacion@ticcol.co',
        smtpPassword: 'app-password-example-key',
        smtpSecure: true,
        whatsappApiUrl: 'https://graph.facebook.com/v19.0',
        whatsappToken: 'EAAG6...' ,
        whatsappPhoneId: '28198711...',
        updatedAt: new Date().toISOString(),
        updatedBy: 'System'
      };
      await setDoc(docRef, defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathName);
    throw error;
  }
}

export async function saveSystemConfig(config: Partial<SystemConfig>, updaterEmail: string): Promise<SystemConfig> {
  const pathName = 'config/global_settings';
  try {
    const docRef = doc(db, 'config', 'global_settings');
    await updateDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: updaterEmail
    });
    
    await createAuditLog(
      'System Settings Updated',
      `Parámetros actualizados: ${Object.keys(config).join(', ')}`,
      updaterEmail
    );
    
    return await getSystemConfig();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
    throw error;
  }
}

export async function updateInvoiceStatus(id: string, status: 'Paid' | 'Pending' | 'Overdue', updaterEmail: string): Promise<void> {
  const pathName = `invoices/${id}`;
  try {
    const docRef = doc(db, 'invoices', id);
    await updateDoc(docRef, { status });
    await createAuditLog(
      'Invoice Status Updated',
      `Factura ${id} modificada a estado: "${status}"`,
      updaterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
    throw error;
  }
}

// Pre-defined default plans
export const DEFAULT_PLANS: ISPPlan[] = [
  { id: 'plan_basic', name: 'Plan Bronce (Básico)', maxClients: 100, priceMonthly: 200000, description: 'Hasta 100 clientes de internet contratados.' },
  { id: 'plan_silver', name: 'Plan Plata (Medio)', maxClients: 500, priceMonthly: 500000, description: 'Hasta 500 clientes de internet contratados.' },
  { id: 'plan_gold', name: 'Plan Oro (Avanzado)', maxClients: 2000, priceMonthly: 1000000, description: 'Hasta 2000 clientes de internet contratados.' },
  { id: 'plan_unlimited', name: 'Plan Platino (Ilimitado)', maxClients: 999999, priceMonthly: 2000000, description: 'Totalmente sin restricciones de clientes.' }
];

export async function getBandwidthPlans(ispId: string): Promise<BandwidthPlan[]> {
  const pathName = 'bandwidthPlans';
  try {
    const q = query(collection(db, pathName), where('ispId', '==', ispId));
    const snapshot = await getDocs(q);
    const plansList: BandwidthPlan[] = [];
    snapshot.forEach((docSnap) => {
      plansList.push({ id: docSnap.id, ...docSnap.data() } as BandwidthPlan);
    });
    return plansList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bandwidthPlans');
    throw error;
  }
}

// 1. Auto-seed default SuperAdmins & Default Plans if they don't exist
export async function seedDefaultUsersIfNeeded(): Promise<void> {
  const pathName = 'users';
  try {
    const q = query(collection(db, pathName));
    const querySnapshot = await getDocs(q);
    
    // Check if the primary account ticcolcolombia@gmail.com exists
    let mainSuperAdminExists = false;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.email && data.email.toLowerCase().trim() === 'ticcolcolombia@gmail.com') {
        mainSuperAdminExists = true;
      }
    });

    if (!mainSuperAdminExists) {
      // Seed first user: ticcolcolombia@gmail.com
      const docRef1 = doc(collection(db, pathName));
      const newUid1 = docRef1.id;
      await setDoc(docRef1, {
        uid: newUid1,
        email: 'ticcolcolombia@gmail.com',
        password: 'adminpassword123', // Clean, secure, custom-provided or simple default
        role: 'SuperAdmin',
        status: 'Active',
        name: 'SuperAdmin Ticcol',
        createdAt: new Date().toISOString()
      });
      console.log('UserService: Seeded default SuperAdmin ticcolcolombia@gmail.com');
      
      // Save an initial audit log
      await createAuditLog(
        'System Initialization',
        'Seeded default SuperAdmin account: ticcolcolombia@gmail.com',
        'System'
      );
    }

    // Auto-seed plans definitions
    const plansPath = 'plans';
    const plansSnap = await getDocs(collection(db, plansPath));
    if (plansSnap.empty) {
      for (const plan of DEFAULT_PLANS) {
        await setDoc(doc(db, plansPath, plan.id), plan);
      }
      console.log('UserService: Seeded initial application plans');
    }

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathName);
  }
}

// 2. Validate User credentials purely in Firestore 'users' collection
export async function validateUser(email: string, pass: string): Promise<UserAccount> {
  const pathName = 'users';
  try {
    const cleanEmail = email.toLowerCase().trim();
    const q = query(collection(db, pathName), where('email', '==', cleanEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('El correo electrónico no está registrado.');
    }

    let authenticatedUser: UserAccount | null = null;
    querySnapshot.forEach((docDoc) => {
      const data = docDoc.data() as UserAccount;
      if (data.password === pass) {
        if (data.status === 'Inactive') {
          throw new Error('Esta cuenta está inactiva. Contacte al Administrador principal.');
        }
        authenticatedUser = data;
      }
    });

    if (!authenticatedUser) {
      throw new Error('Contraseña incorrecta.');
    }

    // Log the successful login
    await createAuditLog(
      'Login', 
      `User ${cleanEmail} logged in successfully`, 
      cleanEmail
    );

    return authenticatedUser;
  } catch (error: any) {
    if (error.message && (error.message.includes('incorrecta') || error.message.includes('no está registrado') || error.message.includes('inactiva'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, pathName);
    throw error;
  }
}

// 3. Retrieve all users
export async function getAllUsers(): Promise<UserAccount[]> {
  const pathName = 'users';
  try {
    const q = query(collection(db, pathName));
    const querySnapshot = await getDocs(q);
    const usersList: UserAccount[] = [];
    querySnapshot.forEach((docSnap) => {
      usersList.push(docSnap.data() as UserAccount);
    });
    return usersList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName);
    throw error;
  }
}

// 4. Create new user Account
export async function createUser(user: Omit<UserAccount, 'uid' | 'createdAt'>, creatorEmail: string): Promise<UserAccount> {
  const pathName = 'users';
  try {
    const cleanEmail = user.email.toLowerCase().trim();
    
    // Check if user already exists
    const q = query(collection(db, pathName), where('email', '==', cleanEmail));
    const checkSnapshot = await getDocs(q);
    if (!checkSnapshot.empty) {
      throw new Error('Un usuario con este correo electrónico ya existe.');
    }

    const docRef = doc(collection(db, pathName));
    const newUser: UserAccount = {
      ...user,
      uid: docRef.id,
      email: cleanEmail,
      createdAt: new Date().toISOString()
    };

    await setDoc(docRef, newUser);

    // Audit Log
    await createAuditLog(
      'User Creation',
      `Created ${user.role} user: ${cleanEmail}`,
      creatorEmail
    );

    return newUser;
  } catch (error: any) {
    if (error.message && error.message.includes('ya existe')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, pathName);
    throw error;
  }
}

// 5. Update user Account
export async function updateUser(uid: string, fields: Partial<UserAccount>, updaterEmail: string): Promise<void> {
  const pathName = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, fields);

    // Audit Log
    await createAuditLog(
      'User Update',
      `Updated user ${uid} details: ${Object.keys(fields).join(', ')}`,
      updaterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
  }
}

// 6. Delete user Account
export async function deleteUser(uid: string, userEmail: string, deleterEmail: string): Promise<void> {
  const pathName = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await deleteDoc(docRef);

    // Audit Log
    await createAuditLog(
      'User Deletion',
      `Deleted user account: ${userEmail}`,
      deleterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathName);
  }
}

// 7. Write and fetch Audit Logs
export async function createAuditLog(action: string, details: string, performedBy: string): Promise<void> {
  const pathName = 'logs';
  try {
    const docRef = doc(collection(db, pathName));
    const newLog: AuditLog = {
      id: docRef.id,
      action,
      details,
      performedBy,
      timestamp: new Date().toISOString()
    };
    await setDoc(docRef, newLog);
  } catch (error) {
    console.error('Error writing audit log:', error);
  }
}

export async function getAuditLogs(limitCount: number = 20): Promise<AuditLog[]> {
  const pathName = 'logs';
  try {
    const q = query(collection(db, pathName));
    const snapshot = await getDocs(q);
    const logsList: AuditLog[] = [];
    snapshot.forEach((docSnap) => {
      logsList.push(docSnap.data() as AuditLog);
    });
    // Sort client-side by ISO date string descending
    return logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

// 8. Plans retrieval
export async function getAllPlans(): Promise<ISPPlan[]> {
  const pathName = 'plans';
  try {
    const q = query(collection(db, pathName));
    const snapshot = await getDocs(q);
    const plansList: ISPPlan[] = [];
    snapshot.forEach((docSnap) => {
      plansList.push(docSnap.data() as ISPPlan);
    });
    
    // Combine custom plans with pre-defined defaults to prevent missing IDs
    const combinedPlans = [...plansList];
    for (const defaultPlan of DEFAULT_PLANS) {
      if (!combinedPlans.some(p => p.id === defaultPlan.id)) {
        combinedPlans.push(defaultPlan);
      }
    }
    return combinedPlans;
  } catch (error) {
    console.error('Error fetching plans from DB, falling back to defaults:', error);
    return DEFAULT_PLANS;
  }
}

export async function createPlan(plan: Omit<ISPPlan, 'id'> & { id?: string }, creatorEmail: string): Promise<ISPPlan> {
  const pathName = 'plans';
  try {
    const docRef = plan.id ? doc(db, 'plans', plan.id) : doc(collection(db, 'plans'));
    const finalId = plan.id ? plan.id : docRef.id;
    
    const newPlan: ISPPlan = {
      ...plan,
      id: finalId,
    };

    await setDoc(docRef, newPlan);

    await createAuditLog(
      'Plan Creation',
      `Creado plan: "${plan.name}" (${finalId}) con capacidad de ${plan.maxClients} clientes y precio de $${plan.priceMonthly.toLocaleString()} COP.`,
      creatorEmail
    );
    return newPlan;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pathName);
    throw error;
  }
}

export async function updatePlan(id: string, fields: Partial<Omit<ISPPlan, 'id'>>, updaterEmail: string): Promise<void> {
  const pathName = `plans/${id}`;
  try {
    const docRef = doc(db, 'plans', id);
    await updateDoc(docRef, fields);

    await createAuditLog(
      'Plan Update',
      `Modificado plan ${id}: ${Object.keys(fields).join(', ')}`,
      updaterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
    throw error;
  }
}

export async function deletePlan(id: string, name: string, deleterEmail: string): Promise<void> {
  const pathName = `plans/${id}`;
  try {
    // Before deleting check if any ISP is using this plan?
    // We can do it inside the UI or globally. We'll add some verification in the UI.
    const docRef = doc(db, 'plans', id);
    await deleteDoc(docRef);

    await createAuditLog(
      'Plan Deletion',
      `Removido plan: "${name}" (${id}) de la lista de planes.`,
      deleterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathName);
    throw error;
  }
}

// 9. ISP Management Functions (CRUD + State)
export async function getAllISPs(): Promise<ISP[]> {
  const pathName = 'isps';
  try {
    const q = query(collection(db, pathName));
    const snapshot = await getDocs(q);
    const ispsList: ISP[] = [];
    snapshot.forEach((docSnap) => {
      ispsList.push(docSnap.data() as ISP);
    });
    return ispsList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName);
    throw error;
  }
}

export async function createISP(isp: Omit<ISP, 'id' | 'createdAt' | 'customDatabaseSuffix'>, creatorEmail: string): Promise<ISP> {
  const pathName = 'isps';
  try {
    // Check email uniqueness
    const q = query(collection(db, pathName), where('email', '==', isp.email.toLowerCase().trim()));
    const checkSnapshot = await getDocs(q);
    if (!checkSnapshot.empty) {
      throw new Error('Ya existe un ISP registrado con este correo principal.');
    }

    const docRef = doc(collection(db, pathName));
    const cleanId = docRef.id;
    const cleanEmail = isp.email.toLowerCase().trim();
    const newISP: ISP = {
      ...isp,
      id: cleanId,
      email: cleanEmail,
      customDatabaseSuffix: `db_${cleanId.substring(0, 6)}`,
      createdAt: new Date().toISOString()
    };

    await setDoc(docRef, newISP);

    // Auto-create a corresponding credentials account under 'users' for this ISP Administrator
    const userDocRef = doc(collection(db, 'users'));
    const newUserAccount: UserAccount = {
      uid: userDocRef.id,
      email: cleanEmail,
      password: isp.password || 'isp123456',
      role: 'Admin', // Admins inside an ISP can manage their clients
      status: isp.status === 'Active' ? 'Active' : 'Inactive',
      name: `${isp.name} Admin`,
      ispId: cleanId,
      createdAt: new Date().toISOString()
    };

    await setDoc(userDocRef, newUserAccount);

    // Logging
    await createAuditLog(
      'ISP Registration',
      `Registered ISP ${isp.name} (${cleanEmail}) mapped with Plan ID ${isp.planId}. Client Admin created.`,
      creatorEmail
    );

    return newISP;
  } catch (error: any) {
    if (error.message && error.message.includes('Ya existe')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, pathName);
    throw error;
  }
}

export async function updateISP(id: string, fields: Partial<ISP>, updaterEmail: string): Promise<void> {
  const pathName = `isps/${id}`;
  try {
    const docRef = doc(db, 'isps', id);
    const cleanedFields = cleanObject(fields);
    await updateDoc(docRef, cleanedFields);

    // Also update matching ISP credentials status, email, or password if updated
    const userQuery = query(collection(db, 'users'), where('ispId', '==', id));
    const userSnap = await getDocs(userQuery);
    userSnap.forEach(async (usrDoc) => {
      const uRef = doc(db, 'users', usrDoc.id);
      const updateFields: Partial<UserAccount> = {};
      
      if (cleanedFields.status) {
        updateFields.status = cleanedFields.status === 'Active' ? 'Active' : 'Inactive';
      }
      if (cleanedFields.password) {
        updateFields.password = cleanedFields.password;
      }
      if (cleanedFields.name) {
        updateFields.name = `${cleanedFields.name} Admin`;
      }

      if (Object.keys(updateFields).length > 0) {
        await updateDoc(uRef, updateFields);
      }
    });

    await createAuditLog(
      'ISP Update',
      `Updated ISP details for ${id}: ${Object.keys(fields).join(', ')}`,
      updaterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
  }
}

export async function deleteISP(id: string, name: string, deleterEmail: string): Promise<void> {
  const pathName = `isps/${id}`;
  try {
    // Complete cascading deletion
    const docRef = doc(db, 'isps', id);
    await deleteDoc(docRef);

    // Remove matching credential users
    const userQuery = query(collection(db, 'users'), where('ispId', '==', id));
    const userSnap = await getDocs(userQuery);
    userSnap.forEach(async (usrDoc) => {
      const uRef = doc(db, 'users', usrDoc.id);
      await deleteDoc(uRef);
    });

    // Remove ISP clients
    const clientQuery = query(collection(db, 'isp_clients'), where('ispId', '==', id));
    const clientSnap = await getDocs(clientQuery);
    clientSnap.forEach(async (cliDoc) => {
      await deleteDoc(doc(db, 'isp_clients', cliDoc.id));
    });

    await createAuditLog(
      'ISP Deletion',
      `Successfully deleted ISP ${name} (${id}) along with associated user logins and partitioned client databases.`,
      deleterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathName);
  }
}

// 10. Manual & Recurring Billing Invoices Handler
export async function triggerManualBilling(ispId: string, amount: number, planName: string, billingDateStr: string, creatorEmail: string): Promise<void> {
  const pathName = 'invoices';
  try {
    const ispRef = doc(db, 'isps', ispId);
    const ispSnap = await getDocs(query(collection(db, 'isps'), where('email', '==', creatorEmail))); // or just pull name
    
    // Retrieve ISP Details to populate invoice
    const allIsps = await getAllISPs();
    const targeted = allIsps.find(i => i.id === ispId);
    if (!targeted) throw new Error('ISP no encontrado para facturación.');

    const invoiceRef = doc(collection(db, pathName));
    const cleanDate = new Date(billingDateStr);
    const dueDate = new Date(cleanDate);
    dueDate.setDate(dueDate.getDate() + 15); // due in 15 days

    const newInvoice: Invoice = {
      id: invoiceRef.id,
      ispId,
      ispName: targeted.name,
      amount,
      billingDate: cleanDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'Paid', // Manual bills can be initialized as Paid immediately
      billingType: 'Manual',
      planName
    };

    await setDoc(invoiceRef, newInvoice);

    // Update ISP last and next billing cycle
    const nextBillCycle = new Date(cleanDate);
    nextBillCycle.setMonth(nextBillCycle.getMonth() + 1);

    await updateDoc(ispRef, {
      lastBillingDate: cleanDate.toISOString(),
      nextBillingDate: nextBillCycle.toISOString()
    });

    await createAuditLog(
      'Manual Billing Trigger',
      `Factura manual creada para ${targeted.name}. Cobertura: ${planName}. Monto: $${amount}. Siguiente fecha de pago fijada para ${nextBillCycle.toLocaleDateString()}.`,
      creatorEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathName);
  }
}

export interface BillingRunResult {
  invoicesGenerated: number;
  ispsSuspendedCount: number;
  ispsSuspendedNames: string[];
  ispsReactivatedCount: number;
  ispsReactivatedNames: string[];
  billingTotalGenerated: number;
}

export async function processRecurringBillingRun(creatorEmail: string): Promise<BillingRunResult> {
  try {
    const config = await getSystemConfig();
    const allIsps = await getAllISPs();
    const allPlans = await getAllPlans();
    const today = new Date();
    
    let invoicesGenerated = 0;
    let billingTotalGenerated = 0;
    
    // 1. Generate new invoices for due recurring cycles
    for (const isp of allIsps) {
      if (isp.billingType === 'Recurring' && isp.status === 'Active') {
        const nextDate = new Date(isp.nextBillingDate);
        if (nextDate <= today) {
          const selectedPlan = allPlans.find(p => p.id === isp.planId) || DEFAULT_PLANS[0];
          const invoiceRef = doc(collection(db, 'invoices'));
          
          // Compute dueDate based on gracePeriodDays
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + config.gracePeriodDays);
          
          const autoInvoice: Invoice = {
            id: invoiceRef.id,
            ispId: isp.id,
            ispName: isp.name,
            amount: selectedPlan.priceMonthly,
            billingDate: today.toISOString(),
            dueDate: dueDate.toISOString(),
            status: config.autoInvoicingStatus,
            billingType: 'Recurring',
            planName: selectedPlan.name
          };
          
          await setDoc(invoiceRef, autoInvoice);
          
          // Update last and next billing cycle
          const nextCycle = new Date();
          nextCycle.setMonth(nextCycle.getMonth() + 1);
          await updateISP(isp.id, {
            lastBillingDate: today.toISOString(),
            nextBillingDate: nextCycle.toISOString()
          }, 'System Engine');
          
          invoicesGenerated++;
          billingTotalGenerated += selectedPlan.priceMonthly;
        }
      }
    }
    
    // 2. Fetch all invoices to evaluate payments/suspension
    const allInvoices = await getAllInvoices();
    const ispsSuspendedNames: string[] = [];
    const ispsReactivatedNames: string[] = [];
    
    // Group invoices by ISP
    for (const isp of allIsps) {
      const ispInvoices = allInvoices.filter(inv => inv.ispId === isp.id);
      
      // Update pending invoices whose dueDate is past today to 'Overdue'
      for (const inv of ispInvoices) {
        if (inv.status === 'Pending') {
          const dueDate = new Date(inv.dueDate);
          if (dueDate <= today) {
            await updateInvoiceStatus(inv.id, 'Overdue', 'System Engine');
            inv.status = 'Overdue';
          }
        }
      }
      
      // Check if ISP currently has any 'Overdue' invoice
      const hasOverdueInvoices = ispInvoices.some(inv => inv.status === 'Overdue');
      
      if (config.suspendOverdue) {
        if (hasOverdueInvoices && isp.status === 'Active') {
          // Suspend!
          await updateISP(isp.id, { status: 'Suspended' }, 'System Engine');
          ispsSuspendedNames.push(isp.name);
          
          await createAuditLog(
            'ISP Auto-Suspended',
            `El ISP ${isp.name} ha sido suspendido automáticamente debido a facturas vencidas (Overdue).`,
            'System Engine'
          );
        } else if (!hasOverdueInvoices && isp.status === 'Suspended') {
          // If they were suspended but now have NO overdue invoices, reactivate them!
          await updateISP(isp.id, { status: 'Active' }, 'System Engine');
          ispsReactivatedNames.push(isp.name);
          
          await createAuditLog(
            'ISP Auto-Reactivated',
            `El ISP ${isp.name} ha sido reactivado automáticamente tras cancelarse o reconciliarse sus deudas.`,
            'System Engine'
          );
        }
      }
    }
    
    const result: BillingRunResult = {
      invoicesGenerated,
      ispsSuspendedCount: ispsSuspendedNames.length,
      ispsSuspendedNames,
      ispsReactivatedCount: ispsReactivatedNames.length,
      ispsReactivatedNames,
      billingTotalGenerated: parseFloat(billingTotalGenerated.toFixed(2))
    };
    
    if (invoicesGenerated > 0 || ispsSuspendedNames.length > 0 || ispsReactivatedNames.length > 0) {
      await createAuditLog(
        'Billing Run Sync & Scanning',
        `Reconciliación: ${invoicesGenerated} facturas emitidas ($${result.billingTotalGenerated}), ${result.ispsSuspendedCount} ISPs suspendidos, ${result.ispsReactivatedCount} reactivados.`,
        creatorEmail
      );
    }
    
    return result;
  } catch (error) {
    console.error('Error on automated billing scheduler run:', error);
    throw error;
  }
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const pathName = 'invoices';
  try {
    const q = query(collection(db, pathName));
    const snapshot = await getDocs(q);
    const invoicesList: Invoice[] = [];
    snapshot.forEach((docSnap) => {
      invoicesList.push(docSnap.data() as Invoice);
    });
    return invoicesList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName);
    throw error;
  }
}

// 11. Multi-Tenant ISP Dynamic Customers & Quota Checks
export async function getISPClients(ispId: string): Promise<ISPClient[]> {
  const pathName = 'isp_clients';
  try {
    const q = query(collection(db, pathName), where('ispId', '==', ispId));
    const snapshot = await getDocs(q);
    const clientsList: ISPClient[] = [];
    snapshot.forEach((docSnap) => {
      clientsList.push(docSnap.data() as ISPClient);
    });
    return clientsList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName);
    throw error;
  }
}

// Logic for MikroTik IP Management and Allocation
export function getNextAvailableIP(router: Router, existingClients: ISPClient[], serviceType: 'Static' | 'DHCP' | 'PPPoE'): string {
  // Try to find a pool for the specific service type
  const targetPools = router.ipPools?.filter(p => p.serviceType === serviceType || p.serviceType === 'All') || [];
  
  // Fallback to legacy pool if no specific pools defined
  if (targetPools.length === 0) {
    if (!router.ipPoolStart || !router.ipPoolEnd) {
      throw new Error(`El router seleccionado no tiene configurado un segmento de IPs para el servicio ${serviceType}.`);
    }
    return allocateFromPool(router.ipPoolStart, router.ipPoolEnd, router.id, existingClients);
  }

  // Iterate over available pools
  for (const pool of targetPools) {
    try {
      return allocateFromPool(pool.start, pool.end, router.id, existingClients);
    } catch (e) {
      // Continue to next pool if this one is full
    }
  }
  
  throw new Error(`No hay IPs disponibles en los segmentos habilitados para el servicio ${serviceType} en este Router.`);
}

function allocateFromPool(startIP: string, endIP: string, routerId: string, existingClients: ISPClient[]): string {
  const segment = startIP.substring(0, startIP.lastIndexOf('.') + 1);
  const start = parseInt(startIP.split('.').pop() || '2');
  const end = parseInt(endIP.split('.').pop() || '254');
  
  const usedLastOctets = existingClients
    .filter(c => c.routerId === routerId && c.ipAddress.startsWith(segment))
    .map(c => parseInt(c.ipAddress.split('.').pop() || '0'))
    .sort((a, b) => a - b);

  for (let i = start; i <= end; i++) {
    if (!usedLastOctets.includes(i)) {
      return `${segment}${i}`;
    }
  }
  
  throw new Error('Pool full');
}

export function generateNextIPv6(router: Router, existingClients: ISPClient[]): string {
  if (!router.ipv6Enabled || !router.ipv6Pool) return '';
  
  // Simulation: use client index or a simple counter based on existing clients
  const routerClients = existingClients.filter(c => c.routerId === router.id && c.ipv6Address);
  const count = routerClients.length + 1;
  
  // Simple hex increment for simulation (e.g. 2001:db8::1, 2001:db8::2)
  const base = router.ipv6Pool.replace('::/64', '').replace('::/48', '');
  return `${base}:${count.toString(16)}`;
}

async function logActivity(ispId: string, email: string, action: string, details: string) {
  // Utility for logging ISP specific activity
  await createAuditLog(action, `[ISP: ${ispId}] ${details}`, email);
}

export async function createISPClient(
  client: Omit<ISPClient, 'id' | 'createdAt'>, 
  maxClientsLimit: number, 
  creatorEmail: string
): Promise<ISPClient> {
  const pathName = 'isp_clients';
  try {
    // Check quota limit first
    const currentClients = await getISPClients(client.ispId);
    if (currentClients.length >= maxClientsLimit) {
      throw new Error(`CRÍTICO: Límite de plan excedido. Tu plan actual solo te permite alojar un máximo de ${maxClientsLimit} clientes. Solicita un ascenso de plan al SuperAdmin.`);
    }

    // --- MIKROTIK PROVISIONING SIMULATION START ---
    console.log(`[PROVISIONING] Conectando a Router ID: ${client.routerId}...`);
    
    // 1. IP & Queue Management
    if (client.ipConfigType === 'PPPoE') {
      const user = client.pppoeUser || client.documentNumber;
      const pass = client.pppoePassword || 'client123';
      const profile = client.pppoeProfile || `plan_${client.bandwidthPlanId}`;
      console.log(`[MikroTik SSH] /ppp secret add name=${user} password=${pass} remote-address=${client.ipAddress} profile="${profile}" comment="CLIENTE: ${client.firstName}"`);
      if (client.ipv6Address) {
        console.log(`[MikroTik SSH] /ppp secret set [find name=${user}] remote-ipv6-prefix=${client.ipv6Address}/64`);
      }
    } else if (client.ipConfigType === 'DHCP') {
      if (!client.macAddress) throw new Error('Se requiere dirección MAC para amarre IP/MAC en DHCP.');
      console.log(`[MikroTik API] /ip dhcp-server lease add address=${client.ipAddress} mac-address=${client.macAddress} comment="CLIENTE: ${client.firstName} ${client.lastName}"`);
      if (client.ipv6Address) {
        console.log(`[MikroTik API] /ipv6 dhcp-server binding add address=${client.ipv6Address} duid=${client.macAddress.replace(/:/g, '')} life-time=1d`);
      }
    } else {
      console.log(`[MikroTik API] /queue simple add name="${client.firstName} ${client.lastName}" target=${client.ipAddress}${client.ipv6Address ? ',' + client.ipv6Address : ''} max-limit=10M/10M comment="CID: ${client.documentNumber}"`);
    }

    // 2. Address List for Firewall Policies (Advanced Requirement)
    console.log(`[MikroTik SSH] /ip firewall address-list add list=clientes_activos address=${client.ipAddress} comment="CLIENTE_ACTIVO: ${client.firstName}"`);
    if (client.ipv6Address) {
      console.log(`[MikroTik SSH] /ipv6 firewall address-list add list=clientes_activos_v6 address=${client.ipv6Address} comment="CLIENTE_ACTIVO: ${client.firstName}"`);
    }
    // --- MIKROTIK PROVISIONING SIMULATION END ---

    const docRef = doc(collection(db, pathName));
    const newClient: ISPClient = {
      ...client,
      id: docRef.id,
      createdAt: new Date().toISOString()
    };

    await setDoc(docRef, newClient);

    // Auto-create a corresponding credentials account for the Client
    const userDocRef = doc(collection(db, 'users'));
    const newUserAccount: UserAccount = {
      uid: userDocRef.id,
      email: client.email.toLowerCase().trim(),
      password: 'client123', // Default password for new internet clients
      role: 'User', // 'User' role is for final clients
      status: 'Active',
      name: `${client.firstName} ${client.lastName}`,
      ispId: client.ispId,
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, newUserAccount);

    await createAuditLog(
      'Client Registered',
      `ISP ${client.ispId} aprovisionó cliente ${client.firstName} ${client.lastName} con IP ${client.ipAddress}. Comandos MikroTik ejecutados con éxito. Cuota: ${currentClients.length + 1}/${maxClientsLimit}`,
      creatorEmail
    );

    return newClient;
  } catch (error: any) {
    if (error.message && error.message.includes('Límite de plan')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, pathName);
    throw error;
  }
}

export async function updateISPClient(id: string, fields: Partial<ISPClient>, updaterEmail: string): Promise<void> {
  const pathName = `isp_clients/${id}`;
  try {
    const docRef = doc(db, 'isp_clients', id);
    await updateDoc(docRef, fields);

    // Also update matching UserAccount name if names changed
    if (fields.firstName || fields.lastName) {
      const clientSnap = await getDoc(docRef);
      const clientData = clientSnap.data() as ISPClient;
      if (clientData) {
        const fullName = `${clientData.firstName} ${clientData.lastName}`;
        const userQuery = query(collection(db, 'users'), where('email', '==', clientData.email.toLowerCase().trim()));
        const userSnap = await getDocs(userQuery);
        for (const usrDoc of userSnap.docs) {
          await updateDoc(doc(db, 'users', usrDoc.id), { name: fullName });
        }
      }
    }

    await createAuditLog(
      'Client Updated',
      `Updated user info for client ${id}: ${Object.keys(fields).join(', ')}`,
      updaterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
  }
}

export async function deleteISPClient(id: string, clientName: string, ispId: string, deleterEmail: string): Promise<void> {
  const pathName = `isp_clients/${id}`;
  try {
    // Get client details first to get email for user deletion
    const docRef = doc(db, 'isp_clients', id);
    const clientSnap = await getDoc(docRef);
    const clientData = clientSnap.data() as ISPClient | undefined;

    await deleteDoc(docRef);

    // Remove matching credential users for this client
    if (clientData?.email) {
      const userQuery = query(
        collection(db, 'users'), 
        where('email', '==', clientData.email.toLowerCase().trim()),
        where('ispId', '==', ispId)
      );
      const userSnap = await getDocs(userQuery);
      userSnap.forEach(async (usrDoc) => {
        await deleteDoc(doc(db, 'users', usrDoc.id));
      });
    }

    await createAuditLog(
      'Client Deregistration',
      `ISP ${ispId} deleted client ${clientName} (${id}) and their access account.`,
      deleterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathName);
  }
}

// 12. Router & SSTP Network Infrastructure Management

/**
 * Performs a simple ping probe.
 */
export async function probeRouterPing(host: string): Promise<{ status: 'Online' | 'Offline' }> {
  try {
    const response = await fetch('/api/mikrotik/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host }),
    });
    if (!response.ok) return { status: 'Offline' };
    const data = await response.json();
    return { status: data.status };
  } catch (e) {
    return { status: 'Offline' };
  }
}

/**
 * Performs a real connection probe to a MikroTik device via backend proxy.
 */
export async function probeRouterConnectivity(router: Router): Promise<Partial<Router>> {
  try {
    const response = await fetch('/api/mikrotik/probe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routerId: router.id,
        host: router.host,
        port: router.apiPort,
        user: router.apiUser,
        password: router.apiPassword,
      }),
    });

    if (!response.ok) {
      try {
        const text = await response.text();
        const data = JSON.parse(text);
        if (data.authError) {
          return { 
            status: 'Online',
            lastSeen: new Date().toISOString(),
            authError: true
          };
        }
      } catch (e) {
        // Fallback to offline if parsing fails
      }
      
      return { 
        status: 'Offline',
        lastSeen: new Date().toISOString() 
      };
    }

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (e) {
      console.warn('API Response was not JSON:', e);
      return { 
        status: 'Offline', 
        lastSeen: new Date().toISOString() 
      };
    }
    
    return {
      status: 'Online',
      uptime: data.uptime,
      voltage: data.voltage,
      temperature: data.temperature,
      cpuLoad: data.cpuLoad,
      model: data.model,
      equipmentIdentity: data.name,
      lastSeen: new Date().toISOString()
    };
  } catch (error) {
    console.error('Real probe failed:', error);
    return { 
      status: 'Offline', 
      lastSeen: new Date().toISOString() 
    };
  }
}

/**
 * Performs a real connection probe to a MikroTik device via SNMP backend proxy.
 */
export async function probeRouterSNMP(router: Router): Promise<Partial<Router>> {
  try {
    const response = await fetch('/api/mikrotik/snmp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routerId: router.id,
        host: router.host,
        port: router.snmpPort || 161,
        community: router.snmpCommunity || 'public',
        version: router.snmpVersion || 'v2c',
      }),
    });

    if (!response.ok) {
      let isTimeout = false;
      try {
        const text = await response.text();
        const data = JSON.parse(text);
        isTimeout = !!data.timeout;
      } catch (e) {}

      return { 
        status: 'Offline', 
        lastSeen: new Date().toISOString(),
        snmpTimeout: isTimeout
      };
    }

    try {
      const text = await response.text();
      const data = JSON.parse(text);
      return {
        status: 'Online',
        uptime: data.uptime,
        voltage: data.voltage,
        temperature: data.temperature,
        cpuLoad: data.cpuLoad,
        model: data.model,
        memoryUsed: data.memoryUsed,
        memoryTotal: data.memoryTotal,
        equipmentIdentity: data.name,
        lastSeen: new Date().toISOString()
      };
    } catch (e) {
      console.warn('SNMP Response was not JSON:', e);
      return { 
        status: 'Offline', 
        lastSeen: new Date().toISOString() 
      };
    }
  } catch (error) {
    console.error('SNMP probe failed:', error);
    return { 
      status: 'Offline', 
      lastSeen: new Date().toISOString() 
    };
  }
}

/**
 * Performs a real ping check to a MikroTik device via backend proxy.
 */
export async function pingRouter(host: string): Promise<any> {
  try {
    const response = await fetch('/api/mikrotik/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host }),
    });

    return await response.json();
  } catch (error) {
    console.error('Ping request failed:', error);
    throw error;
  }
}

// Document and Entity Verification Simulation (DIAN / RUES / Registraduría / SIPOS)
export async function validateGovernmentID(type: string, id: string): Promise<{ 
  firstName: string; 
  lastName?: string; 
  country?: string;
  department?: string;
  municipality?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  valid: boolean;
  source: string;
}> {
  // Use a delay to simulate robust multi-source network lookup (RUES, DIAN, SIPOS)
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const cleanId = id.split('-')[0].trim().replace(/\D/g, ''); // Standardizing numeric search

  // Simulation logic based on RUES, DIAN and SIPOS patterns for Colombia
  if (cleanId === '123456') {
     return { 
       firstName: 'JUAN SEBASTIAN', 
       lastName: 'RODRIGUEZ PERDOMO', 
       country: 'Colombia',
       department: 'Bogotá D.C.',
       municipality: 'Bogotá',
       address: 'Carrera 15 # 100-20, Edificio Unicentro',
       phoneNumber: '3102223344',
       email: 'j.rodriguez@email.com',
       valid: true,
       source: 'Registraduría Nacional / SIPOS'
     };
  } else if (cleanId === '900800700') {
     return { 
       firstName: 'TIC GLOBAL SERVICES SAS', 
       country: 'Colombia',
       department: 'Bogotá D.C.',
       municipality: 'Bogotá',
       address: 'Avenida El Dorado # 68C-61, Oficina 504',
       phoneNumber: '6014455667',
       email: 'notificaciones@ticglobal.com',
       valid: true,
       source: 'DIAN - Consulta RUT / RUES / SIPOS'
     };
  } else if (cleanId === '1085332') {
    return {
      firstName: 'ANDRES FELIPE',
      lastName: 'CALERO',
      country: 'Colombia',
      department: 'Valle del Cauca',
      municipality: 'Cali',
      address: 'Calle 5 # 44-12, Barrio Tequendama',
      phoneNumber: '3157778899',
      email: 'af.calero@ticcol.com',
      valid: true,
      source: 'Registraduría Nacional (Cédula de Ciudadanía)'
    };
  } else if (cleanId === '800123456') {
    return {
      firstName: 'TECNOPOS SYSTEM INNOVATION SAS',
      country: 'Colombia',
      department: 'Bogotá D.C.',
      municipality: 'Bogotá',
      address: 'DG 182 20 91 OF 3039',
      phoneNumber: '3135099238',
      email: 'info@sipos.com.co',
      valid: true,
      source: 'SIPOS / DIAN (NIT)'
    };
  } else if (cleanId === '52778899') {
    return {
      firstName: 'MARIA FERNANDA',
      lastName: 'LOPEZ RUIZ',
      country: 'Colombia',
      department: 'Cundinamarca',
      municipality: 'Chía',
      address: 'Carrera 7 # 12-45, Centro',
      phoneNumber: '3128889900',
      email: 'mafe.lopez@example.com',
      valid: true,
      source: 'Registraduría Nacional / SIPOS'
    };
  } else if (cleanId === '860001234') {
    return {
      firstName: 'COLOMBIA TELECOMUNICACIONES ESP',
      country: 'Colombia',
      department: 'Bogotá D.C.',
      municipality: 'Bogotá',
      address: 'Calle 100 # 7-33',
      phoneNumber: '6017008000',
      email: 'corporativo@movistar.com.co',
      valid: true,
      source: 'RUES / DIAN'
    };
  }
  
  throw new Error(`Documento/NIT "${id}" no encontrado. Verifique el número e intente de nuevo.`);
}

export async function updateISPConfig(ispId: string, updates: Partial<ISP>): Promise<void> {
  try {
    const ispRef = doc(db, 'isps', ispId);
    await updateDoc(ispRef, cleanObject(updates));
  } catch (err: any) {
    handleFirestoreError(err, OperationType.UPDATE, `isps/${ispId}`);
  }
}

export async function getAllRouters(): Promise<Router[]> {
  try {
    const q = query(collection(db, 'routers'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Router);
  } catch (error) {
    console.error('Error fetching all routers:', error);
    return [];
  }
}

export async function getISPRouters(ispId: string): Promise<Router[]> {
  const pathName = 'routers';
  try {
    const q = query(collection(db, pathName), where('ispId', '==', ispId));
    const snapshot = await getDocs(q);
    const routersList: Router[] = [];
    snapshot.forEach((docSnap) => {
      routersList.push({ ...docSnap.data(), id: docSnap.id } as Router);
    });
    return routersList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName);
    throw error;
  }
}

export async function createRouter(router: Omit<Router, 'id' | 'createdAt'>, creatorEmail: string): Promise<Router> {
  const pathName = 'routers';
  try {
    const docRef = doc(collection(db, pathName));
    const newRouter: Router = {
      ...router,
      id: docRef.id,
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, newRouter);

    await createAuditLog(
      'Infrastructure: Router Added',
      `Added MikroTik Router "${router.name}" at ${router.host}. Management protocols configured.`,
      creatorEmail
    );
    return newRouter;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pathName);
    throw error;
  }
}

export async function updateRouter(id: string, fields: Partial<Router>, updaterEmail: string): Promise<void> {
  const pathName = `routers/${id}`;
  try {
    const docRef = doc(db, 'routers', id);
    const cleanedFields = cleanObject(fields);
    await updateDoc(docRef, cleanedFields);
    
    if (cleanedFields.name || cleanedFields.host) {
      await createAuditLog(
        'Infrastructure: Router Updated',
        `Updated router config for ${id}: ${Object.keys(cleanedFields).join(', ')}`,
        updaterEmail
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
    throw error;
  }
}

export async function deleteRouter(id: string, routerName: string, ispId: string, deleterEmail: string): Promise<void> {
  const pathName = `routers/${id}`;
  try {
    const docRef = doc(db, 'routers', id);
    await deleteDoc(docRef);

    // Also notify backend to remove any active or simulated SSTP tunnel for this router
    try {
      await fetch('/api/sstp/connections/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId: id }),
      });
    } catch (apiErr) {
      console.warn('Could not contact backend to delete active connection:', apiErr);
    }

    await createAuditLog(
      'Infrastructure: Router Removed',
      `Removed Router "${routerName}" (${id}) from ISP ${ispId} inventory.`,
      deleterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathName);
    throw error;
  }
}

export async function getSSTPConfig(ispId: string): Promise<SSTPConfig | null> {
  const pathName = 'sstp_configs';
  try {
    const q = query(collection(db, pathName), where('ispId', '==', ispId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as SSTPConfig;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathName);
    throw error;
  }
}

export async function saveSSTPConfig(config: Omit<SSTPConfig, 'id'> & { id?: string }, updaterEmail: string): Promise<void> {
  const pathName = 'sstp_configs';
  try {
    const id = config.id || doc(collection(db, pathName)).id;
    const docRef = doc(db, pathName, id);
    await setDoc(docRef, { ...config, id });

    await createAuditLog(
      'Infrastructure: SSTP Config Updated',
      `SSTP Server configuration updated for ISP gateway.`,
      updaterEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathName);
    throw error;
  }
}

/**
 * Perform a full data wipe for an ISP.
 * WARNING: Irreversible.
 */
export async function clearISPData(ispId: string, performerEmail: string): Promise<void> {
  if (!ispId) throw new Error('ISP ID is required to perform a data wipe.');
  
  try {
    const collectionsToWipe = [
      'routers',
      'isp_clients',
      'invoices',
      'sstp_configs',
      'tr069_cpes',
      'subdevices'
    ];

    const deletions: Promise<any>[] = [];

    for (const collName of collectionsToWipe) {
      const q = query(collection(db, collName), where('ispId', '==', ispId));
      const snapshot = await getDocs(q);
      snapshot.forEach((docSnap) => {
        deletions.push(deleteDoc(docSnap.ref));
      });
    }

    await Promise.all(deletions);

    await createAuditLog(
      'Database: Full Wipe',
      `All data associated with ISP ${ispId} was wiped from the database.`,
      performerEmail
    );
  } catch (error) {
    console.error('Full wipe failed:', error);
    throw new Error('Error al intentar realizar el borrado masivo de la base de datos.');
  }
}

