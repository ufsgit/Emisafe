import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CertificateTypeService, CertificateType } from '../../core/services/certificate-type.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-scopes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './scopes.component.html',
  styleUrls: ['./scopes.component.scss']
})
export class ScopesComponent implements OnInit {
  private typeService = inject(CertificateTypeService);
  private toast = inject(ToastService);
  public auth = inject(AuthService);

  public scopes = signal<CertificateType[]>([]);
  public search = '';
  public statusFilter = '';
  public isLoading = signal<boolean>(false);

  // Pagination (server-side)
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public totalCount = signal<number>(0);
  public pageSize = 10;

  // Modal
  public showModal = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalError = signal<string>('');

  // Confirm Modal
  public showConfirmModal = signal<boolean>(false);
  public selectedScope = signal<CertificateType | null>(null);

  public accreditationOptions = ['EIAC', 'Non-EIAC'];

  /** The 7 official EIAC certification scopes. */
  public eiacScopeOptions = [
    'Signal Man',
    'Rigger Level 1',
    'Rigger Level 2',
    'Forklift Operator',
    'EOT Crane Operator',
    'Mobile Crane Operator',
    'Tower Crane Operator'
  ];

  /** Selected EIAC scope name from the 7 official options. */
  public selectedEiacScope = '';
  /** Manual scope name for Non-EIAC. */
  public scopeName = '';

  public formData: Partial<CertificateType> = {
    accreditation_status: 'EIAC',
    is_active: 1
  };

  private searchTimeout: any;

  ngOnInit(): void {
    this.loadScopes();
  }

  loadScopes(): void {
    this.isLoading.set(true);
    this.typeService.getCertificateTypes({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.search,
      status: this.statusFilter
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.scopes.set(res.data.certificateTypes);
          if (res.data.pagination) {
            this.totalCount.set(res.data.pagination.total);
            this.totalPages.set(res.data.pagination.totalPages);
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load certification scopes.');
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadScopes();
    }, 300);
  }

  onStatusChange(): void {
    this.currentPage.set(1);
    this.loadScopes();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadScopes();
    }
  }

  onAccreditationChange(): void {
    if (this.formData.accreditation_status === 'EIAC') {
      this.scopeName = '';
    } else {
      this.selectedEiacScope = '';
    }
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.modalError.set('');
    this.formData = {
      accreditation_status: 'EIAC',
      is_active: 1
    };
    this.selectedEiacScope = '';
    this.scopeName = '';
    this.showModal.set(true);
  }

  openEditModal(ct: CertificateType): void {
    if (!this.auth.canModifyRecords()) return;
    this.isEditing.set(true);
    this.modalError.set('');
    const acc = ct.accreditation_status || 'EIAC';
    this.formData = {
      id: ct.id,
      accreditation_status: acc,
      is_active: ct.is_active ? 1 : 0
    };

    if (acc === 'EIAC') {
      this.selectedEiacScope = ct.name || '';
      this.scopeName = '';
    } else {
      this.selectedEiacScope = '';
      this.scopeName = ct.name || '';
    }

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveScope(): void {
    const accreditation = this.formData.accreditation_status;

    if (!accreditation) {
      this.modalError.set('Accreditation Status is required.');
      return;
    }

    let name = '';
    if (accreditation === 'EIAC') {
      name = (this.selectedEiacScope || '').trim();
      if (!name) {
        this.modalError.set('Please select one of the 7 EIAC scopes.');
        return;
      }
    } else {
      name = (this.scopeName || '').trim();
      if (!name) {
        this.modalError.set('Please enter the Non-EIAC scope name.');
        return;
      }
    }

    const payload: Partial<CertificateType> = {
      name,
      accreditation_status: accreditation,
      is_active: this.formData.is_active
    };

    this.isSaving.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.formData.id) {
      this.typeService.updateCertificateType(this.formData.id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Certification scope updated successfully.');
          this.loadScopes();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to update certification scope.');
        }
      });
    } else {
      this.typeService.createCertificateType(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Certification scope created successfully.');
          this.loadScopes();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to create certification scope.');
        }
      });
    }
  }

  confirmToggleStatus(ct: CertificateType): void {
    if (!this.auth.canModifyRecords()) return;
    this.selectedScope.set(ct);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.selectedScope.set(null);
  }

  executeToggleStatus(): void {
    const ct = this.selectedScope();
    if (!ct) return;

    this.typeService.toggleStatus(ct.id).subscribe({
      next: (res) => {
        this.closeConfirmModal();
        this.toast.success(res.message);
        this.loadScopes();
      },
      error: (err) => {
        this.closeConfirmModal();
        this.toast.error(err.error?.message || 'Failed to toggle status.');
      }
    });
  }
}
