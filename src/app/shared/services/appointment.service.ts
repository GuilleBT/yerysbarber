import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/enviroment';

export interface Appointment {
  id?: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string;
  createdAt: number;
  clientPhone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  // Inyecciones de dependencias modernas y limpias
  private firestore = inject(Firestore);
  private http = inject(HttpClient);

  // ---------------------------------------------------------
  // 1. CREAR CITA Y AVISAR POR TELEGRAM
  // ---------------------------------------------------------
  async createAppointment(appointment: Appointment) {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const docRef = await addDoc(appointmentsRef, appointment);
      
      // ¡AQUÍ ESTÁ EL GATILLO! 
      // Si llega a esta línea, Firebase ha guardado la cita correctamente.
      // Disparamos el aviso a Telegram de forma invisible.
      this.enviarAvisoTelegram(appointment.clientName, appointment.date, appointment.time);

      return docRef;
    } catch (error) {
      console.error('Error al guardar la cita:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // FUNCIONES DEL CLIENTE
  // ---------------------------------------------------------
  async getOccupiedSlots(date: string): Promise<string[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .filter(document => document.data()['status'] !== 'cancelled')
        .map(document => document.data()['time'] as string);
    } catch (error) {
      console.error('Error al obtener disponibilidad:', error);
      return []; 
    }
  }

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('clientId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const appointments = querySnapshot.docs.map(doc => {
        return {
          id: doc.id,
          ...doc.data()
        } as Appointment;
      });

      return appointments.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error al obtener el historial:', error);
      return [];
    }
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'appointments', appointmentId);
      await updateDoc(docRef, { status: 'cancelled' });
    } catch (error) {
      console.error('Error al cancelar la cita:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // FUNCIONES DEL ADMIN (YERAY)
  // ---------------------------------------------------------
  async getDailyAgenda(date: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
      
      const appointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      return appointments.sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error al obtener la agenda:', error);
      return [];
    }
  }

  async getTotalCompletedCuts(): Promise<number> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('status', '==', 'completed'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error al contar los cortes:', error);
      return 0;
    }
  }

  async markAsCompleted(appointmentId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'appointments', appointmentId);
      await updateDoc(docRef, { status: 'completed' });
    } catch (error) {
      console.error('Error al completar la cita:', error);
      throw error;
    }
  }

  async updateAppointmentStatus(appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed'): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'appointments', appointmentId);
      await updateDoc(docRef, { status: newStatus });
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      throw error;
    }
  }

  async getAllPendingAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, 'appointments');
      const q = query(appointmentsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const appointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      return appointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Error al obtener pendientes:', error);
      return [];
    }
  }

  // ---------------------------------------------------------
  // FUNCIONES DE AJUSTES DE LA BARBERÍA
  // ---------------------------------------------------------
  async getBarbershopSettings(): Promise<any> {
    try {
      const docRef = doc(this.firestore, 'settings/general');
      const docSnap = await getDoc(docRef);
      
      const defaultWeekly = {
        1: '10:00, 10:30, 11:00, 11:30, 12:00, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00',
        2: '10:00, 10:30, 11:00, 11:30, 12:00, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00',
        3: '10:00, 10:30, 11:00, 11:30, 12:00, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00',
        4: '10:00, 10:30, 11:00, 11:30, 12:00, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00',
        5: '10:00, 10:30, 11:00, 11:30, 12:00, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00',
        6: '10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00',
        0: ''
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data['weeklySchedule']) data['weeklySchedule'] = defaultWeekly;
        if (!data['blockedSlots']) data['blockedSlots'] = {};
        return data;
      }
      
      return {
        blockedDates: [],
        weeklySchedule: defaultWeekly,
        blockedSlots: {}
      };
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
      return null;
    }
  }

  async saveBarbershopSettings(settings: any): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'settings/general');
      await setDoc(docRef, settings, { merge: true });
    } catch (error) {
      console.error('Error al guardar ajustes:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // EL MOTOR DE TELEGRAM
  // ---------------------------------------------------------
  private enviarAvisoTelegram(nombreCliente: string, fecha: string, hora: string) {
  // Leemos las claves desde el entorno protegido
  const telegramToken = environment.telegramToken;
  const chatId = environment.telegramChatId;

  const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

  const mensaje = `💈 ¡NUEVA RESERVA!\n\n👤 Cliente: ${nombreCliente}\n📅 Fecha: ${fecha}\n⏰ Hora: ${hora}\n\nRevisa tu panel de YerysBarber.`;

  const body = {
    chat_id: chatId,
    text: mensaje
  };

  this.http.post(url, body).subscribe({
    next: () => console.log('¡Mensaje de Telegram enviado con éxito!'),
    error: (err) => console.error('Error al enviar el aviso por Telegram', err)
  });
}
}