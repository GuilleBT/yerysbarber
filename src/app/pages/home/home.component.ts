import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; 
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
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
  maxDate: Date = new Date(); 

  selectedDate: Date | null = null;
  selectedSlot: string | null = null;
  
  occupiedSlots: string[] = []; 
  availableSlots: string[] = []; 
  
  blockedDates: string[] = []; 
  weeklySchedule: any = {}; 
  blockedSlotsAdmin: any = {}; 

  isCalendarReady: boolean = false;

  async ngOnInit() {
    const hoy = new Date();
    this.minDate = hoy; 

    const diaSemana = hoy.getDay();
    const diasParaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;

    const limiteDate = new Date();
    limiteDate.setDate(hoy.getDate() + diasParaDomingo + 7);
    this.maxDate = limiteDate;

    this.authService.user$.subscribe(user => {
      if (user && user.email === this.authService.ADMIN_EMAIL) {
        this.router.navigate(['/admin']); 
      }
    });

    const settings = await this.appointmentService.getBarbershopSettings();
    if (settings) {
      this.blockedDates = settings.blockedDates || [];
      this.weeklySchedule = settings.weeklySchedule || {};
      this.blockedSlotsAdmin = settings.blockedSlots || {};
    }

    this.isCalendarReady = true;
    this.mostrarAvisoPrecio();
  }

  mostrarAvisoPrecio() {
    const avisoVisto = localStorage.getItem('avisoPrecio7Euros');
    
    if (!avisoVisto) {
      Swal.fire({
        title: 'Actualización de Tarifas',
        html: `
          <div style="text-align: center; margin-top: 10px;">
            <p style="color: #666; font-size: 16px;">Para poder seguir ofreciéndote el mejor servicio, a partir del <strong>1 de junio</strong> el precio del corte pasará a ser de <strong>7€</strong>.</p>
            <hr style="border: 1px solid rgba(212, 175, 55, 0.2); margin: 15px 0;">
            <p style="font-size: 14px; margin: 5px 0;">¡Gracias por seguir confiando en Yeray! 💈</p>
          </div>
        `,
        icon: 'info',
        iconColor: '#D4AF37',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1a1a1a',
        background: '#ffffff',
        backdrop: `rgba(0,0,0,0.6)`,
        customClass: {
          title: 'swal-title-gold'
        }
      }).then(() => {
        localStorage.setItem('avisoPrecio7Euros', 'true');
      });
    }
  }

  myDateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const dateString = this.datePipe.transform(d, 'yyyy-MM-dd') || '';
    
    if (this.blockedDates.includes(dateString)) return false;

    const dayOfWeek = d.getDay();
    const dailySlots = this.weeklySchedule[dayOfWeek];
    if (!dailySlots || dailySlots.trim() === '') return false;

    return true;
  };

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
    
    if (activeAppointments.length >= 6) {
      alert('Solo puedes tener un máximo de 6 citas activas a la vez.');
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
      
      Swal.fire({
        title: 'Reserva Registrada',
        html: `
          <div style="text-align: center; margin-top: 10px;">
            <p style="color: #666; font-size: 16px; margin-bottom: 5px;">Tu solicitud para el <strong>${this.datePipe.transform(this.selectedDate, 'dd/MM/yyyy')}</strong> a las <strong>${this.selectedSlot}</strong> ha sido enviada.</p>
            <hr style="border: 1px solid rgba(212, 175, 55, 0.2); margin: 15px 0;">
            <p style="font-size: 14px; margin: 5px 0;">Yeray revisará y confirmará tu cita en breve.</p>
          </div>
        `,
        icon: 'success',
        iconColor: '#D4AF37',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#1a1a1a',
        background: '#ffffff',
        backdrop: `rgba(0,0,0,0.6)`,
        customClass: {
          title: 'swal-title-gold'
        }
      });

      this.selectedDate = null;
      this.selectedSlot = null;
      this.occupiedSlots = [];
      this.availableSlots = [];
    } catch (error) {
      Swal.fire({
        title: 'Error de conexión',
        text: 'Hubo un problema al procesar tu reserva. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonColor: '#1a1a1a'
      });
    }
  }
}