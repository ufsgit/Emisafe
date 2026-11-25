import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CertificateService, CertificateItem, CertificateFormatItem } from '../../core/services/certificate.service';
import { EmployeeService, Employee } from '../../core/services/employee.service';
import { CertificateTypeService, CertificateType } from '../../core/services/certificate-type.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.scss']
})
export class CertificatesComponent implements OnInit {
  private certService = inject(CertificateService);
  private employeeService = inject(EmployeeService);
  private typeService = inject(CertificateTypeService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  public auth = inject(AuthService);

  public certificates = signal<CertificateItem[]>([]);
  public employeesList = signal<Employee[]>([]);
  public typesList = signal<CertificateType[]>([]);
  public activeTypesList = signal<CertificateType[]>([]);
  public eiacTypesList = signal<CertificateType[]>([]);

  public totalCount = signal<number>(0);
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public pageSize = 10;

  // Filters
  public search = '';
  public selectedEmployeeId: number | string = '';
  public selectedTypeId: number | string = '';
  public statusFilter = '';
  /** 'all' | 'valid' | 'expiring_soon' | 'expired' | 'pending' */
  public validityTab = 'all';
  public isLoading = signal<boolean>(false);
  public pendingCount = signal<number>(0);

  // Modal
  public showModal = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalError = signal<string>('');

  // Candidate lookup (Issue Certificate form)
  public isLookingUp = signal<boolean>(false);
  public lookupName = signal<string>('');
  public lookupPhoto = signal<string>('');
  public candidatePhotoMissing = signal<boolean>(false);

  // Auto-generated certificate number preview (work order + code + issue date)
  public generatedNumber = signal<string>('');
  public isPreviewingNumber = signal<boolean>(false);

  // Success panel after issuing
  public issuedResult = signal<{ id: number; number: string } | null>(null);

  // Delete Modal
  public showDeleteModal = signal<boolean>(false);
  public selectedCert = signal<CertificateItem | null>(null);
  public isDeleting = signal<boolean>(false);

  // Raw Certificate Format (Admin upload provision / Demo fallback)
  public activeFormat = signal<CertificateFormatItem | null>(null);
  public isUploadingFormat = signal<boolean>(false);
  public isRemovingFormat = signal<boolean>(false);

  public accreditationOptions = ['EIAC', 'Non-EIAC'];
  public statusOptions = ['Pass', 'Fail', 'Withdrawn', 'Withheld'];
  public scopeOtherValue = 'other';

  public formData: any = this.blankForm();

  private searchTimeout: any;
  private numberPreviewTimeout: any;

  ngOnInit(): void {
    // Check query params (e.g. from dashboard or candidate detail)
    this.route.queryParams.subscribe(params => {
      if (params['approval'] === 'pending' && this.auth.isManager()) {
        this.validityTab = 'pending';
      } else if (params['validity']) {
        this.validityTab = params['validity'];
      }
      if (params['employee_id']) {
        this.selectedEmployeeId = params['employee_id'];
      }
      if (params['search']) {
        this.search = params['search'];
      }
      this.loadCertificates();
    });

    this.loadDropdownData();
    this.loadPendingCount();
    this.loadCertificateFormat();
  }

  loadCertificateFormat(): void {
    this.certService.getCertificateFormat().subscribe({
      next: (res) => {
        if (res.success) {
          this.activeFormat.set(res.data?.format || null);
        }
      },
      error: () => {}
    });
  }

  onFormatFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      this.toast.error('Format file must be 15 MB or smaller.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    this.isUploadingFormat.set(true);
    reader.onload = () => {
      const dataBase64 = typeof reader.result === 'string' ? reader.result : '';
      this.certService
        .uploadCertificateFormat({
          file_name: file.name,
          mime_type: file.type || undefined,
          file_size: file.size,
          dataBase64
        })
        .subscribe({
          next: (res) => {
            this.isUploadingFormat.set(false);
            input.value = '';
            if (res.success && res.data?.format) {
              this.activeFormat.set(res.data.format);
            }
            this.toast.success(res.message || 'Raw certificate format uploaded.');
          },
          error: (err) => {
            this.isUploadingFormat.set(false);
            input.value = '';
            this.toast.error(err.error?.message || 'Failed to upload certificate format.');
          }
        });
    };
    reader.onerror = () => {
      this.isUploadingFormat.set(false);
      input.value = '';
      this.toast.error('Could not read the selected file.');
    };
    reader.readAsDataURL(file);
  }

  resetToDemoFormat(): void {
    if (this.isRemovingFormat()) return;
    this.isRemovingFormat.set(true);
    this.certService.deleteCertificateFormat().subscribe({
      next: (res) => {
        this.isRemovingFormat.set(false);
        this.activeFormat.set(null);
        this.toast.success(res.message || 'Reverted to demo certificate format.');
      },
      error: (err) => {
        this.isRemovingFormat.set(false);
        this.toast.error(err.error?.message || 'Failed to reset certificate format.');
      }
    });
  }

  private blankForm(): any {
    return {
      id: null,
      employee_id: null,
      emirates_id: '',
      company_name: '',
      certificate_type_id: null as number | null,
      scope_manual: '',
      accreditation_status: 'EIAC',
      certificate_number: '',
      work_order: '',
      code: 'GT',
      issue_date: '',
      expiry_date: '',
      status: 'Pass'
    };
  }

  loadDropdownData(): void {
    this.typeService.getActiveScopes().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.typesList.set(res.data.certificateTypes);
          const active = res.data.certificateTypes.filter(t => t.is_active);
          this.activeTypesList.set(active);
          this.eiacTypesList.set(active.filter(t => t.accreditation_status === 'EIAC'));
        }
      }
    });
  }

  private ensureEmployeesLoaded(): void {
    if (this.employeesList().length > 0) return;
    this.employeeService.getEmployees({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.employeesList.set(res.data.employees);
        }
      }
    });
  }

  loadPendingCount(): void {
    if (!this.auth.isManager()) return;
    this.certService.getCertificates({ approval: 'pending', limit: 1 }).subscribe({
      next: (res) => {
        if (res.success && res.data?.pagination) {
          this.pendingCount.set(res.data.pagination.total || 0);
        }
      },
      error: () => {
        // badge simply stays at its last value
      }
    });
  }

  loadCertificates(): void {
    this.isLoading.set(true);
    this.certService.getCertificates({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.search,
      employee_id: this.selectedEmployeeId,
      certificate_type_id: this.selectedTypeId,
      status: this.statusFilter,
      validity: this.validityTab === 'pending' ? '' : this.validityTab,
      approval: this.validityTab === 'pending' ? 'pending' : ''
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.certificates.set(res.data.certificates);
          this.totalCount.set(res.data.pagination.total);
          this.totalPages.set(res.data.pagination.totalPages);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load certificates.');
      }
    });
  }

  setValidityTab(tab: string): void {
    this.validityTab = tab;
    this.currentPage.set(1);
    this.loadCertificates();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadCertificates();
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadCertificates();
    }, 300);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadCertificates();
    }
  }

  /** 1. Emirates ID + Search → auto-fills candidate name and photo. */
  lookupCandidate(): void {
    const eid = (this.formData.emirates_id || '').trim();
    if (!eid) {
      this.modalError.set('Enter an Emirates ID first.');
      return;
    }

    this.isLookingUp.set(true);
    this.modalError.set('');

    this.employeeService.lookupCandidate(eid).subscribe({
      next: (res) => {
        this.isLookingUp.set(false);
        const candidate = res?.data?.found ? res.data.candidate : null;
        if (candidate) {
          this.formData.employee_id = candidate.id;
          this.lookupName.set(candidate.name || '');
          this.lookupPhoto.set(candidate.photo || '');
          this.candidatePhotoMissing.set(!candidate.photo);
          if (!this.formData.company_name) {
            this.formData.company_name = candidate.company || '';
          }
          if (this.candidatePhotoMissing()) {
            this.modalError.set('');
          }
        } else {
          this.formData.employee_id = null;
          this.lookupName.set('');
          this.lookupPhoto.set('');
          this.candidatePhotoMissing.set(false);
          this.modalError.set('No candidate found with that Emirates ID.');
        }
      },
      error: (err) => {
        this.isLookingUp.set(false);
        this.modalError.set(err.error?.message || 'Candidate lookup failed.');
      }
    });
  }

  /** 4. Switching between EIAC (dropdown of 7 scopes) and Non-EIAC (manual input). */
  onAccreditationChange(): void {
    if (this.formData.accreditation_status === 'EIAC') {
      this.formData.scope_manual = '';
    } else {
      this.formData.certificate_type_id = null;
    }
  }

  openCreateModal(): void {
    if (!this.auth.canManageCertificates()) return;
    this.ensureEmployeesLoaded();
    this.isEditing.set(false);
    this.modalError.set('');
    this.issuedResult.set(null);
    this.generatedNumber.set('');

    const todayStr = new Date().toISOString().substring(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().substring(0, 10);

    this.formData = {
      ...this.blankForm(),
      employee_id: this.selectedEmployeeId ? parseInt(this.selectedEmployeeId.toString(), 10) : null,
      issue_date: todayStr,
      expiry_date: nextYearStr
    };

    // Prefill from the candidate filter / detail link when available
    if (this.formData.employee_id) {
      const emp = this.employeesList().find(e => e.id === this.formData.employee_id);
      if (emp) {
        this.formData.emirates_id = emp.emirates_id || '';
        this.formData.company_name = emp.company || '';
        this.lookupName.set(emp.name || '');
        this.lookupPhoto.set(emp.photo || '');
        this.candidatePhotoMissing.set(!emp.photo);
      } else {
        this.employeeService.getEmployee(Number(this.formData.employee_id)).subscribe({
          next: (res) => {
            const fetched = res?.data?.employee;
            if (fetched) {
              this.formData.emirates_id = fetched.emirates_id || '';
              this.formData.company_name = fetched.company || '';
              this.lookupName.set(fetched.name || '');
              this.lookupPhoto.set(fetched.photo || '');
              this.candidatePhotoMissing.set(!fetched.photo);
            }
          }
        });
      }
    } else {
      this.lookupName.set('');
      this.lookupPhoto.set('');
      this.candidatePhotoMissing.set(false);
    }

    this.showModal.set(true);
    this.refreshNumberPreview();
  }

  openEditModal(cert: CertificateItem): void {
    if (!this.auth.canManageCertificates()) return;
    this.isEditing.set(true);
    this.modalError.set('');
    this.issuedResult.set(null);

    const isEiac = (cert.accreditation_status || 'EIAC') === 'EIAC';
    const hasEiacScope = isEiac && !!cert.certificate_type_id &&
      this.eiacTypesList().some(t => t.id === cert.certificate_type_id);

    this.formData = {
      ...this.blankForm(),
      id: cert.id,
      employee_id: cert.employee_id,
      emirates_id: cert.employee_emirates_id || '',
      company_name: cert.company_name || '',
      accreditation_status: hasEiacScope ? 'EIAC' : (cert.accreditation_status || 'Non-EIAC'),
      certificate_type_id: hasEiacScope ? cert.certificate_type_id : null,
      scope_manual: hasEiacScope ? '' : (cert.scope_name || cert.certificate_type_name || ''),
      certificate_number: cert.certificate_number,
      work_order: cert.work_order || '',
      code: 'GT',
      issue_date: cert.issue_date ? cert.issue_date.substring(0, 10) : '',
      expiry_date: cert.expiry_date ? cert.expiry_date.substring(0, 10) : '',
      status: cert.status
    };

    // Issued certificates keep the number they were issued with.
    this.generatedNumber.set(cert.certificate_number || '');

    this.lookupName.set(cert.employee_name || '');
    this.lookupPhoto.set(cert.employee_photo || cert.photo || '');
    this.candidatePhotoMissing.set(!this.lookupPhoto());

    this.showModal.set(true);
  }

  /** Work order / code / issue date changed — refresh the number preview. */
  onNumberInputChange(): void {
    clearTimeout(this.numberPreviewTimeout);
    this.numberPreviewTimeout = setTimeout(() => this.refreshNumberPreview(), 300);
  }

  /** Live preview of the certificate number the server would generate. */
  refreshNumberPreview(): void {
    if (this.isEditing()) {
      this.generatedNumber.set(this.formData.certificate_number || '');
      return;
    }

    const workOrder = (this.formData.work_order || '').trim();
    if (!workOrder) {
      this.generatedNumber.set('');
      this.isPreviewingNumber.set(false);
      return;
    }

    this.isPreviewingNumber.set(true);
    this.certService.getNextCertificateNumber({
      work_order: workOrder,
      code: (this.formData.code || '').trim(),
      issue_date: this.formData.issue_date || ''
    }).subscribe({
      next: (res) => {
        this.isPreviewingNumber.set(false);
        this.generatedNumber.set(res?.certificate_number || '');
      },
      error: () => {
        // The preview never blocks typing — the server generates the final number.
        this.isPreviewingNumber.set(false);
        this.generatedNumber.set('');
      }
    });
  }

  closeModal(): void {
    clearTimeout(this.numberPreviewTimeout);
    this.showModal.set(false);
    this.issuedResult.set(null);
  }

  closeResultPanel(): void {
    this.showModal.set(false);
    this.issuedResult.set(null);
    this.loadCertificates();
    this.loadPendingCount();
  }

  statusBadgeClass(status?: string): string {
    if (status === 'Pass') return 'badge-pass';
    return 'badge-fail';
  }

  approvalBadgeClass(approval?: string): string {
    return approval === 'approved' ? 'badge-active' : 'badge-expiring';
  }

  approvalLabel(approval?: string): string {
    return approval === 'approved' ? 'Approved' : 'Pending';
  }

  saveCertificate(): void {
    if (!this.auth.canManageCertificates()) return;
    if (!this.isEditing() && !this.formData.employee_id) {
      this.modalError.set('Search for a candidate by Emirates ID first.');
      return;
    }
    if (!this.isEditing() && this.candidatePhotoMissing()) {
      this.modalError.set('Add a photo to this candidate first.');
      return;
    }

    if (!this.formData.accreditation_status) {
      this.modalError.set('Accreditation Status is required.');
      return;
    }

    const isNonEiac = this.formData.accreditation_status === 'Non-EIAC';

    if (isNonEiac) {
      if (!this.formData.scope_manual || !this.formData.scope_manual.trim()) {
        this.modalError.set('Please enter the Non-EIAC certification scope.');
        return;
      }
    } else if (this.formData.certificate_type_id === null || this.formData.certificate_type_id === undefined) {
      this.modalError.set('Please select an EIAC certification scope.');
      return;
    }

    if (!this.formData.company_name || !this.formData.company_name.trim()) {
      this.modalError.set('Company Name is required.');
      return;
    }
    if (!this.formData.status) {
      this.modalError.set('Certification Status is required.');
      return;
    }
    if (!this.isEditing() && !(this.formData.work_order || '').trim()) {
      this.modalError.set('Work Order is required.');
      return;
    }
    if (!this.formData.issue_date || !this.formData.expiry_date) {
      this.modalError.set('Both issue date and expiry date are required.');
      return;
    }
    if (new Date(this.formData.expiry_date) <= new Date(this.formData.issue_date)) {
      this.modalError.set('Expiry date must be after the issue date.');
      return;
    }

    const selectedScope = this.eiacTypesList().find(t => t.id === Number(this.formData.certificate_type_id))
      || this.typesList().find(t => t.id === Number(this.formData.certificate_type_id));
    const payload: any = {
      employee_id: this.formData.employee_id,
      certificate_type_id: isNonEiac ? null : Number(this.formData.certificate_type_id),
      scope_name: isNonEiac ? this.formData.scope_manual.trim() : (selectedScope?.name || ''),
      accreditation_status: this.formData.accreditation_status,
      work_order: (this.formData.work_order || '').trim(),
      code: (this.formData.code || '').trim().toUpperCase(),
      issue_date: this.formData.issue_date,
      expiry_date: this.formData.expiry_date,
      status: this.formData.status,
      company_name: this.formData.company_name.trim()
    };

    // On edit the issued number is kept; on issue the server generates it.
    if (this.isEditing()) {
      payload.certificate_number = (this.formData.certificate_number || '').trim();
    }

    this.isSaving.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.formData.id) {
      this.certService.updateCertificate(this.formData.id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Certificate updated successfully.');
          this.loadCertificates();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to update certificate.');
        }
      });
    } else {
      this.certService.createCertificate(payload).subscribe({
        next: (res: any) => {
          this.isSaving.set(false);
          const newId = res?.data?.id ?? res?.data?.certificate?.id;
          const issuedNumber = res?.data?.certificate_number || this.generatedNumber() || '';
          this.issuedResult.set({
            id: newId,
            number: issuedNumber
          });
          this.toast.success('Certificate issued — pending approval.');
          this.loadCertificates();
          this.loadPendingCount();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to issue certificate.');
        }
      });
    }
  }

  /** Approval is only offered to certification managers. */
  approveCert(cert: CertificateItem, event?: Event): void {
    event?.stopPropagation();
    if (!this.auth.isManager()) return;

    this.certService.approveCertificate(cert.id).subscribe({
      next: () => {
        this.toast.success('Certificate approved.');
        this.loadCertificates();
        this.loadPendingCount();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to approve certificate.');
      }
    });
  }

  confirmDelete(cert: CertificateItem): void {
    if (!this.auth.canManageCertificates()) return;
    this.selectedCert.set(cert);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) return;
    this.showDeleteModal.set(false);
    this.selectedCert.set(null);
  }

  executeDelete(): void {
    const cert = this.selectedCert();
    if (!cert || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.certService.deleteCertificate(cert.id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.selectedCert.set(null);
        this.toast.success(res.message);
        this.loadCertificates();
        this.loadPendingCount();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.error(err.error?.message || 'Failed to delete certificate.');
      }
    });
  }
}
