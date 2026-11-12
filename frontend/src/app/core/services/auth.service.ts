import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
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

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkSession().subscribe();
    }
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>('/api/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.data?.admin) {
          this.currentUser.set(res.data.admin);
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
          this.currentUser.set(res.data.admin);
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
}

