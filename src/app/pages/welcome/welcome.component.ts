import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../shared/services/auth.service';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { ReviewService, Review } from '../../shared/services/review.service';
import { Analytics, logEvent } from '@angular/fire/analytics';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss'
})
export class WelcomeComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  private appointmentService = inject(AppointmentService);
  private reviewService = inject(ReviewService);
  private analytics = inject(Analytics, { optional: true });

  reviews: Review[] = [];
  averageRating: number = 5.0;
  totalReviews: number = 0;
  
  isAdmin = false;
  currentUserId: string | null = null;
  currentUserName = '';
  
  // Variables para la valoración pendiente
  pendingReviewAppointment: Appointment | null = null;
  selectedRating = 5;
  reviewComment = '';
  isSavingReview = false;

  async ngOnInit() {
    await this.loadReviews();

    // Escuchamos el estado del usuario en tiempo real
    this.authService.user$.subscribe(async user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || 'Cliente';
        
        // Si hay un usuario logueado y es el jefe...
        if (user.email === this.authService.ADMIN_EMAIL) {
          this.isAdmin = true;
          // Teletransporte al panel de control si es el admin
          this.router.navigate(['/admin']);
        } else {
          this.isAdmin = false;
          // Si es un cliente normal, verificamos si tiene citas pendientes de valorar
          await this.checkPendingReviews(user.uid);
        }
      } else {
        this.currentUserId = null;
        this.currentUserName = '';
        this.isAdmin = false;
        this.pendingReviewAppointment = null;
      }
    });
  }

  reviewFilter: 'all' | 'with-comment' = 'all';

  hasComment(review: Review): boolean {
    if (!review.comment) return false;
    const trimmed = review.comment.trim();
    return trimmed.length > 0 && trimmed !== 'Sin comentarios, solo valoración de estrellas.';
  }

  get filteredReviews(): Review[] {
    if (this.reviewFilter === 'with-comment') {
      return this.reviews.filter(r => this.hasComment(r));
    }
    return this.reviews;
  }

  get reviewsWithCommentCount(): number {
    return this.reviews.filter(r => this.hasComment(r)).length;
  }

  async loadReviews() {
    const rawReviews = await this.reviewService.getReviews();
    this.totalReviews = rawReviews.length;
    if (this.totalReviews > 0) {
      const sum = rawReviews.reduce((acc, r) => acc + r.rating, 0);
      this.averageRating = parseFloat((sum / this.totalReviews).toFixed(1));
    } else {
      this.averageRating = 5.0;
    }

    // Priorizamos: primero las reseñas con comentario real, luego las que son solo estrellas (ambas por fecha desc)
    this.reviews = [...rawReviews].sort((a, b) => {
      const aHas = this.hasComment(a);
      const bHas = this.hasComment(b);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return (b.date || 0) - (a.date || 0);
    });
  }

  async checkPendingReviews(userId: string) {
    try {
      const appointments = await this.appointmentService.getUserAppointments(userId);
      const now = new Date();

      // 1. Filtramos las citas que están en el pasado y tienen estado 'completed' o 'confirmed'
      const pastAppointments = appointments.filter(appt => {
        if (appt.status === 'completed') return true;
        if (appt.status === 'confirmed') {
          const [year, month, day] = appt.date.split('-').map(Number);
          const [hour, minute] = appt.time.split(':').map(Number);
          const apptDate = new Date(year, month - 1, day, hour, minute);
          return apptDate < now;
        }
        return false;
      });

      // 2. Si no hay citas pasadas, no hay nada que valorar
      if (pastAppointments.length === 0) {
        this.pendingReviewAppointment = null;
        return;
      }

      // 3. Ordenamos las citas pasadas por fecha y hora real para encontrar la ABSOLUTAMENTE MÁS RECIENTE
      pastAppointments.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
        const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
        return dateTimeB - dateTimeA; // Descendente: la más reciente primero
      });

      const latestPastAppt = pastAppointments[0];

      // 4. ÚNICAMENTE comprobamos si esta última cita está pendiente de valorar
      if (latestPastAppt && latestPastAppt.rated !== true && latestPastAppt.rated !== 'skipped') {
        this.pendingReviewAppointment = latestPastAppt;
        this.selectedRating = 5; // Por defecto 5 estrellas
        this.reviewComment = '';
      } else {
        this.pendingReviewAppointment = null;
      }
    } catch (error) {
      console.error('Error al comprobar valoraciones pendientes:', error);
    }
  }

  selectRating(rating: number) {
    this.selectedRating = rating;
  }

  async submitReview() {
    if (!this.pendingReviewAppointment || !this.currentUserId) return;

    this.isSavingReview = true;
    try {
      const review: Review = {
        clientId: this.currentUserId,
        clientName: this.currentUserName,
        rating: this.selectedRating,
        comment: this.reviewComment.trim(),
        date: Date.now(),
        appointmentId: this.pendingReviewAppointment.id || ''
      };

      await this.reviewService.addReview(review);
      await this.appointmentService.markAppointmentAsRated(this.pendingReviewAppointment.id!, true);

      // Registrar evento en Google Analytics
      if (this.analytics) {
        logEvent(this.analytics, 'review_submitted', {
          rating: this.selectedRating
        });
      }

      Swal.fire({
        title: '¡Muchas gracias!',
        text: 'Tu valoración se ha guardado correctamente. Ayuda mucho a Yeray.',
        icon: 'success',
        confirmButtonColor: '#c5a059',
        timer: 3000
      });

      this.pendingReviewAppointment = null;
      await this.loadReviews();
    } catch (error) {
      console.error('Error al enviar la opinión:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo guardar tu valoración. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonColor: '#c5a059'
      });
    } finally {
      this.isSavingReview = false;
    }
  }

  async skipReview() {
    if (!this.pendingReviewAppointment) return;

    try {
      await this.appointmentService.markAppointmentAsRated(this.pendingReviewAppointment.id!, 'skipped');
      this.pendingReviewAppointment = null;
    } catch (error) {
      console.error('Error al omitir la valoración:', error);
    }
  }

  async deleteReview(reviewId: string) {
    const result = await Swal.fire({
      title: '¿Eliminar reseña?',
      text: 'Esta acción no se puede deshacer y borrará la opinión de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      cancelButtonColor: '#1c1b18',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff'
    });

    if (result.isConfirmed) {
      try {
        await this.reviewService.deleteReview(reviewId);
        Swal.fire({
          title: 'Eliminada',
          text: 'La reseña ha sido eliminada correctamente.',
          icon: 'success',
          confirmButtonColor: '#c5a059',
          timer: 2000
        });
        await this.loadReviews();
      } catch (error) {
        console.error('Error al eliminar la reseña:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar la reseña.',
          icon: 'error',
          confirmButtonColor: '#c5a059'
        });
      }
    }
  }

  scrollToReviews() {
    const element = document.getElementById('reviews-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}