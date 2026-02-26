import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './shared/guards/auth.guard'; 
import { adminGuard } from './shared/guards/admin.guard';
export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
   children: [
      {
        path: '', 
        loadComponent: () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent)
      },
      {
        path: 'reservar', 
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
        canActivate: [authGuard]
      },
      {
        path: 'mis-citas', 
        loadComponent: () => import('./pages/my-appointments/my-appointments.component').then(m => m.MyAppointmentsComponent),
        canActivate: [authGuard] 
      },
      {
        path: 'admin', 
        loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [adminGuard] 
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard]
      },
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];