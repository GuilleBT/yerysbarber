import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  
  // NUEVO: Variable para que el HTML sepa si es el jefe
  public isAdmin = false; 

 ngOnInit() {
    // Escuchamos en tiempo real si el que navega es el admin
    this.authService.user$.subscribe(user => {
      this.isAdmin = (user && user.email === this.authService.ADMIN_EMAIL) || false;
    });
  }

  async login() {
    await this.authService.loginWithGoogle();
    
    // Inmediatamente después de loguearse, comprobamos su identidad
    const user = this.authService.getCurrentUser();
    
    if (user && user.email === this.authService.ADMIN_EMAIL) {
      this.router.navigate(['/admin']); // Vuelo directo al panel del jefe
    } else {
      this.router.navigate(['/']); // Los mortales van a la portada
    }
  }
}