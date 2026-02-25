import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        // Aquí aplicamos Lazy Loading para cargar el HomeComponent
       loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];