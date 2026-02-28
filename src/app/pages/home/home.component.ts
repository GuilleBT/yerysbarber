import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // <-- 1. NUEVO: Importamos los iconos
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  // 2. NUEVO: Añadimos MatIconModule al final de esta lista
  imports: [CommonModule, MatCardModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule],
  providers: [DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  public authService = inject(AuthService);
  private datePipe = inject(DatePipe);
  private router = inject(Router);

 
  minDate: Date = new Date();
  selectedDate: Date | null = null;
  selectedSlot: string | null = null;
  
  occupiedSlots: string[] = []; 
  availableSlots: string[] = []; 
  
  // Variables del "Cerebro" de Yeray
  blockedDates: string[] = []; 
  weeklySchedule: any = {}; 
  blockedSlotsAdmin: any = {}; 

  isCalendarReady: boolean = false;

  // UN SOLO ngOnInit QUE HACE LAS DOS COSAS
 async ngOnInit() {
    // 1. El Trampolín: Vigilamos en tiempo real quién entra
    this.authService.user$.subscribe(user => {
      // Usamos el correo centralizado del servicio
      if (user && user.email === this.authService.ADMIN_EMAIL) {
        this.router.navigate(['/admin']); 
      }
    });

    // 2. Cargamos los ajustes del calendario
    const settings = await this.appointmentService.getBarbershopSettings();
    if (settings) {
      this.blockedDates = settings.blockedDates || [];
      this.weeklySchedule = settings.weeklySchedule || {};
      this.blockedSlotsAdmin = settings.blockedSlots || {};
    }

    this.isCalendarReady = true;
  }

  // EL FILTRO MÁGICO DEL CALENDARIO
  myDateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const dateString = this.datePipe.transform(d, 'yyyy-MM-dd') || '';
    
    if (this.blockedDates.includes(dateString)) return false;

    const dayOfWeek = d.getDay();
    const dailySlots = this.weeklySchedule[dayOfWeek];
    if (!dailySlots || dailySlots.trim() === '') return false;

    return true;
  };

  // CUANDO EL CLIENTE TOCA UN DÍA
  async onDateSelected(date: Date | null) {
    this.selectedDate = date;
    this.selectedSlot = null;
    this.occupiedSlots = [];
    this.availableSlots = [];

    if (date) {
      const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
      
      const dayOfWeek = date.getDay(); 
      const slotsStr = this.weeklySchedule[dayOfWeek] || '';
      this.availableSlots = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);

      const firebaseOccupied = await this.appointmentService.getOccupiedSlots(formattedDate);
      const adminBlocked = this.blockedSlotsAdmin[formattedDate] || [];

      this.occupiedSlots = [...firebaseOccupied, ...adminBlocked];
    }
  }

  // EL PORTERO DE DISCOTECA
  isSlotDisabled(slot: string): boolean {
    if (this.occupiedSlots.includes(slot)) return true;

    if (this.selectedDate) {
      const today = new Date();
      const isToday = 
        this.selectedDate.getDate() === today.getDate() &&
        this.selectedDate.getMonth() === today.getMonth() &&
        this.selectedDate.getFullYear() === today.getFullYear();

      if (isToday) {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();

        if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
          return true;
        }
      }
    }
    return false;
  }

  selectSlot(slot: string) {
    if (!this.isSlotDisabled(slot)) {
      this.selectedSlot = slot;
      setTimeout(() => {
        const confirmDiv = document.getElementById('confirm-zone');
        if (confirmDiv) confirmDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  async confirmAppointment() { 
    if (!this.selectedDate || !this.selectedSlot) {
      alert('Por favor, selecciona un día y una hora primero.');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    const profile = await this.authService.getUserProfile(user.uid);
    if (!profile || !profile['phone']) {
      alert('¡Espera! Yeray necesita tu número de teléfono por si ocurre algún imprevisto. Por favor, añádelo antes de pedir cita.');
      this.router.navigate(['/perfil']); 
      return; 
    }

    const userHistory = await this.appointmentService.getUserAppointments(user.uid);
    const activeAppointments = userHistory.filter(appt => appt.status === 'pending' || appt.status === 'confirmed');
    
    if (activeAppointments.length >= 3) {
      alert('Solo puedes tener un máximo de 3 citas activas a la vez.');
      return; 
    }

    const formattedDate = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd') || '';

    const newAppointment: Appointment = {
      clientId: user.uid, 
      clientName: user.displayName || 'Cliente', 
      date: formattedDate,
      time: this.selectedSlot, 
      status: 'pending',
      notes: '', 
      createdAt: Date.now()
    };

    try {
      await this.appointmentService.createAppointment(newAppointment);
      alert('¡Cita confirmada con éxito!');
      this.selectedDate = null;
      this.selectedSlot = null;
    } catch (error) {
      alert('Hubo un error al guardar la cita. Inténtalo de nuevo.');
    }
  }
}