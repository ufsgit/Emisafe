import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';

export type UserRole = 'admin' | 'certification_manager' | 'examiner' | 'technical_coordinator';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role?: UserRole | string;
  photo?: string | null;
  is_active?: number | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  public currentUser = signal<AdminUser | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public isAuthChecked = signal<boolean>(false);

  /** Role of the signed-in user ('' when unknown). */
  public role = computed<string>(() => this.currentUser()?.role || '');
  /** True when the signed-in user is an admin. */
  public isAdmin = computed<boolean>(() => this.role() === 'admin');
  /** True when the signed-in user is a certification manager. */
  public isManager = computed<boolean>(() => this.role() === 'certification_manager');
  /** True when the signed-in user is a technical coordinator (supervisor). */
  public isCoordinator = computed<boolean>(() => this.role() === 'technical_coordinator');
  /** True when the signed-in user may issue, edit, or delete certificates. */
  public canManageCertificates = computed<boolean>(() =>
    ['admin', 'certification_manager', 'examiner'].includes(this.role())
  );
  /** True when the signed-in user may edit, deactivate, or delete existing candidates/scopes/documents. */
  public canModifyRecords = computed<boolean>(() =>
    ['admin', 'certification_manager', 'examiner'].includes(this.role())
  );

  /** Human readable role label for the UI. */
  public roleLabel = computed<string>(() => {
    switch (this.role()) {
      case 'admin': return 'Administrator';
      case 'certification_manager': return 'Certification Manager';
      case 'examiner': return 'Examiner';
      case 'technical_coordinator': return 'Technical Coordinator';
      default: return 'Administrator';
    }
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkSession().subscribe();
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>('/api/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(this.normalizeUser(res.data.admin));
          this.isAuthenticated.set(true);
          this.isAuthChecked.set(true);
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post<any>('/api/auth/logout', {}).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.router.navigate(['/admin/login']);
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.router.navigate(['/admin/login']);
        return of(null);
      })
    );
  }

  checkSession(): Observable<boolean> {
    return this.http.get<any>('/api/auth/me').pipe(
      map(res => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(this.normalizeUser(res.data.admin));
          this.isAuthenticated.set(true);
          this.isAuthChecked.set(true);
          return true;
        }
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.isAuthChecked.set(true);
        return false;
      }),
      catchError(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.isAuthChecked.set(true);
        return of(false);
      })
    );
  }

  /** Keep only the user fields the UI needs ({ name, email, role, photo }). */
  private normalizeUser(raw: any): AdminUser {
    return {
      id: raw?.id,
      name: raw?.name || '',
      email: raw?.email || '',
      role: raw?.role || '',
      photo: raw?.photo || null,
      is_active: raw?.is_active
    };
  }
}

