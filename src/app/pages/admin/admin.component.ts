import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { AppointmentService, Appointment } from '../../shared/services/appointment.service';
import { AuthService } from '../../shared/services/auth.service';
import { ReviewService, Review } from '../../shared/services/review.service';
import { BaseChartDirective } from 'ng2-charts';
import { environment } from '../../../environments/environment';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule, 
    MatDividerModule, MatDatepickerModule, MatNativeDateModule, BaseChartDirective,
    MatFormFieldModule, MatInputModule, MatExpansionModule
  ],
  providers: [DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private datePipe = inject(DatePipe);
  private authService = inject(AuthService);
  private reviewService = inject(ReviewService);
  private firestore = inject(Firestore);

  // Stats KPIs
  totalCuts: number = 0;
  totalClients: number = 0;
  cancellationRate: number = 0;
  busiestDay: string = 'N/A';
  busiestHour: string = 'N/A';
  vipClients: { name: string, count: number }[] = [];

  // Calendar & Appointments
  selectedDate: Date = new Date();
  dailyAppointments: Appointment[] = [];
  pendingRequests: Appointment[] = []; 
  isProcessingBatch: boolean = false; 

  // Reviews
  reviews: Review[] = [];
  averageRating: number = 5.0;
  totalReviews: number = 0;

  // Segmented Tabs
  activeTab: 'calendar' | 'stats' | 'settings' = 'calendar';

  // Ajustes de la Barbería
  blockedDates: string[] = [];
  dateToBlock: Date | null = null;
  weeklySchedule: any = { 0:'', 1:'', 2:'', 3:'', 4:'', 5:'', 6:'' };
  customDays: any = {};
  selectedExceptionDate: Date | null = null;
  exceptionSlotsForSelectedDate: string[] = [];
  isSaving: boolean = false;

  allPossibleSlots: string[] = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30'
  ];

  mostrarGrafica = true; // Mostradas por defecto en su sección
  datosGraficaMensual: any = null;
  datosGraficaSemanal: any = null;
  opcionesGrafica: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
      y: { 
        beginAtZero: true, 
        ticks: { 
          stepSize: 5
        } 
      },
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  async ngOnInit() {
    this.pendingRequests = await this.appointmentService.getAllPendingAppointments(); 
    await this.cargarEstadisticas();
    await this.loadReviews();
    
    // Cargar Ajustes
    const settings = await this.appointmentService.getBarbershopSettings();
    if (settings) {
      this.blockedDates = settings.blockedDates || [];
      this.weeklySchedule = settings.weeklySchedule || this.weeklySchedule;
      this.customDays = settings.customDays || {};
    }

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
    
    const swalConfigs = {
      'confirmed': {
        title: '¿Aceptar esta cita?',
        text: 'Se confirmará la reserva para el cliente.',
        icon: 'question' as const,
        confirmButtonText: 'Sí, aceptar',
        confirmButtonColor: '#2e7d32'
      },
      'cancelled': {
        title: '¿Rechazar y anular esta cita?',
        text: 'Esta acción cancelará la cita de forma permanente.',
        icon: 'warning' as const,
        confirmButtonText: 'Sí, rechazar',
        confirmButtonColor: '#c62828'
      },
      'completed': {
        title: '¿Marcar este corte como terminado?',
        text: 'Se registrará como un servicio completado.',
        icon: 'question' as const,
        confirmButtonText: 'Sí, terminar',
        confirmButtonColor: '#c5a059'
      }
    };

    const config = swalConfigs[newStatus];
    const result = await Swal.fire({
      title: config.title,
      text: config.text,
      icon: config.icon,
      showCancelButton: true,
      confirmButtonColor: config.confirmButtonColor,
      cancelButtonColor: '#1c1b18',
      confirmButtonText: config.confirmButtonText,
      cancelButtonText: 'Cancelar',
      background: '#ffffff'
    });

    if (!result.isConfirmed) return;

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
        await this.cargarEstadisticas(); // Recarga la gráfica automáticamente si termina un corte
      }

      Swal.fire({
        title: newStatus === 'confirmed' ? 'Cita Aceptada' : (newStatus === 'cancelled' ? 'Cita Cancelada' : 'Corte Terminado'),
        text: newStatus === 'confirmed' ? 'La cita ha sido aceptada correctamente.' : (newStatus === 'cancelled' ? 'La cita ha sido cancelada.' : 'El servicio se ha marcado como completado.'),
        icon: 'success',
        confirmButtonColor: '#c5a059',
        timer: 2000
      });
      
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al actualizar el estado de la cita.',
        icon: 'error',
        confirmButtonColor: '#c5a059'
      });
    }
  }

  async confirmAllPending() {
    if (this.isProcessingBatch || this.pendingRequests.length === 0) return;

    const total = this.pendingRequests.length;
    const result = await Swal.fire({
      title: '¿Aceptar todas las citas?',
      html: `
        <div style="text-align: center; margin-top: 8px;">
          <p style="font-size: 15px; color: #444; margin-bottom: 8px;">
            Vas a confirmar <strong>${total} ${total === 1 ? 'cita pendiente' : 'citas pendientes'}</strong> de golpe.
          </p>
          <p style="font-size: 13px; color: #777; margin: 0;">
            Los clientes recibirán la confirmación de inmediato en su app.
          </p>
        </div>
      `,
      icon: 'question',
      iconColor: '#2e7d32',
      showCancelButton: true,
      confirmButtonColor: '#2e7d32',
      cancelButtonColor: '#1c1b18',
      confirmButtonText: `Sí, aceptar todas (${total})`,
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    this.isProcessingBatch = true;

    try {
      const validIds = this.pendingRequests
        .map(a => a.id)
        .filter((id): id is string => !!id);

      await this.appointmentService.confirmMultipleAppointments(validIds);

      // Si alguna cita pertenecía al día que Yeray tiene seleccionado en el calendario, la sumamos a la vista
      const selectedDateString = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd');
      for (const appt of this.pendingRequests) {
        if (appt.date === selectedDateString) {
          appt.status = 'confirmed';
          this.dailyAppointments.push({ ...appt });
        }
      }
      this.dailyAppointments.sort((a, b) => a.time.localeCompare(b.time));

      // Limpiamos las solicitudes pendientes
      this.pendingRequests = [];

      Swal.fire({
        title: '¡Citas Confirmadas!',
        text: `Se han aceptado ${total} ${total === 1 ? 'cita' : 'citas'} con éxito.`,
        icon: 'success',
        confirmButtonColor: '#2e7d32',
        timer: 2200
      });
    } catch (error) {
      console.error('Error al confirmar citas en lote:', error);
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al aceptar las citas en lote. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonColor: '#c5a059'
      });
    } finally {
      this.isProcessingBatch = false;
    }
  }

  get pendingToCompleteDailyCount(): number {
    return this.dailyAppointments.filter(a => a.status === 'confirmed').length;
  }

  async completeAllDaily() {
    const confirmedAppts = this.dailyAppointments.filter(a => a.status === 'confirmed');
    if (this.isProcessingBatch || confirmedAppts.length === 0) return;

    const total = confirmedAppts.length;
    const result = await Swal.fire({
      title: '¿Terminar todos los cortes?',
      html: `
        <div style="text-align: center; margin-top: 8px;">
          <p style="font-size: 15px; color: #444; margin-bottom: 8px;">
            Vas a marcar como completados <strong>${total} ${total === 1 ? 'corte confirmado' : 'cortes confirmados'}</strong> de este día.
          </p>
          <p style="font-size: 13px; color: #777; margin: 0;">
            Los clientes recibirán la invitación para valorar el corte y se actualizarán tus estadísticas.
          </p>
        </div>
      `,
      icon: 'question',
      iconColor: '#c5a059',
      showCancelButton: true,
      confirmButtonColor: '#c5a059',
      cancelButtonColor: '#1c1b18',
      confirmButtonText: `Sí, terminar todos (${total})`,
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    this.isProcessingBatch = true;

    try {
      const validIds = confirmedAppts
        .map(a => a.id)
        .filter((id): id is string => !!id);

      await this.appointmentService.completeMultipleAppointments(validIds);

      // Actualizamos el estado local de las citas a completado
      for (const appt of this.dailyAppointments) {
        if (appt.status === 'confirmed') {
          appt.status = 'completed';
        }
      }

      this.totalCuts += total;
      await this.cargarEstadisticas();

      Swal.fire({
        title: '¡Cortes Terminados!',
        text: `Se han completado ${total} ${total === 1 ? 'corte' : 'cortes'} con éxito.`,
        icon: 'success',
        confirmButtonColor: '#c5a059',
        timer: 2200
      });
    } catch (error) {
      console.error('Error al terminar cortes en lote:', error);
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al terminar los cortes en lote. Inténtalo de nuevo.',
        icon: 'error',
        confirmButtonColor: '#c5a059'
      });
    } finally {
      this.isProcessingBatch = false;
    }
  }

  async cargarEstadisticas() {
    try {
      const citasRef = collection(this.firestore, 'appointments');
      const querySnapshot = await getDocs(citasRef);
      
      const todasLasCitas = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      const citasCompletadas = todasLasCitas.filter(c => c.status === 'completed');
      const citasCanceladas = todasLasCitas.filter(c => c.status === 'cancelled');
      
      this.totalCuts = citasCompletadas.length;

      // 1. Tasa de cancelación
      const totalCitasValidas = citasCompletadas.length + citasCanceladas.length;
      this.cancellationRate = totalCitasValidas > 0 
        ? Math.round((citasCanceladas.length / totalCitasValidas) * 100) 
        : 0;

      // 2. Clientes únicos
      const clientesUnicos = new Set(citasCompletadas.map(c => c.clientId));
      this.totalClients = clientesUnicos.size;

      // 3. Día de la semana más concurrido y conteo semanal
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const conteoDias = new Array(7).fill(0);
      
      // 4. Hora más concurrida
      const conteoHoras: { [hora: string]: number } = {};

      // 5. Clientes VIP
      const conteoClientes: { [clientId: string]: { name: string, count: number } } = {};

      citasCompletadas.forEach(cita => {
        const fecha = new Date(cita.date);
        const diaIndex = fecha.getDay();
        if (!isNaN(diaIndex)) {
          conteoDias[diaIndex]++;
        }

        if (cita.time) {
          conteoHoras[cita.time] = (conteoHoras[cita.time] || 0) + 1;
        }

        if (cita.clientId) {
          if (!conteoClientes[cita.clientId]) {
            conteoClientes[cita.clientId] = { name: cita.clientName || 'Cliente Anónimo', count: 0 };
          }
          conteoClientes[cita.clientId].count++;
        }
      });

      let maxDiaIndex = 1;
      let maxDiaCortes = 0;
      for (let i = 1; i < 7; i++) {
        if (conteoDias[i] > maxDiaCortes) {
          maxDiaCortes = conteoDias[i];
          maxDiaIndex = i;
        }
      }
      this.busiestDay = maxDiaCortes > 0 ? diasSemana[maxDiaIndex] : 'Ninguno';

      let maxHora = 'N/A';
      let maxHoraCortes = 0;
      Object.keys(conteoHoras).forEach(hora => {
        if (conteoHoras[hora] > maxHoraCortes) {
          maxHoraCortes = conteoHoras[hora];
          maxHora = hora;
        }
      });
      this.busiestHour = maxHoraCortes > 0 ? `${maxHora} h` : 'N/A';

      this.vipClients = Object.values(conteoClientes)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      this.datosGraficaMensual = this.appointmentService.obtenerEstadisticasMensuales(citasCompletadas);

      this.datosGraficaSemanal = {
        labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        datasets: [{
          data: [conteoDias[1], conteoDias[2], conteoDias[3], conteoDias[4], conteoDias[5], conteoDias[6]],
          label: 'Cortes por día de la semana',
          backgroundColor: '#c5a059',
          borderRadius: 6
        }]
      };

    } catch (error) {
      console.error('Error al cargar estadísticas avanzadas:', error);
    }
  }

  reviewFilter: 'all' | 'with-comment' = 'all';

  hasComment(review: Review): boolean {
    if (!review.comment) return false;
    const trimmed = review.comment.trim();
    return trimmed.length > 0 && trimmed !== 'Sin comentarios, solo valoración de estrellas.';
  }

  get filteredReviews(): Review[] {
    if (this.reviewFilter === 'with-comment') {
      return this.reviews.filter(r => this.hasComment(r));
    }
    return this.reviews;
  }

  get reviewsWithCommentCount(): number {
    return this.reviews.filter(r => this.hasComment(r)).length;
  }

  async loadReviews() {
    const rawReviews = await this.reviewService.getReviews();
    this.totalReviews = rawReviews.length;
    if (this.totalReviews > 0) {
      const sum = rawReviews.reduce((acc, r) => acc + r.rating, 0);
      this.averageRating = parseFloat((sum / this.totalReviews).toFixed(1));
    } else {
      this.averageRating = 5.0;
    }

    // Priorizamos: primero las reseñas con comentario real, luego las que son solo estrellas (ambas por fecha desc)
    this.reviews = [...rawReviews].sort((a, b) => {
      const aHas = this.hasComment(a);
      const bHas = this.hasComment(b);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return (b.date || 0) - (a.date || 0);
    });
  }

  async deleteReview(reviewId: string) {
    const result = await Swal.fire({
      title: '¿Eliminar reseña?',
      text: 'Esta acción no se puede deshacer y borrará la opinión de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      cancelButtonColor: '#1c1b18',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff'
    });

    if (result.isConfirmed) {
      try {
        await this.reviewService.deleteReview(reviewId);
        Swal.fire({
          title: 'Eliminada',
          text: 'La reseña ha sido eliminada correctamente.',
          icon: 'success',
          confirmButtonColor: '#c5a059',
          timer: 2000
        });
        await this.loadReviews();
      } catch (error) {
        console.error('Error al eliminar la reseña:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar la reseña.',
          icon: 'error',
          confirmButtonColor: '#c5a059'
        });
      }
    }
  }

  setActiveTab(tab: 'calendar' | 'stats' | 'settings') {
    this.activeTab = tab;
    setTimeout(() => {
      const element = document.getElementById('admin-content-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  scrollToReviews() {
    const element = document.getElementById('reviews-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- LÓGICA DE DÍAS CERRADOS (Vacaciones) ---
  addBlockedDate() {
    if (this.dateToBlock) {
      const dateStr = this.datePipe.transform(this.dateToBlock, 'yyyy-MM-dd');
      if (dateStr && !this.blockedDates.includes(dateStr)) {
        this.blockedDates.push(dateStr);
        this.blockedDates.sort();
        
        Swal.fire({
          title: 'Día Bloqueado',
          text: `Se ha cerrado la barbería para el día ${this.datePipe.transform(this.dateToBlock, 'dd/MM/yyyy')}.`,
          icon: 'success',
          confirmButtonColor: '#c5a059',
          timer: 2000
        });
      }
      this.dateToBlock = null; 
    }
  }

  removeBlockedDate(dateStr: string) {
    this.blockedDates = this.blockedDates.filter(d => d !== dateStr);
    Swal.fire({
      title: 'Día Desbloqueado',
      text: 'El día seleccionado vuelve a estar disponible según su horario habitual.',
      icon: 'success',
      confirmButtonColor: '#c5a059',
      timer: 2000
    });
  }

  // --- HORARIOS ESPECIALES POR FECHA (SOLUCIÓN AL CLIENTE) ---
  onExceptionDateSelected(date: Date | null) {
    this.selectedExceptionDate = date;
    if (!date) {
      this.exceptionSlotsForSelectedDate = [];
      return;
    }
    const dateStr = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
    
    // Si ya existe un horario personalizado para este día, lo cargamos
    if (this.customDays[dateStr] !== undefined) {
      const slotsStr = this.customDays[dateStr] || '';
      this.exceptionSlotsForSelectedDate = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    } else {
      // Si no, cargamos el horario por defecto para ese día de la semana
      const dayOfWeek = date.getDay();
      const slotsStr = this.weeklySchedule[dayOfWeek] || '';
      this.exceptionSlotsForSelectedDate = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    }
  }

  toggleExceptionSlot(slot: string) {
    if (!this.selectedExceptionDate) return;
    
    const index = this.exceptionSlotsForSelectedDate.indexOf(slot);
    if (index > -1) {
      // Si está activo, lo quitamos (lo cancelamos)
      this.exceptionSlotsForSelectedDate.splice(index, 1);
    } else {
      // Si no está, lo añadimos (abrimos esa hora) y ordenamos
      this.exceptionSlotsForSelectedDate.push(slot);
      this.exceptionSlotsForSelectedDate.sort((a, b) => a.localeCompare(b));
    }
    
    // Guardamos en nuestro objeto temporal customDays
    const dateStr = this.datePipe.transform(this.selectedExceptionDate, 'yyyy-MM-dd') || '';
    this.customDays[dateStr] = this.exceptionSlotsForSelectedDate.join(',');
  }

  isExceptionSlotActive(slot: string): boolean {
    return this.exceptionSlotsForSelectedDate.includes(slot);
  }

  resetToDefaultSchedule() {
    if (!this.selectedExceptionDate) return;
    const dateStr = this.datePipe.transform(this.selectedExceptionDate, 'yyyy-MM-dd') || '';
    
    // Eliminamos la excepción horaria de esta fecha
    delete this.customDays[dateStr];
    
    // Recargamos las horas del día de la semana correspondientes
    const dayOfWeek = this.selectedExceptionDate.getDay();
    const slotsStr = this.weeklySchedule[dayOfWeek] || '';
    this.exceptionSlotsForSelectedDate = slotsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    
    Swal.fire({
      title: 'Horario Reestablecido',
      text: 'Se ha vuelto a aplicar el horario semanal ordinario para este día.',
      icon: 'success',
      confirmButtonColor: '#c5a059',
      timer: 2000
    });
  }

  // GUARDA TODOS LOS AJUSTES DEL JEFE EN FIRESTORE
  async saveAdminSettings() {
    this.isSaving = true;
    try {
      await this.appointmentService.saveBarbershopSettings({
        blockedDates: this.blockedDates,
        weeklySchedule: this.weeklySchedule,
        customDays: this.customDays
      });
      
      Swal.fire({
        title: '¡Ajustes Guardados!',
        text: 'Los horarios y vacaciones se han actualizado correctamente.',
        icon: 'success',
        confirmButtonColor: '#c5a059',
        timer: 2500
      });
    } catch (e) {
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al guardar la configuración.',
        icon: 'error',
        confirmButtonColor: '#c5a059'
      });
    } finally {
      this.isSaving = false;
    }
  }
}