import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';

export interface Appointment {
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
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
  async getOccupiedSlots(date: string): Promise<string[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      // Creamos la consulta: buscar por fecha
      const q = query(appointmentsRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      
      // Mapeamos los resultados para devolver un array solo con las horas (ej: ['10:00', '16:30'])
      return querySnapshot.docs.map(doc => doc.data()['time'] as string);
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      return []; // Si hay error, devolvemos un array vacío por seguridad
    }
  }
}