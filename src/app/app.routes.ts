import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import("./components/home/home").then((m) => m.Home)
  },
  {
    path: 'authorized',
    loadComponent: () => import("./components/authorized/authorized").then((m) => m.Authorized)
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
