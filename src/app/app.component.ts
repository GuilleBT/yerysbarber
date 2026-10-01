import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { PolicyService } from './shared/services/policy.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  // Inyectamos el servicio que vigila el Service Worker
  private swUpdate = inject(SwUpdate);
  private policyService = inject(PolicyService);

  ngOnInit() {
    this.verificarActualizaciones();
  }

  private verificarActualizaciones() {
    // Si el Service Worker está activo (solo en producción)
    if (this.swUpdate.isEnabled) {
      
      this.swUpdate.versionUpdates
        .pipe(
          // Filtramos para que solo nos avise cuando la versión nueva esté LISTA
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
        )
        .subscribe(() => {
          // Marcamos que la alerta de actualización está activa para pausar cualquier otro modal
          this.policyService.setUpdatePromptActive(true);

          // Lanzamos el aviso elegante con SweetAlert2
          Swal.fire({
            title: '¡Mejoras disponibles!',
            text: 'Hemos actualizado YerysBarber con nuevas funciones. ¿Quieres aplicarlas ahora?',
            icon: 'info',
            iconColor: '#D4AF37',
            showCancelButton: true,
            confirmButtonColor: '#D4AF37',
            cancelButtonColor: '#1a1a1a',
            confirmButtonText: '¡Sí, actualizar!',
            cancelButtonText: 'Más tarde',
            background: '#ffffff',
            customClass: {
              title: 'swal-title-gold'
            }
          }).then((result) => {
            if (result.isConfirmed) {
              // Forzamos la recarga: limpia la caché vieja y carga el nuevo ID de Telegram
              window.location.reload();
            } else {
              // Si el usuario elige "Más tarde", liberamos el bloqueo para que la app funcione con normalidad
              this.policyService.setUpdatePromptActive(false);
            }
          });
        });
    }
  }
}