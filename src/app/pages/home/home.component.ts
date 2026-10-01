import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; 
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { PolicyService } from '../../shared/services/policy.service';
import { Router } from '@angular/router';
import { Analytics, logEvent } from '@angular/fire/analytics';
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
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  public policyService = inject(PolicyService);
  private router = inject(Router);
  private analytics = inject(Analytics, { optional: true });

  minDate: Date = new Date(); 
  maxDate: Date = new Date(); 

  selectedDate: Date | null = null;
  selectedSlot: string | null = null;
  
  occupiedSlots: string[] = []; 
  availableSlots: string[] = []; 
  
  blockedDates: string[] = []; 
  weeklySchedule: any = {}; 
  blockedSlotsAdmin: any = {}; 
  customDays: any = {}; // NUEVO: Horarios específicos por fecha

  isCalendarReady: boolean = false;
  isSaving: boolean = false;

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
      this.customDays = settings.customDays || {}; // Cargamos los horarios específicos
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

    // Si hay un horario específico para este día, comprobamos si tiene horas abiertas
    if (this.customDays && this.customDays[dateString] !== undefined) {
      const customSlots = this.customDays[dateString];
      return customSlots && customSlots.trim() !== '';
    }

    const dayOfWeek = d.getDay();
    const dailySlots = this.weeklySchedule[dayOfWeek];
    if (!dailySlots || dailySlots.trim() === '') return false;

    return true;
  };

  async onDateSelected(date: Date | null) {
    if (this.isSaving) return; 

    this.selectedDate = date;
    this.selectedSlot = null;
    this.occupiedSlots = [];
    this.availableSlots = [];

    if (date) {
      const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
      
      let slotsStr = '';
      // Si hay un horario específico de fecha, lo usamos; si no, el semanal
      if (this.customDays && this.customDays[formattedDate] !== undefined) {
        slotsStr = this.customDays[formattedDate] || '';
      } else {
        const dayOfWeek = date.getDay(); 
        slotsStr = this.weeklySchedule[dayOfWeek] || '';
      }
      
      this.availableSlots = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);

      const firebaseOccupied = await this.appointmentService.getOccupiedSlots(formattedDate);
      const adminBlocked = this.blockedSlotsAdmin[formattedDate] || [];

      this.occupiedSlots = [...firebaseOccupied, ...adminBlocked];
    }
  }

  isSlotDisabled(slot: string): boolean {
    if (this.isSaving) return true; 
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
    if (this.isSaving) return;

    if (!this.isSlotDisabled(slot)) {
      this.selectedSlot = slot;
      setTimeout(() => {
        const confirmDiv = document.getElementById('confirm-zone');
        if (confirmDiv) confirmDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  openPolicyModal() {
    this.policyService.open(false);
  }

  async confirmAppointment() { 
    if (!this.selectedDate || !this.selectedSlot || this.selectedSlot.trim() === '') {
      Swal.fire({
        title: 'Error de selección',
        text: 'La hora seleccionada no es válida. Por favor, recarga la página y vuelve a elegir la hora.',
        icon: 'warning',
        confirmButtonColor: '#1a1a1a'
      });
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    const profile = await this.authService.getUserProfile(user.uid);
    if (!profile || !profile['phone']) {
      Swal.fire({
        title: 'Teléfono obligatorio',
        text: '¡Espera! Yeray necesita tu número de teléfono por si ocurre algún imprevisto.',
        icon: 'info',
        confirmButtonColor: '#1a1a1a'
      }).then(() => {
        this.router.navigate(['/perfil']); 
      });
      return; 
    }

    // Comprobamos si el cliente ya ha aceptado las normas de servicio
    if (!this.policyService.hasAccepted()) {
      this.policyService.open(true, () => {
        // En cuanto las acepta, se reanuda la confirmación automáticamente
        this.confirmAppointment();
      });
      return;
    }

    this.isSaving = true;

    const userHistory = await this.appointmentService.getUserAppointments(user.uid);
    const activeAppointments = userHistory.filter(appt => appt.status === 'pending' || appt.status === 'confirmed');
    
    if (activeAppointments.length >= 6) {
      this.isSaving = false;
      Swal.fire({
        title: 'Límite alcanzado',
        text: 'Solo puedes tener un máximo de 6 citas activas a la vez.',
        icon: 'warning',
        confirmButtonColor: '#1a1a1a'
      });
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
      
      // Registrar evento en Google Analytics
      if (this.analytics) {
        logEvent(this.analytics, 'booking_completed', {
          date: formattedDate,
          time: this.selectedSlot
        });
      }
      
      this.isSaving = false;

      Swal.fire({
        title: 'Reserva Registrada',
        html: `
          <div style="text-align: center; margin-top: 10px;">
            <p style="color: #444; font-size: 15px; margin-bottom: 8px;">
              Tu solicitud para el <strong>${this.datePipe.transform(this.selectedDate, 'dd/MM/yyyy')}</strong> a las <strong>${this.selectedSlot}</strong> ha sido enviada.
            </p>
            <div style="background: #fff8e1; border: 1.5px solid #ffe082; border-radius: 14px; padding: 14px 16px; margin: 12px 0 6px; text-align: left;">
              <p style="color: #b78103; font-weight: 700; font-size: 13.5px; margin: 0 0 5px;">
                ⏳ ESTADO: PENDIENTE DE REVISIÓN
              </p>
              <p style="color: #555; font-size: 12.5px; margin: 0 0 8px; line-height: 1.45;">
                <strong>NO acudas al local todavía</strong>. Revisa en tu pestaña <strong>"Mis Citas"</strong> hasta que cambie a <strong>Aceptada</strong>.
              </p>
              <p style="color: #c53929; font-size: 12px; font-weight: 600; margin: 0;">
                ⏱️ Recuerda: tolerancia máxima de 10 min de cortesía.
              </p>
            </div>
          </div>
        `,
        icon: 'success',
        iconColor: '#D4AF37',
        confirmButtonText: 'Entendido',
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
      
    } catch (error: any) {
      this.isSaving = false;
      
      if (error.message === 'SLOT_ALREADY_TAKEN') {
        Swal.fire({
          title: '¡Hueco recién ocupado!',
          text: 'Otro cliente acaba de reservar esta misma hora hace unos segundos. Por favor, elige otro hueco.',
          icon: 'warning',
          confirmButtonColor: '#1a1a1a',
          customClass: { title: 'swal-title-gold' }
        });
        
        if (this.selectedDate) {
          this.onDateSelected(this.selectedDate);
        }
      } else {
        Swal.fire({
          title: 'Error de conexión',
          text: 'Hubo un problema al procesar tu reserva. Inténtalo de nuevo.',
          icon: 'error',
          confirmButtonColor: '#1a1a1a'
        });
      }
    }
  }
}