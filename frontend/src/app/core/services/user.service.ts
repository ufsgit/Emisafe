import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { normalizePaginated, PaginatedList } from '../utils/paginated';

export type AppRole = 'admin' | 'certification_manager' | 'examiner' | 'technical_coordinator';

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: AppRole | string;
  is_active: number | boolean;
  photo?: string | null;
  created_at?: string;
}

export interface UserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: AppRole | string;
  photo?: string | null;
  is_active?: number | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  getUsers(query?: { page?: number; limit?: number; search?: string }): Observable<PaginatedList<AppUser>> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);

    return this.http.get<any>('/api/users', { params }).pipe(
      map(res => normalizePaginated<AppUser>(res))
    );
  }

  createUser(payload: UserPayload): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>('/api/users', payload);
  }

  updateUser(id: number, payload: UserPayload): Observable<{ success: boolean; message?: string }> {
    return this.http.patch<{ success: boolean; message?: string }>(`/api/users/${id}`, payload);
  }
}
