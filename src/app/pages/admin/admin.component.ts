import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatDividerModule],
  providers: [DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);

  totalCuts: number = 0;
  todaysAppointments: Appointment[] = [];
  todayString: string = '';

  async ngOnInit() {
    // 1. Obtenemos la fecha de hoy en formato 'yyyy-MM-dd'
    const today = new Date();
    this.todayString = this.datePipe.transform(today, 'yyyy-MM-dd') || '';

    // 2. Cargamos los datos simultáneamente
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.totalCuts = await this.appointmentService.getTotalCompletedCuts();
    const agenda = await this.appointmentService.getDailyAgenda(this.todayString);
    
    // Filtramos para que no salgan las canceladas en la vista principal
    this.todaysAppointments = agenda.filter(a => a.status !== 'cancelled');
  }

  async completeAppointment(id: string | undefined) {
    if (!id) return;
    
    const confirmAction = confirm('¿Marcar este corte como completado?');
    if (!confirmAction) return;

    try {
      await this.appointmentService.markAsCompleted(id);
      
      // Actualizamos la vista localmente sin recargar la página
      const apptIndex = this.todaysAppointments.findIndex(a => a.id === id);
      if (apptIndex !== -1) {
        this.todaysAppointments[apptIndex].status = 'completed';
      }
      // ¡Subimos el contador en tiempo real!
      this.totalCuts++; 
      
    } catch (error) {
      alert('Error al actualizar la cita.');
    }
  }
}