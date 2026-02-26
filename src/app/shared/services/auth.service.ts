import { Injectable, inject } from '@angular/core';
import { Auth, authState, signInWithPopup, GoogleAuthProvider, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore); // Inyectamos la base de datos para el perfil
  
  // Observable para saber si el usuario está logueado en tiempo real
  public user$ = authState(this.auth);

  // 1. INICIAR SESIÓN CON GOOGLE
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

  // 2. CERRAR SESIÓN
  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  // 3. OBTENER USUARIO ACTUAL (Para lecturas rápidas)
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // 4. PERFIL: Traer los datos extra del cliente
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

  // 5. PERFIL: Guardar o actualizar el teléfono
  async updateUserProfile(uid: string, profileData: any) {
    try {
      const docRef = doc(this.firestore, `users/${uid}`);
      // { merge: true } es vital para no borrar datos si en el futuro añadimos más cosas
      await setDoc(docRef, profileData, { merge: true });
    } catch (error) {
      console.error('Error al guardar el perfil:', error);
      throw error;
    }
  }
}