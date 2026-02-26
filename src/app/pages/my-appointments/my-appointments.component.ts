import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from 'express';

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
  private authService = inject(AuthService);

  // Separamos las citas en dos listas distintas
  pendingAppointments: Appointment[] = [];
  completedAppointments: Appointment[] = [];
  isLoading: boolean = true;

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      const allAppointments = await this.appointmentService.getUserAppointments(user.uid);
      
      // 1. Ocultamos las canceladas
    const activeAppointments = allAppointments.filter(a => a.status !== 'cancelled');

    // 2. PRÓXIMAS CITAS: Metemos las pendientes Y las que Yeray ya ha confirmado
    this.pendingAppointments = activeAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed');

    // 3. HISTORIAL: Solo las que Yeray ha marcado como terminadas tras el corte
    this.completedAppointments = activeAppointments.filter(a => a.status === 'completed');
    }
    this.isLoading = false;
  }

  async cancelAppointment(appointmentId: string | undefined) {
    if (!appointmentId) return;

    const confirmCancel = confirm('¿Estás seguro de que quieres cancelar esta cita?');
    if (!confirmCancel) return;

    try {
      await this.appointmentService.cancelAppointment(appointmentId);
      
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