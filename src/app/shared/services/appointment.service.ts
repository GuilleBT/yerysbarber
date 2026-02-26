import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc } from '@angular/fire/firestore';

export interface Appointment {
  id?: string; // ID opcional, se asignará automáticamente al guardar en Firestore
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private firestore = inject(Firestore);

  async createAppointment(appointment: Appointment) {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const docRef = await addDoc(appointmentsRef, appointment);
      return docRef;
    } catch (error) {
      console.error('Error al guardar la cita:', error);
      throw error;
    }
  }

  // NUEVA FUNCIÓN: Busca las horas ocupadas en un día concreto
  // Busca las horas ocupadas en un día concreto (ignorando las canceladas)
  async getOccupiedSlots(date: string): Promise<string[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      
      // Filtramos los documentos para NO incluir los que están cancelados
      return querySnapshot.docs
        .filter(document => document.data()['status'] !== 'cancelled') // <-- EL FILTRO MÁGICO
        .map(document => document.data()['time'] as string);
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      return []; 
    }
  }

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      // Buscamos solo las citas de este usuario en concreto
      const q = query(appointmentsRef, where('clientId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      // Mapeamos los datos y recuperamos el ID del documento
      const appointments = querySnapshot.docs.map(doc => {
        return {
          id: doc.id,
          ...doc.data()
        } as Appointment;
      });

      // Ordenamos las citas de más reciente a más antigua
      return appointments.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error al obtener el historial:', error);
      return [];
    }
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    try {
      // Apuntamos al documento exacto usando su ID
      const docRef = doc(this.firestore, 'appointments', appointmentId);
      // Actualizamos solo el campo status
      await updateDoc(docRef, { status: 'cancelled' });
    } catch (error) {
      console.error('Error al cancelar la cita:', error);
      throw error;
    }
  }
  // ADMIN: Obtiene todas las citas de TODOS los clientes para un día concreto
  async getDailyAgenda(date: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      
      const appointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      // Ordenamos por hora para que le salgan en orden en la agenda
      return appointments.sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error al obtener la agenda:', error);
      return [];
    }
  }

  // ADMIN: Obtiene el número total de cortes completados en la historia
  async getTotalCompletedCuts(): Promise<number> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('status', '==', 'completed'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size; // Devuelve directamente la cantidad de documentos
    } catch (error) {
      console.error('Error al contar los cortes:', error);
      return 0;
    }
  }

  // ADMIN: Marca una cita como completada
  async markAsCompleted(appointmentId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'appointments', appointmentId);
      await updateDoc(docRef, { status: 'completed' });
    } catch (error) {
      console.error('Error al completar la cita:', error);
      throw error;
    }
  }
// ADMIN: Cambia el estado de una cita al valor que le pasemos
  async updateAppointmentStatus(appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed'): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'appointments', appointmentId);
      await updateDoc(docRef, { status: newStatus });
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      throw error;
    }
  }
  // ADMIN: Obtiene TODAS las peticiones pendientes globales
  async getAllPendingAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const appointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      // Las ordenamos por fecha para que vea primero las más urgentes
      return appointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error al obtener pendientes:', error);
      return [];
    }
  }
}