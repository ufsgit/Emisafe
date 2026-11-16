import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CertificateItem {
  id: number;
  employee_id: number;
  /** null when the scope was typed manually ("Other"). */
  certificate_type_id: number | null;
  certificate_number: string;
  /** Client work order number used to build the certificate number. */
  work_order?: string | null;
  issue_date: string;
  expiry_date: string;
  status: 'Pass' | 'Fail' | 'Withdrawn' | 'Withheld';
  scope_name?: string;
  accreditation_status?: 'EIAC' | 'Non-EIAC' | null;
  company_name?: string | null;
  approval_status?: 'pending' | 'approved';
  approved_at?: string | null;
  employee_name?: string;
  employee_emirates_id?: string;
  employee_job_title?: string;
  employee_photo?: string | null;
  photo?: string | null;
  certificate_type_name?: string;
  validity_status: 'Valid' | 'Expiring Soon' | 'Expired' | 'Fail' | 'Withdrawn' | 'Withheld';
  is_valid?: boolean;
  days_remaining?: number;
}

export interface CertificateFormatItem {
  id: number;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_by?: number | null;
  uploaded_by_name?: string | null;
  created_at?: string;
}

/** Preview of the certificate number the server would generate next. */
export interface NextCertificateNumber {
  certificate_number: string;
  sequence: number;
  work_order: string;
  prefix: string;
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
    approval?: string;
  }): Observable<CertificateListResponse> {
    let params = new HttpParams();
    if (query?.page) params = params.set('page', query.page.toString());
    if (query?.limit) params = params.set('limit', query.limit.toString());
    if (query?.search) params = params.set('search', query.search);
    if (query?.employee_id) params = params.set('employee_id', query.employee_id.toString());
    if (query?.certificate_type_id) params = params.set('certificate_type_id', query.certificate_type_id.toString());
    if (query?.status) params = params.set('status', query.status);
    if (query?.validity) params = params.set('validity', query.validity);
    if (query?.approval) params = params.set('approval', query.approval);

    return this.http.get<CertificateListResponse>('/api/certificates', { params });
  }

  getCertificate(id: number): Observable<{ success: boolean; data: { certificate: CertificateItem } }> {
    return this.http.get<{ success: boolean; data: { certificate: CertificateItem } }>(`/api/certificates/${id}`);
  }

  createCertificate(data: any): Observable<{ success: boolean; message: string; data: { id: number; certificate_number?: string; work_order?: string | null } }> {
    return this.http.post<{ success: boolean; message: string; data: { id: number; certificate_number?: string; work_order?: string | null } }>('/api/certificates', data);
  }

  updateCertificate(id: number, data: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`/api/certificates/${id}`, data);
  }

  /** Approval is restricted to certification managers on the server (403 otherwise). */
  approveCertificate(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.patch<{ success: boolean; message?: string }>(`/api/certificates/${id}/approve`, {});
  }

  deleteCertificate(id: number): Observable<{ success: boolean; message: string; data: { id: number } }> {
    return this.http.delete<{ success: boolean; message: string; data: { id: number } }>(`/api/certificates/${id}`);
  }

  getCertificateFormat(): Observable<{ success: boolean; data: { format: CertificateFormatItem | null } }> {
    return this.http.get<{ success: boolean; data: { format: CertificateFormatItem | null } }>('/api/certificates/format');
  }

  uploadCertificateFormat(payload: {
    file_name: string;
    mime_type?: string;
    file_size?: number;
    dataBase64: string;
  }): Observable<{ success: boolean; message: string; data: { format: CertificateFormatItem } }> {
    return this.http.post<{ success: boolean; message: string; data: { format: CertificateFormatItem } }>(
      '/api/certificates/format',
      payload
    );
  }

  deleteCertificateFormat(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>('/api/certificates/format');
  }

  /**
   * Preview of the certificate number the server generates for a work order:
   * WOR-yy/<work order>/<ddmm>-<CODE>-C<sequence>.
   */
  getNextCertificateNumber(query: {
    work_order: string;
    code?: string;
    issue_date?: string;
  }): Observable<{ success: boolean } & NextCertificateNumber> {
    let params = new HttpParams().set('work_order', (query.work_order || '').trim());
    if (query.code) params = params.set('code', query.code);
    if (query.issue_date) params = params.set('issue_date', query.issue_date);
    return this.http.get<{ success: boolean } & NextCertificateNumber>('/api/certificates/next-number', { params });
  }

  /** Raw certificate format files (newest first). */
  getCertificateFormats(): Observable<{ success: boolean; data: { formats: CertificateFormatItem[]; format: CertificateFormatItem | null } }> {
    return this.http.get<{ success: boolean; data: { formats: CertificateFormatItem[]; format: CertificateFormatItem | null } }>(
      '/api/certificate-formats'
    );
  }

  /** Uploads the raw certificate format (admin only). */
  uploadCertificateFormatFile(payload: {
    file_name: string;
    mime_type?: string;
    dataBase64: string;
  }): Observable<{ success: boolean; message: string; data: { format: CertificateFormatItem } }> {
    return this.http.post<{ success: boolean; message: string; data: { format: CertificateFormatItem } }>(
      '/api/certificate-formats',
      payload
    );
  }

  /** Removes a single raw certificate format file (admin only). */
  deleteCertificateFormatFile(id: number): Observable<{ success: boolean; message: string; data: { id: number } }> {
    return this.http.delete<{ success: boolean; message: string; data: { id: number } }>(`/api/certificate-formats/${id}`);
  }
}

