import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion'; // <-- NUEVO: Para los acordeones
import { AuthService } from '../../shared/services/auth.service';
import { AppointmentService } from '../../shared/services/appointment.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, 
    MatInputModule, MatButtonModule, MatIconModule, MatDatepickerModule, 
    MatNativeDateModule, MatExpansionModule // <-- AÑADIDO AQUÍ
  ],
  providers: [DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);

  isAdmin: boolean = false;
  uid: string = '';
  isSaving: boolean = false;

  // Variables Cliente
  phone: string = '';

  // Variables Admin
  blockedDates: string[] = [];
  dateToBlock: Date | null = null;
  
  // NUEVO: Horario por días (0=Domingo, 1=Lunes...)
  weeklySchedule: any = { 0:'', 1:'', 2:'', 3:'', 4:'', 5:'', 6:'' };
  
  // NUEVO: Bloqueos de horas sueltas
  blockedSlots: any = {}; 
  selectedExceptionDate: Date | null = null;
  exceptionSlotsForSelectedDate: string[] = [];

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.uid = user.uid;
      // Usamos el correo centralizado del servicio
      this.isAdmin = (user.email === this.authService.ADMIN_EMAIL);

      if (this.isAdmin) {
        const settings = await this.appointmentService.getBarbershopSettings();
        if (settings) {
          this.blockedDates = settings.blockedDates || [];
          // Cargamos la nueva estructura hiper-vitaminada
          this.weeklySchedule = settings.weeklySchedule || this.weeklySchedule;
          this.blockedSlots = settings.blockedSlots || {};
        }
      } else {
        const profile = await this.authService.getUserProfile(this.uid);
        if (profile) this.phone = profile['phone'] || '';
      }
    }
  }

  // GUARDA EL TELÉFONO DEL CLIENTE NORMAL
  async saveClientProfile() {
    if (!this.phone) return alert('Añade un número.');
    this.isSaving = true;
    try {
      await this.authService.updateUserProfile(this.uid, { phone: this.phone });
      alert('¡Perfil actualizado!');
    } catch (e) { alert('Error al guardar.'); }
    this.isSaving = false;
  }

  // GUARDA LOS AJUSTES DEL JEFE
  async saveAdminSettings() {
    this.isSaving = true;
    try {
      await this.appointmentService.saveBarbershopSettings({
        blockedDates: this.blockedDates,
        weeklySchedule: this.weeklySchedule, // Guardamos el horario semanal
        blockedSlots: this.blockedSlots      // Guardamos las excepciones
      });
      alert('¡Configuración de la barbería actualizada con éxito!');
    } catch (e) { alert('Error al guardar ajustes.'); }
    this.isSaving = false;
  }

  // --- LÓGICA DE DÍAS CERRADOS (Vacaciones) ---
  addBlockedDate() {
    if (this.dateToBlock) {
      const dateStr = this.datePipe.transform(this.dateToBlock, 'yyyy-MM-dd');
      if (dateStr && !this.blockedDates.includes(dateStr)) {
        this.blockedDates.push(dateStr);
        this.blockedDates.sort();
      }
      this.dateToBlock = null; 
    }
  }

  removeBlockedDate(dateStr: string) {
    this.blockedDates = this.blockedDates.filter(d => d !== dateStr);
  }

  // --- NUEVA LÓGICA: MICRO-BLOQUEOS POR HORAS ---
  onExceptionDateSelected(date: Date | null) {
    this.selectedExceptionDate = date;
    if (!date) {
      this.exceptionSlotsForSelectedDate = [];
      return;
    }
    const dayOfWeek = date.getDay(); // Saca el día de la semana (0-6)
    const slotsStr = this.weeklySchedule[dayOfWeek] || ''; // Carga las horas de ese día
    
    // Convertimos el texto en un array de horas para pintar los botones
    this.exceptionSlotsForSelectedDate = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
  }

  toggleBlockedSlot(slot: string) {
    if (!this.selectedExceptionDate) return;
    const dateStr = this.datePipe.transform(this.selectedExceptionDate, 'yyyy-MM-dd');
    if (!dateStr) return;

    if (!this.blockedSlots[dateStr]) {
      this.blockedSlots[dateStr] = [];
    }

    const index = this.blockedSlots[dateStr].indexOf(slot);
    if (index > -1) {
      // Si la hora ya estaba bloqueada, la liberamos
      this.blockedSlots[dateStr].splice(index, 1);
      if (this.blockedSlots[dateStr].length === 0) delete this.blockedSlots[dateStr];
    } else {
      // Si estaba libre, la bloqueamos
      this.blockedSlots[dateStr].push(slot);
    }
  }

  isSlotBlocked(slot: string): boolean {
    if (!this.selectedExceptionDate) return false;
    const dateStr = this.datePipe.transform(this.selectedExceptionDate, 'yyyy-MM-dd');
    if (!dateStr || !this.blockedSlots[dateStr]) return false;
    return this.blockedSlots[dateStr].includes(slot);
  }
}