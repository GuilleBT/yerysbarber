import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, getDocs, doc, deleteDoc } from '@angular/fire/firestore';

export interface Review {
  id?: string;
  clientId: string;
  clientName: string;
  rating: number; // 1 to 5
  comment: string;
  date: number; // Timestamp
  appointmentId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private firestore = inject(Firestore);

  // ---------------------------------------------------------
  // OBTENER RESEÑAS (CON SEED AUTOMÁTICO SI ESTÁ VACÍO)
  // ---------------------------------------------------------
  async getReviews(): Promise<Review[]> {
    try {
      const reviewsRef = collection(this.firestore, 'reviews');
      const q = query(reviewsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Si no hay reseñas en Firestore, sembramos las 3 reseñas iniciales para que la app no se vea vacía
        await this.seedInitialReviews();
        // Volvemos a consultar
        const newSnapshot = await getDocs(q);
        return newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Review));
      }

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Review));
    } catch (error) {
      console.error('Error al obtener las opiniones:', error);
      return [];
    }
  }

  // ---------------------------------------------------------
  // GUARDAR UNA NUEVA OPINIÓN
  // ---------------------------------------------------------
  async addReview(review: Review): Promise<void> {
    try {
      const reviewsRef = collection(this.firestore, 'reviews');
      await addDoc(reviewsRef, review);
    } catch (error) {
      console.error('Error al guardar la opinión:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // BORRAR UNA OPINIÓN (SOLO ADMIN)
  // ---------------------------------------------------------
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'reviews', reviewId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error al eliminar la opinión:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------
  // SEMBRAR RESEÑAS INICIALES FICTICIAS PERO DE ALTO STANDING
  // ---------------------------------------------------------
  private async seedInitialReviews(): Promise<void> {
    const reviewsRef = collection(this.firestore, 'reviews');
    const initialReviews: Review[] = [
      {
        clientId: 'seed-1',
        clientName: 'Carlos M.',
        rating: 5,
        comment: 'Excelente trato y un corte impecable. Yeray es un profesional de diez, cuida cada detalle al máximo. Totalmente recomendable.',
        date: Date.now() - 2 * 24 * 60 * 60 * 1000, // Hace 2 días
        appointmentId: 'seed-appt-1'
      },
      {
        clientId: 'seed-2',
        clientName: 'David R.',
        rating: 5,
        comment: 'La mejor barbería de la zona. Muy puntuales con las citas, el local está guapísimo y limpio, y la atención de Yeray inmejorable.',
        date: Date.now() - 7 * 24 * 60 * 60 * 1000, // Hace 1 semana
        appointmentId: 'seed-appt-2'
      },
      {
        clientId: 'seed-3',
        clientName: 'Alejandro G.',
        rating: 5,
        comment: 'Yeray tiene un talento increíble. Llevo yendo a cortarme el pelo con él desde hace meses y no cambio por nada del mundo. El ambiente es de 10.',
        date: Date.now() - 14 * 24 * 60 * 60 * 1000, // Hace 2 semanas
        appointmentId: 'seed-appt-3'
      }
    ];

    for (const review of initialReviews) {
      await addDoc(reviewsRef, review);
    }
  }
}
