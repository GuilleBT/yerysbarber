import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, 
    MatInputModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);

  uid: string = '';
  phone: string = '';
  isSaving: boolean = false;

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.uid = user.uid;
      const profile = await this.authService.getUserProfile(this.uid);
      if (profile) {
        this.phone = profile['phone'] || '';
      }
    }
  }

  async saveProfile() {
    if (!this.phone) {
      alert('Por favor, añade un número de teléfono para que Yeray pueda contactarte.');
      return;
    }

    this.isSaving = true;
    try {
      await this.authService.updateUserProfile(this.uid, {
        phone: this.phone
      });
      alert('¡Perfil actualizado con éxito!');
    } catch (error) {
      alert('Hubo un error al guardar los datos.');
    } finally {
      this.isSaving = false;
    }
  }
}