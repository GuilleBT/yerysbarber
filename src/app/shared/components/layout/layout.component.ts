import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { PolicyService } from '../../services/policy.service';
import { PolicyModalComponent } from '../policy-modal/policy-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, PolicyModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  public authService = inject(AuthService);
  public policyService = inject(PolicyService);
  private router = inject(Router);
  
  // Variable para que el HTML sepa si es el jefe
  public isAdmin = false; 

  ngOnInit() {
    // Escuchamos en tiempo real si el que navega es el admin
    this.authService.user$.subscribe(user => {
      this.isAdmin = (user && user.email === this.authService.ADMIN_EMAIL) || false;
      
      // Si no es el admin y aún no ha aceptado las normas, programamos la apertura elegante
      if (!this.isAdmin && !this.policyService.hasAccepted()) {
        this.verificarAperturaNormas();
      }
    });

    // Verificación inicial para visitantes (incluso antes de loguearse)
    this.verificarAperturaNormas();
  }

  private verificarAperturaNormas() {
    // Esperamos 1200ms para asegurar que ServiceWorker / SwUpdate emita primero si hay actualización
    setTimeout(() => {
      if (
        !this.isAdmin &&
        !this.policyService.hasAccepted() &&
        !this.policyService.isUpdatePromptActive() &&
        !Swal.isVisible()
      ) {
        this.policyService.open(true);
      }
    }, 1200);
  }

  openPolicyModal() {
    this.policyService.open(false);
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