import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '', // La ruta por defecto ahora es la bienvenida
        loadComponent: () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent)
      },
      {
        path: 'reservar', // Movemos tu calendario aquí
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];