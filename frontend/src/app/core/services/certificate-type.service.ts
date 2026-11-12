import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CertificateType {
  id: number;
  name: string;
  category?: string;
  description?: string;
  scope?: string;
  is_active: number | boolean;
  certificates_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CertificateTypeListResponse {
  success: boolean;
  data: {
    certificateTypes: CertificateType[];
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
export class CertificateTypeService {
  private http = inject(HttpClient);

  getCertificateTypes(query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Observable<CertificateTypeListResponse> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);
    if (query?.status) params = params.set('status', query.status);

    return this.http.get<CertificateTypeListResponse>('/api/certificate-types', { params });
  }

  getCertificateType(id: number): Observable<{ success: boolean; data: { certificateType: CertificateType } }> {
    return this.http.get<{ success: boolean; data: { certificateType: CertificateType } }>(`/api/certificate-types/${id}`);
  }

  createCertificateType(data: Partial<CertificateType>): Observable<{ success: boolean; message: string; data: { certificateType: CertificateType } }> {
    return this.http.post<{ success: boolean; message: string; data: { certificateType: CertificateType } }>('/api/certificate-types', data);
  }

  updateCertificateType(id: number, data: Partial<CertificateType>): Observable<{ success: boolean; message: string; data: { certificateType: CertificateType } }> {
    return this.http.put<{ success: boolean; message: string; data: { certificateType: CertificateType } }>(`/api/certificate-types/${id}`, data);
  }

  toggleStatus(id: number): Observable<{ success: boolean; message: string; data: { id: number; is_active: number } }> {
    return this.http.patch<{ success: boolean; message: string; data: { id: number; is_active: number } }>(`/api/certificate-types/${id}/toggle-status`, {});
  }
}

