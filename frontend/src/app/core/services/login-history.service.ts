import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { normalizePaginated, PaginatedList } from '../utils/paginated';

export interface LoginHistoryEntry {
  id: number;
  user_id?: number | null;
  name: string;
  email: string;
  role: string;
  ip?: string;
  user_agent?: string;
  login_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoginHistoryService {
  private http = inject(HttpClient);

  getLoginHistory(query?: { page?: number; limit?: number; search?: string }): Observable<PaginatedList<LoginHistoryEntry>> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);

    return this.http.get<any>('/api/auth/login-history', { params }).pipe(
      map(res => normalizePaginated<LoginHistoryEntry>(res))
    );
  }
}
