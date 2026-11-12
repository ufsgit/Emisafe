import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

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
        path: 'employees',
        loadComponent: () => import('./admin/employees/employees.component').then(m => m.EmployeesComponent)
      },
      {
        path: 'employees/:id',
        loadComponent: () => import('./admin/employees/employee-detail.component').then(m => m.EmployeeDetailComponent)
      },
      {
        path: 'certificate-types',
        loadComponent: () => import('./admin/certificate-types/certificate-types.component').then(m => m.CertificateTypesComponent)
      },
      {
        path: 'certificates',
        loadComponent: () => import('./admin/certificates/certificates.component').then(m => m.CertificatesComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./admin/reports/reports.component').then(m => m.ReportsComponent)
      }
    ]
  },

  // Wildcard fallback
  {
    path: '**',
    redirectTo: ''
  }
];
