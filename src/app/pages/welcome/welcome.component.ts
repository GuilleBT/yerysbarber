import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router'; // Añadido Router
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../shared/services/auth.service'; // Añadido AuthService

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss'
})
export class WelcomeComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // PON AQUÍ EL CORREO REAL DE YERAY
  private ADMIN_EMAIL = ' guillermobeltrantabares@gmail.com'; 

  ngOnInit() {
    // Escuchamos el estado del usuario en tiempo real
    this.authService.user$.subscribe(user => {
      // Si hay un usuario logueado y es el jefe...
      if (user && user.email === this.ADMIN_EMAIL) {
        // ¡Zasca! Teletransporte al panel de control
        this.router.navigate(['/admin']);
      }
    });
  }
}