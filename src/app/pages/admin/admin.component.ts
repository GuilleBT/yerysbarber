import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule, 
    MatDividerModule, MatDatepickerModule, MatNativeDateModule
  ],
  providers: [DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);

  totalCuts: number = 0;
  selectedDate: Date = new Date();
  dailyAppointments: Appointment[] = [];
  pendingRequests: Appointment[] = []; // <-- NUEVA BANDEJA DE ENTRADA

  async ngOnInit() {
    this.totalCuts = await this.appointmentService.getTotalCompletedCuts();
    this.pendingRequests = await this.appointmentService.getAllPendingAppointments(); // Cargamos todas
    await this.onDateSelected(this.selectedDate);
  }

  async onDateSelected(date: Date | null) {
    if (!date) return;
    this.selectedDate = date;
    const dateString = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
    const agenda = await this.appointmentService.getDailyAgenda(dateString);
    
    // En la agenda diaria solo mostramos las confirmadas o completadas, ya que las pendientes están arriba
    this.dailyAppointments = agenda.filter(a => a.status === 'confirmed' || a.status === 'completed');
  }

  async changeStatus(id: string | undefined, newStatus: 'confirmed' | 'cancelled' | 'completed') {
    if (!id) return;
    
    const messages = {
      'confirmed': '¿Aceptar esta cita?',
      'cancelled': '¿Rechazar y anular esta cita?',
      'completed': '¿Marcar este corte como terminado?'
    };

    if (!confirm(messages[newStatus])) return;

    try {
      await this.appointmentService.updateAppointmentStatus(id, newStatus);
      
      // 1. Lo quitamos de la bandeja de entrada si estaba ahí
      const pendingIndex = this.pendingRequests.findIndex(a => a.id === id);
      let processedAppt: Appointment | null = null;
      
      if (pendingIndex !== -1) {
        processedAppt = this.pendingRequests[pendingIndex];
        this.pendingRequests.splice(pendingIndex, 1);
      }

      // 2. Actualizamos la agenda diaria
      const dailyIndex = this.dailyAppointments.findIndex(a => a.id === id);
      if (dailyIndex !== -1) {
        if (newStatus === 'cancelled') {
          this.dailyAppointments.splice(dailyIndex, 1);
        } else {
          this.dailyAppointments[dailyIndex].status = newStatus;
        }
      } else if (newStatus === 'confirmed' && processedAppt) {
        // Si la acaba de aceptar desde la bandeja, comprobamos si pertenece al día seleccionado para pintarla
        const selectedDateString = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd');
        if (processedAppt.date === selectedDateString) {
          processedAppt.status = 'confirmed';
          this.dailyAppointments.push(processedAppt);
          this.dailyAppointments.sort((a, b) => a.time.localeCompare(b.time)); // Reordenar por hora
        }
      }

      if (newStatus === 'completed') this.totalCuts++; 
      
    } catch (error) {
      alert('Error al actualizar la cita.');
    }
  }
}