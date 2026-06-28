import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, 
    MatInputModule, MatButtonModule, MatIconModule, RouterModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);

  isAdmin: boolean = false;
  uid: string = '';
  isSaving: boolean = false;

  // Variables Cliente
  phone: string = '';

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.uid = user.uid;
      this.isAdmin = (user.email === this.authService.ADMIN_EMAIL);

      if (!this.isAdmin) {
        const profile = await this.authService.getUserProfile(this.uid);
        if (profile) this.phone = profile['phone'] || '';
      }
    }
  }

  // GUARDA EL TELÉFONO DEL CLIENTE NORMAL
  async saveClientProfile() {
    if (!this.phone) return alert('Añade un número.');
    this.isSaving = true;
    try {
      await this.authService.updateUserProfile(this.uid, { phone: this.phone });
      alert('¡Perfil actualizado!');
    } catch (e) { alert('Error al guardar.'); }
    this.isSaving = false;
  }
}