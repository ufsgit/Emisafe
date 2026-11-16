import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Employee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  emirates_id: string;
  date_of_birth?: string;
  nationality?: string;
  gender?: 'Male' | 'Female' | 'Other';
  job_title?: string;
  address?: string;
  /** Current company the candidate belongs to. */
  company?: string;
  /** Most recent previous company (computed by the API), null when none. */
  previous_company?: string | null;
  photo?: string;
  is_active: number | boolean;
  certificates_count?: number;
}

export interface EmployeeDocument {
  id: number;
  doc_type: string;
  file_name: string;
  file_path: string;
  created_at?: string;
}

export interface CandidateLookup {
  found: boolean;
  candidate: {
    id: number;
    name: string;
    photo?: string | null;
    company?: string | null;
    emirates_id: string;
  } | null;
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

  /** Look a candidate up by Emirates ID (used by the Issue Certificate form). */
  lookupCandidate(emiratesId: string): Observable<{ success: boolean; data: CandidateLookup }> {
    const params = new HttpParams().set('emirates_id', emiratesId.trim());
    return this.http.get<{ success: boolean; data: CandidateLookup }>('/api/employees/lookup', { params });
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

  /** Candidate documents — the API answers either `{ data: [...] }` or `{ success, data: { data: [...] } }`. */
  getDocuments(id: number): Observable<EmployeeDocument[]> {
    return this.http.get<any>(`/api/employees/${id}/documents`).pipe(
      map(res => this.normalizeDocuments(res))
    );
  }

  uploadDocuments(id: number, files: { doc_type: string; file_name: string; dataBase64: string }[]): Observable<any> {
    return this.http.post<any>(`/api/employees/${id}/documents`, { files });
  }

  deleteDocument(id: number, docId: number): Observable<any> {
    return this.http.delete<any>(`/api/employees/${id}/documents/${docId}`);
  }

  private normalizeDocuments(res: any): EmployeeDocument[] {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.documents)) return res.documents;
    return [];
  }
}
