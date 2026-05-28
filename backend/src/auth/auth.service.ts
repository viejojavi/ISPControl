import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService implements OnModuleInit {
  private db: any;

  constructor() {
    let app: any;
    try {
      if (getApps().length === 0) {
        app = initializeApp();
      } else {
        app = getApp();
      }
    } catch (e) {
      console.error('AuthService: Error during initializeApp, attempting fallback:', e);
    }

    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      console.log('AuthService: Initializing Firestore with custom databaseId:', dbId);
      this.db = getFirestore(app, dbId);
      console.log('AuthService: Firestore client instantiated successfully with databaseId:', dbId);
    } catch (err) {
      console.error('AuthService: Error loading firebase config, falling back to default Firestore initialization:', err);
      try {
        this.db = getFirestore(app);
      } catch (fallbackError) {
        console.error('AuthService: Serious fallback error initializing Firestore:', fallbackError);
      }
    }
  }

  onModuleInit() {
    this.seedDefaultUsers().catch(err => {
      console.error('AuthService: Error seeding default users:', err);
    });
  }

  async seedDefaultUsers() {
    const defaultEmails = ['oscarj.castillo@hotmail.com', 'ticcolcolombia@gmail.com'];
    for (const email of defaultEmails) {
      const cleanEmail = email.toLowerCase().trim();
      const usersSnapshot = await this.db.collection('users')
        .where('email', '==', cleanEmail)
        .get();

      if (usersSnapshot.empty) {
        const docRef = this.db.collection('users').doc();
        const defaultUser = {
          uid: docRef.id,
          email: cleanEmail,
          password: '12345678',
          role: 'SuperAdmin'
        };
        await docRef.set(defaultUser);
        console.log(`AuthService: seeded default user: ${cleanEmail}`);
      }
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    console.log('AuthService: validateUser called for', email);
    if (!email || !pass) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    
    // Query users collection in Firestore
    const usersSnapshot = await this.db.collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .get();
      
    if (usersSnapshot.empty) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    
    if (userData.password === pass) {
      return { email: userData.email, role: userData.role };
    }
    
    throw new UnauthorizedException('Credenciales inválidas');
  }

  async login(user: any) {
    console.log('AuthService: login called');
    const payload = { email: user.email, role: user.role };
    return {
      access_token: jwt.sign(payload, 'SECRET_KEY', { expiresIn: '60m' }),
    };
  }

  async register(email: string, pass: string, role: string = 'User') {
    console.log('AuthService: register called for', email);
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !pass) {
      throw new Error('El correo y la contraseña son requeridos.');
    }

    const usersSnapshot = await this.db.collection('users')
      .where('email', '==', cleanEmail)
      .get();

    if (!usersSnapshot.empty) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    const docRef = this.db.collection('users').doc();
    const newUser = {
      uid: docRef.id,
      email: cleanEmail,
      password: pass,
      role: role
    };

    await docRef.set(newUser);
    return { message: 'Usuario registrado exitosamente', user: { email: newUser.email, role: newUser.role } };
  }

  async forgotPassword(email: string) {
    console.log('AuthService: forgotPassword called for', email);
    if (!email) {
      throw new Error('El correo electrónico es requerido.');
    }
    return { message: 'Si el correo existe, se ha enviado un enlace de recuperación.' };
  }
}
