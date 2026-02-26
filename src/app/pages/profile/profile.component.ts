import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Añadido DatePipe
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker'; // Para el calendario admin
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../../shared/services/auth.service';
import { AppointmentService } from '../../shared/services/appointment.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, 
    MatInputModule, MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule
  ],
  providers: [DatePipe], // Proveedor añadido
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);

  // PON AQUÍ EL CORREO DE YERAY
  private ADMIN_EMAIL = 'aguillermobeltrantabares@gmail.com'; 

  isAdmin: boolean = false;
  uid: string = '';
  isSaving: boolean = false;

  // Variables Cliente
  phone: string = '';

  // Variables Admin
  blockedDates: string[] = [];
  slotsString: string = '';
  dateToBlock: Date | null = null;

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.uid = user.uid;
      this.isAdmin = (user.email === this.ADMIN_EMAIL);

      if (this.isAdmin) {
        // Cargar ajustes del jefe
        const settings = await this.appointmentService.getBarbershopSettings();
        if (settings) {
          this.blockedDates = settings.blockedDates || [];
          this.slotsString = settings.availableSlots || '';
        }
      } else {
        // Cargar perfil del cliente
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
        availableSlots: this.slotsString
      });
      alert('¡Configuración de la barbería actualizada!');
    } catch (e) { alert('Error al guardar ajustes.'); }
    this.isSaving = false;
  }

  // FUNCIONES EXTRA DEL ADMIN PARA EL CALENDARIO
  addBlockedDate() {
    if (this.dateToBlock) {
      const dateStr = this.datePipe.transform(this.dateToBlock, 'yyyy-MM-dd');
      if (dateStr && !this.blockedDates.includes(dateStr)) {
        this.blockedDates.push(dateStr);
        this.blockedDates.sort(); // Las ordenamos
      }
      this.dateToBlock = null; // Limpiamos el selector
    }
  }

  removeBlockedDate(dateStr: string) {
    this.blockedDates = this.blockedDates.filter(d => d !== dateStr);
  }
}