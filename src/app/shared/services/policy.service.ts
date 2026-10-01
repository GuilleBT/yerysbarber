import { Injectable, signal } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PolicyService {
  private readonly STORAGE_KEY = 'yerys_normas_aceptadas_v1';

  // Control reactivo de la visibilidad y modo del modal
  public isOpen = signal<boolean>(false);
  public isMandatory = signal<boolean>(false);
  
  // Bandera de bloqueo cuando hay un aviso de actualización de la app (PWA / SwUpdate)
  public isUpdatePromptActive = signal<boolean>(false);

  // Callback opcional cuando se acepta obligatoriamente
  private onAcceptCallback: (() => void) | null = null;

  /**
   * Comprueba si el usuario ya ha aceptado los términos previamente
   */
  hasAccepted(): boolean {
    try {
      return localStorage.getItem(this.STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Abre el modal de términos y condiciones
   * @param mandatory Si es true, el usuario no puede cerrar el modal sin aceptar
   * @param onAccept Callback que se ejecuta cuando el usuario acepta
   */
  open(mandatory: boolean = false, onAccept?: () => void) {
    // Si la alerta de actualización de la app está en pantalla o SweetAlert está activo, no abrimos para evitar solapes
    if (this.isUpdatePromptActive() || Swal.isVisible()) {
      return;
    }

    this.isMandatory.set(mandatory);
    if (onAccept) {
      this.onAcceptCallback = onAccept;
    } else {
      this.onAcceptCallback = null;
    }
    this.isOpen.set(true);
  }

  /**
   * Cierra el modal (solo en modo informativo o forzado)
   */
  close() {
    this.isOpen.set(false);
    this.onAcceptCallback = null;
  }

  /**
   * Registra la aceptación del usuario y ejecuta callback si existía
   */
  accept() {
    try {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('No se pudo guardar la aceptación en localStorage', e);
    }
    this.isOpen.set(false);
    if (this.onAcceptCallback) {
      const cb = this.onAcceptCallback;
      this.onAcceptCallback = null;
      cb();
    }
  }

  /**
   * Notifica que la alerta de actualización está activa o ha terminado
   */
  setUpdatePromptActive(active: boolean) {
    this.isUpdatePromptActive.set(active);
    // Si salta una actualización mientras el modal estaba abierto, lo cerramos para darle prioridad total a la actualización
    if (active && this.isOpen()) {
      this.isOpen.set(false);
    }
  }
}
