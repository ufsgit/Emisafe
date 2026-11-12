import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  emirates_id: string;
  date_of_birth?: string;
  nationality?: string;
  gender?: 'Male' | 'Female' | 'Other';
  job_title?: string;
  address?: string;
  is_active: number | boolean;
  certificates_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeListResponse {
  success: boolean;
  data: {
    employees: Employee[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private http = inject(HttpClient);

  getEmployees(query?: { page?: number; limit?: number; search?: string; status?: string }): Observable<EmployeeListResponse> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);
    if (query?.status) params = params.set('status', query.status);

    return this.http.get<EmployeeListResponse>('/api/employees', { params });
  }

  getEmployee(id: number): Observable<{ success: boolean; data: { employee: Employee; certificates: any[] } }> {
    return this.http.get<{ success: boolean; data: { employee: Employee; certificates: any[] } }>(`/api/employees/${id}`);
  }

  createEmployee(data: Partial<Employee>): Observable<{ success: boolean; message: string; data: { employee: Employee } }> {
    return this.http.post<{ success: boolean; message: string; data: { employee: Employee } }>('/api/employees', data);
  }

  updateEmployee(id: number, data: Partial<Employee>): Observable<{ success: boolean; message: string; data: { employee: Employee } }> {
    return this.http.put<{ success: boolean; message: string; data: { employee: Employee } }>(`/api/employees/${id}`, data);
  }

  toggleStatus(id: number): Observable<{ success: boolean; message: string; data: { id: number; is_active: number } }> {
    return this.http.patch<{ success: boolean; message: string; data: { id: number; is_active: number } }>(`/api/employees/${id}/toggle-status`, {});
  }

  deleteEmployee(id: number): Observable<{ success: boolean; message: string; data: { id: number; deletedCertificates: number } }> {
    return this.http.delete<{ success: boolean; message: string; data: { id: number; deletedCertificates: number } }>(`/api/employees/${id}`);
  }
}

