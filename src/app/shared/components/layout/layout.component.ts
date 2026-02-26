import { Component, inject } from '@angular/core';
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
export class LayoutComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  // ¡OJO! Tiene que ser PUBLIC para que el HTML pueda leerla correctamente
  public ADMIN_EMAIL = 'guillermobeltrantabares@gmail.com'; 

  async login() {
    await this.authService.loginWithGoogle();
  }
}