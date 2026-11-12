import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CertificateItem {
  id: number;
  employee_id: number;
  certificate_type_id: number;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  status: 'Pass' | 'Fail';
  description?: string;
  scope?: string;
  employee_name?: string;
  employee_emirates_id?: string;
  employee_job_title?: string;
  certificate_type_name?: string;
  certificate_type_category?: string;
  validity_status: 'Valid' | 'Expiring Soon' | 'Expired' | 'Fail';
  is_valid: boolean;
  days_remaining: number;
  created_at?: string;
}

export interface CertificateListResponse {
  success: boolean;
  data: {
    certificates: CertificateItem[];
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
export class CertificateService {
  private http = inject(HttpClient);

  getCertificates(query?: {
    page?: number;
    limit?: number;
    search?: string;
    employee_id?: number | string;
    certificate_type_id?: number | string;
    status?: string;
    validity?: string;
  }): Observable<CertificateListResponse> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);
    if (query?.employee_id) params = params.set('employee_id', query.employee_id.toString());
    if (query?.certificate_type_id) params = params.set('certificate_type_id', query.certificate_type_id.toString());
    if (query?.status) params = params.set('status', query.status);
    if (query?.validity) params = params.set('validity', query.validity);

    return this.http.get<CertificateListResponse>('/api/certificates', { params });
  }

  getCertificate(id: number): Observable<{ success: boolean; data: { certificate: CertificateItem } }> {
    return this.http.get<{ success: boolean; data: { certificate: CertificateItem } }>(`/api/certificates/${id}`);
  }

  createCertificate(data: any): Observable<{ success: boolean; message: string; data: { id: number } }> {
    return this.http.post<{ success: boolean; message: string; data: { id: number } }>('/api/certificates', data);
  }

  updateCertificate(id: number, data: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`/api/certificates/${id}`, data);
  }

  deleteCertificate(id: number): Observable<{ success: boolean; message: string; data: { id: number } }> {
    return this.http.delete<{ success: boolean; message: string; data: { id: number } }>(`/api/certificates/${id}`);
  }
}

