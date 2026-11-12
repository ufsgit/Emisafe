import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CertificateService, CertificateItem } from '../../core/services/certificate.service';
import { EmployeeService, Employee } from '../../core/services/employee.service';
import { CertificateTypeService, CertificateType } from '../../core/services/certificate-type.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './certificates.component.html',
  styleUrls: ['./certificates.component.scss']
})
export class CertificatesComponent implements OnInit {
  private certService = inject(CertificateService);
  private employeeService = inject(EmployeeService);
  private typeService = inject(CertificateTypeService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  public certificates = signal<CertificateItem[]>([]);
  public employeesList = signal<Employee[]>([]);
  public typesList = signal<CertificateType[]>([]);
  public activeTypesList = signal<CertificateType[]>([]);

  public totalCount = signal<number>(0);
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public pageSize = 10;

  // Filters
  public search = '';
  public selectedEmployeeId: number | string = '';
  public selectedTypeId: number | string = '';
  public statusFilter = '';
  public validityTab = 'all'; // 'all', 'expired', 'expiring_soon'
  public isLoading = signal<boolean>(false);

  // Modal
  public showModal = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalError = signal<string>('');

  // Delete Modal
  public showDeleteModal = signal<boolean>(false);
  public selectedCert = signal<CertificateItem | null>(null);
  public isDeleting = signal<boolean>(false);

  public formData: any = {
    employee_id: null,
    certificate_type_id: null,
    certificate_number: '',
    issue_date: '',
    expiry_date: '',
    status: 'Pass',
    description: '',
    scope: ''
  };

  private searchTimeout: any;

  ngOnInit(): void {
    // Check query params (e.g. from dashboard or employee detail)
    this.route.queryParams.subscribe(params => {
      if (params['validity']) {
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
  }

  loadDropdownData(): void {
    this.employeeService.getEmployees({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.employeesList.set(res.data.employees);
        }
      }
    });

    this.typeService.getCertificateTypes({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.typesList.set(res.data.certificateTypes);
          this.activeTypesList.set(res.data.certificateTypes.filter(t => t.is_active));
        }
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
      validity: this.validityTab
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

  generateCertNumber(): void {
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.formData.certificate_number = `CERT-${currentYear}-${randomNum}`;
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.modalError.set('');

    const todayStr = new Date().toISOString().substring(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().substring(0, 10);

    this.formData = {
      employee_id: this.selectedEmployeeId ? parseInt(this.selectedEmployeeId.toString(), 10) : null,
      certificate_type_id: null,
      certificate_number: '',
      issue_date: todayStr,
      expiry_date: nextYearStr,
      status: 'Pass',
      description: '',
      scope: ''
    };
    this.generateCertNumber();
    this.showModal.set(true);
  }

  openEditModal(cert: CertificateItem): void {
    this.isEditing.set(true);
    this.modalError.set('');
    this.formData = {
      id: cert.id,
      employee_id: cert.employee_id,
      certificate_type_id: cert.certificate_type_id,
      certificate_number: cert.certificate_number,
      issue_date: cert.issue_date.substring(0, 10),
      expiry_date: cert.expiry_date.substring(0, 10),
      status: cert.status,
      description: cert.description || '',
      scope: cert.scope || ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveCertificate(): void {
    if (!this.formData.employee_id) {
      this.modalError.set('Please select an employee.');
      return;
    }
    if (!this.formData.certificate_type_id) {
      this.modalError.set('Please select a certificate type.');
      return;
    }
    if (!this.formData.certificate_number || !this.formData.certificate_number.trim()) {
      this.modalError.set('Certificate number is required.');
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

    this.isSaving.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.formData.id) {
      this.certService.updateCertificate(this.formData.id, this.formData).subscribe({
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
      this.certService.createCertificate(this.formData).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Certificate issued successfully.');
          this.loadCertificates();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to issue certificate.');
        }
      });
    }
  }

  confirmDelete(cert: CertificateItem): void {
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
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.error(err.error?.message || 'Failed to delete certificate.');
      }
    });
  }
}

