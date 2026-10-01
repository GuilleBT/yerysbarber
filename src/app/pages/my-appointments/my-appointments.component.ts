import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { PolicyService } from '../../shared/services/policy.service';
import { RouterModule } from '@angular/router';
import { Analytics, logEvent } from '@angular/fire/analytics';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressSpinnerModule,
    MatDividerModule,
    RouterModule
  ],
  providers: [DatePipe],
  templateUrl: './my-appointments.component.html',
  styleUrl: './my-appointments.component.scss'
})
export class MyAppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  public policyService = inject(PolicyService);
  private analytics = inject(Analytics, { optional: true });

  // Separamos las citas en listas según su estado
  pendingAppointments: Appointment[] = [];
  completedAppointments: Appointment[] = [];
  cancelledAppointments: Appointment[] = [];
  isLoading: boolean = true;

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      const allAppointments = await this.appointmentService.getUserAppointments(user.uid);
      
      // 1. PRÓXIMAS CITAS: Pendientes de revisión y confirmadas
      this.pendingAppointments = allAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed');

      // 2. HISTORIAL: Marcadas como terminadas tras el corte
      this.completedAppointments = allAppointments.filter(a => a.status === 'completed');

      // 3. RECHAZADAS / CANCELADAS: Solo las que el usuario NO haya descartado
      const dismissedIds = this.getDismissedCancelledIds();
      this.cancelledAppointments = allAppointments
        .filter(a => a.status === 'cancelled' && a.id && !dismissedIds.includes(a.id))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);
    }
    this.isLoading = false;
  }

  private getDismissedCancelledIds(): string[] {
    try {
      const data = localStorage.getItem('yerys_dismissed_cancelled_ids');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveDismissedCancelledIds(ids: string[]) {
    try {
      localStorage.setItem('yerys_dismissed_cancelled_ids', JSON.stringify(ids));
    } catch (e) {
      console.warn('Error saving dismissed cancelled ids', e);
    }
  }

  dismissCancelledAppointment(id: string | undefined, event?: Event) {
    if (event) event.stopPropagation();
    if (!id) return;
    
    // Ocultar al instante de la lista
    this.cancelledAppointments = this.cancelledAppointments.filter(a => a.id !== id);
    
    // Guardar en localStorage
    const dismissed = this.getDismissedCancelledIds();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      this.saveDismissedCancelledIds(dismissed);
    }
  }

  dismissAllCancelled() {
    const idsToDismiss = this.cancelledAppointments.map(a => a.id).filter((id): id is string => !!id);
    this.cancelledAppointments = [];
    
    const dismissed = this.getDismissedCancelledIds();
    for (const id of idsToDismiss) {
      if (!dismissed.includes(id)) {
        dismissed.push(id);
      }
    }
    this.saveDismissedCancelledIds(dismissed);
  }

  openPolicyModal() {
    this.policyService.open(false);
  }

  async cancelAppointment(appointmentId: string | undefined) {
    if (!appointmentId) return;

    const confirmCancel = confirm('¿Estás seguro de que quieres cancelar esta cita?');
    if (!confirmCancel) return;

    try {
      await this.appointmentService.cancelAppointment(appointmentId);
      
      // Registrar evento en Google Analytics
      if (this.analytics) {
        logEvent(this.analytics, 'booking_cancelled', { appointmentId });
      }
      
      // La eliminamos de la lista al instante para que "desaparezca" de la pantalla
      this.pendingAppointments = this.pendingAppointments.filter(a => a.id !== appointmentId);
      
      alert('Cita cancelada con éxito. La hora vuelve a estar disponible.');
    } catch (error) {
      alert('Hubo un error al cancelar la cita. Inténtalo de nuevo.');
    }
  }

  // NUEVO MÉTODO: Calcula la hora de fin sumando 30 minutos
  getEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + 30);
    const endHours = date.getHours().toString().padStart(2, '0');
    const endMinutes = date.getMinutes().toString().padStart(2, '0');
    return `${endHours}:${endMinutes}`;
  }
}