import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

return authService.user$.pipe(
    take(1),
    map(user => {
      // Comprobamos si hay usuario y si su correo coincide con el del jefe (desde el servicio)
      if (user && user.email === authService.ADMIN_EMAIL) {
        return true; // Le abrimos la puerta al panel
      } else {
        alert('Acceso denegado. Área exclusiva para el administrador.');
        return router.createUrlTree(['/']); // Lo mandamos a la calle
      }
    })
  );
};