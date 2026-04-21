import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { BaseChartDirective } from 'ng2-charts';
import { environment } from '../../../environments/environment';
// IMPORTACIONES VITALES PARA LEER FIREBASE DIRECTAMENTE AQUÍ
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule, 
    MatDividerModule, MatDatepickerModule, MatNativeDateModule, BaseChartDirective
  ],
  providers: [DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  private firestore = inject(Firestore); // <--- INYECCIÓN DE FIRESTORE AÑADIDA

  totalCuts: number = 0;
  selectedDate: Date = new Date();
  dailyAppointments: Appointment[] = [];
  pendingRequests: Appointment[] = []; 

  mostrarGrafica = false;
  datosGrafica: any = null;
  opcionesGrafica: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
      y: { 
        beginAtZero: true, 
        ticks: { 
          stepSize: 25 // Obliga a la gráfica a saltar de 25 en 25
        } 
      },
      x: {
        ticks: {
          autoSkip: false, // Prohíbe que la gráfica oculte meses por falta de espacio
          maxRotation: 45, // Inclina los textos un poco si la pantalla es estrecha
          minRotation: 45
        }
      }
    }
  };

  async ngOnInit() {
    this.totalCuts = await this.appointmentService.getTotalCompletedCuts();
    this.pendingRequests = await this.appointmentService.getAllPendingAppointments(); 
    this.cargarEstadisticas();
    
    await this.loadPhoneNumbers(this.pendingRequests);
    await this.onDateSelected(this.selectedDate);
  }

  async onDateSelected(date: Date | null) {
    if (!date) return;
    this.selectedDate = date;
    const dateString = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
    const agenda = await this.appointmentService.getDailyAgenda(dateString);
    
    this.dailyAppointments = agenda.filter(a => a.status === 'confirmed' || a.status === 'completed');
    await this.loadPhoneNumbers(this.dailyAppointments);
  }

  async loadPhoneNumbers(appointments: Appointment[]) {
    for (let appt of appointments) {
      try {
        const profile = await this.authService.getUserProfile(appt.clientId);
        if (profile && profile['phone']) {
          appt.clientPhone = profile['phone'];
        } else {
          appt.clientPhone = 'Sin teléfono';
        }
      } catch (error) {
        appt.clientPhone = 'Sin teléfono';
      }
    }
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
      
      const pendingIndex = this.pendingRequests.findIndex(a => a.id === id);
      let processedAppt: Appointment | null = null;
      
      if (pendingIndex !== -1) {
        processedAppt = this.pendingRequests[pendingIndex];
        this.pendingRequests.splice(pendingIndex, 1);
      }

      const dailyIndex = this.dailyAppointments.findIndex(a => a.id === id);
      if (dailyIndex !== -1) {
        if (newStatus === 'cancelled') {
          this.dailyAppointments.splice(dailyIndex, 1);
        } else {
          this.dailyAppointments[dailyIndex].status = newStatus;
        }
      } else if (newStatus === 'confirmed' && processedAppt) {
        const selectedDateString = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd');
        if (processedAppt.date === selectedDateString) {
          processedAppt.status = 'confirmed';
          this.dailyAppointments.push(processedAppt);
          this.dailyAppointments.sort((a, b) => a.time.localeCompare(b.time)); 
        }
      }

      if (newStatus === 'completed') {
        this.totalCuts++; 
        this.cargarEstadisticas(); // Recarga la gráfica automáticamente si termina un corte
      }
      
    } catch (error) {
      alert('Error al actualizar la cita.');
    }
  }

  async cargarEstadisticas() {
    const citasRef = collection(this.firestore, 'appointments');
    const q = query(citasRef, where('status', '==', 'completed'));
    const querySnapshot = await getDocs(q);
    
    // Tipado estricto (doc: any) para que el compilador no salte
    const citasCompletadas = querySnapshot.docs.map((doc: any) => doc.data() as Appointment);

    this.datosGrafica = this.appointmentService.obtenerEstadisticasMensuales(citasCompletadas);
  }

  toggleGrafica() {
    this.mostrarGrafica = !this.mostrarGrafica;
  }
}