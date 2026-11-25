import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // 1. Public Verification Page (Server-Side Rendered on "/")
  {
    path: '',
    loadComponent: () => import('./public/verify/verify.component').then(m => m.VerifyComponent),
    pathMatch: 'full'
  },

  // 2. Admin Authentication
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },

  // 2b. Print-friendly certificate documents (auth-protected, NO navbar)
  {
    path: 'admin/certificates/:id/print',
    loadComponent: () => import('./admin/certificates/certificate-print.component').then(m => m.CertificatePrintComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/certificates/:id/alternate',
    loadComponent: () => import('./admin/certificates/certificate-alternate.component').then(m => m.CertificateAlternateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/certificates/:id/card',
    redirectTo: 'admin/certificates/:id/alternate',
    pathMatch: 'full'
  },

  // 3. Admin Protected Shell
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'candidates',
        loadComponent: () => import('./admin/candidates/candidates.component').then(m => m.CandidatesComponent)
      },
      {
        path: 'candidates/:id',
        loadComponent: () => import('./admin/candidates/candidate-detail.component').then(m => m.CandidateDetailComponent)
      },
      {
        path: 'scopes',
        loadComponent: () => import('./admin/scopes/scopes.component').then(m => m.ScopesComponent)
      },
      {
        path: 'certificates',
        loadComponent: () => import('./admin/certificates/certificates.component').then(m => m.CertificatesComponent)
      },
      {
        path: 'certificate-format',
        loadComponent: () => import('./admin/certificate-format/certificate-format.component').then(m => m.CertificateFormatComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'reports',
        loadComponent: () => import('./admin/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/users.component').then(m => m.UsersComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'login-history',
        loadComponent: () => import('./admin/login-history/login-history.component').then(m => m.LoginHistoryComponent),
        canActivate: [adminGuard]
      }
    ]
  },

  // Wildcard fallback
  {
    path: '**',
    redirectTo: ''
  }
];
