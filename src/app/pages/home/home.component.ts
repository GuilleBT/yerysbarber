import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatDatepickerModule, 
    MatNativeDateModule, 
    MatButtonModule
  ],
  providers: [DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private appointmentService = inject(AppointmentService);
  public authService = inject(AuthService);
  private datePipe = inject(DatePipe);

  selectedDate: Date | null = null;
  selectedSlot: string | null = null;
  occupiedSlots: string[] = []; // <-- NUEVA VARIABLE

  availableSlots = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  // NUEVO MÉTODO: Se dispara al tocar un día en el calendario
  async onDateSelected(date: Date | null) {
    this.selectedDate = date;
    this.selectedSlot = null; // Reseteamos la hora elegida al cambiar de día
    this.occupiedSlots = [];  // Vaciamos las horas ocupadas del día anterior

    if (date) {
      // Formateamos la fecha para que coincida exactamente con cómo la guardamos en la BD
      const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
      // Pedimos a Firebase las horas pilladas
      this.occupiedSlots = await this.appointmentService.getOccupiedSlots(formattedDate);
    }
  }

  selectSlot(slot: string) {
    // Pequeña validación extra de seguridad
    if (!this.occupiedSlots.includes(slot)) {
      this.selectedSlot = slot;
    }
  }

  async confirmAppointment() {
    if (!this.selectedDate || !this.selectedSlot) return;

    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      alert('Debes iniciar sesión para reservar una cita.');
      return;
    }

    // Formateamos la fecha a YYYY-MM-DD para guardarla limpia en la BD
    const formattedDate = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd') || '';

    const newAppointment: Appointment = {
      clientId: currentUser.uid,
      clientName: currentUser.displayName || 'Cliente',
      date: formattedDate,
      time: this.selectedSlot,
      status: 'pending',
      notes: '', // Dejamos esto preparado para el futuro sistema de notas
      createdAt: Date.now()
    };

    try {
      await this.appointmentService.createAppointment(newAppointment);
      alert('¡Cita confirmada con éxito!');
      // Reseteamos la vista
      this.selectedDate = null;
      this.selectedSlot = null;
    } catch (error) {
      alert('Hubo un error al guardar la cita. Inténtalo de nuevo.');
    }
  }
}