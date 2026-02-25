import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      // Aquí meteremos las vistas de las reservas
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];