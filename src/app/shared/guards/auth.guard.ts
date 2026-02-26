import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Leemos el estado del usuario en Firebase
  return authService.user$.pipe(
    take(1), // Cogemos el primer valor que emita y cerramos la suscripción
    map(user => {
      if (user) {
        return true; // Hay usuario logueado: le abrimos la puerta
      } else {
        // No hay usuario: le avisamos y le mandamos de vuelta a la portada
        alert('Debes iniciar sesión con Google para poder pedir una cita.');
        return router.createUrlTree(['/']); 
      }
    })
  );
};