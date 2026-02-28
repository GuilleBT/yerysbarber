import { Injectable, inject } from '@angular/core';
import { Auth, authState, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private auth = inject(Auth);
  private firestore = inject(Firestore); 
  
  // ==========================================================
  // LA ÚNICA FUENTE DE LA VERDAD PARA EL CORREO DEL ADMINISTRADOR
  // ==========================================================
  public readonly ADMIN_EMAIL = 'yeraygarcia431@gmail.com';

  public user$ = authState(this.auth);

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result.user;
    } catch (error) {
      console.error('Error en el login:', error);
      return null;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  async getUserProfile(uid: string) {
    try {
      const docRef = doc(this.firestore, `users/${uid}`);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error al cargar el perfil:', error);
      return null;
    }
  }

  async updateUserProfile(uid: string, profileData: any) {
    try {
      const docRef = doc(this.firestore, `users/${uid}`);
      await setDoc(docRef, profileData, { merge: true });
    } catch (error) {
      console.error('Error al guardar el perfil:', error);
      throw error;
    }
  }
}