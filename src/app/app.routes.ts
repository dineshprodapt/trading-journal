import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'journal',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/journal.component').then((m) => m.JournalComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'journal' },
  { path: '**', redirectTo: 'journal' },
];
