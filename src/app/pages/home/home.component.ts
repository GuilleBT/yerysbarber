import { Component, OnInit, inject } from '@angular/core'; // <-- AÑADE OnInit AQUÍ
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatDatepickerModule, 
    MatNativeDateModule, MatButtonModule
  ],
  providers: [DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit { // <-- IMPLEMENTAMOS OnInit
  private appointmentService = inject(AppointmentService);
  public authService = inject(AuthService);
  private datePipe = inject(DatePipe);
  private router = inject(Router);

  selectedDate: Date | null = null;
  selectedSlot: string | null = null;
  occupiedSlots: string[] = []; 
  
  // NUEVAS VARIABLES PARA LOS AJUSTES
  blockedDates: string[] = []; 
  availableSlots: string[] = []; // Ahora empieza vacío y se llena desde Firebase

  async ngOnInit() {
    // 1. Cargamos la configuración del jefe nada más abrir la página
    const settings = await this.appointmentService.getBarbershopSettings();
    if (settings) {
      // 2. Convertimos el texto "10:00, 10:30" en una lista real y quitamos espacios extra
      if (settings.availableSlots) {
        this.availableSlots = settings.availableSlots.split(',').map((s: string) => s.trim());
      }
      // 3. Guardamos los días de vacaciones
      this.blockedDates = settings.blockedDates || [];
    }
  }

  // NUEVO MÉTODO: Filtro mágico para bloquear los días en el calendario visual
  myDateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const dateString = this.datePipe.transform(d, 'yyyy-MM-dd');
    // Si el día ESTÁ en la lista de vacaciones, devuelve false (lo bloquea en gris)
    return !this.blockedDates.includes(dateString || '');
  };
  
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
    // 1. Validación de seguridad: Asegurarnos de que eligió día y hora
    if (!this.selectedDate || !this.selectedSlot) {
      alert('Por favor, selecciona un día y una hora primero.');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    // --- PUNTO DE CONTROL: VERIFICAR TELÉFONO ---
    const profile = await this.authService.getUserProfile(user.uid);
    if (!profile || !profile['phone']) {
      alert('¡Espera! Yeray necesita tu número de teléfono por si ocurre algún imprevisto. Por favor, añádelo antes de pedir cita.');
      this.router.navigate(['/perfil']); 
      return; 
    }
    // --------------------------------------------------

    const formattedDate = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd') || '';

    const newAppointment: Appointment = {
      clientId: user.uid, // <-- CORREGIDO: Usamos "user", no "currentUser"
      clientName: user.displayName || 'Cliente', // <-- CORREGIDO
      date: formattedDate,
      time: this.selectedSlot, // Ahora TypeScript sabe que esto no es null
      status: 'pending',
      notes: '', 
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