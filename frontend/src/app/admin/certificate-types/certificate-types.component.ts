import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CertificateTypeService, CertificateType } from '../../core/services/certificate-type.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-certificate-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './certificate-types.component.html',
  styleUrls: ['./certificate-types.component.scss']
})
export class CertificateTypesComponent implements OnInit {
  private typeService = inject(CertificateTypeService);
  private toast = inject(ToastService);

  public types = signal<CertificateType[]>([]);
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
  public selectedType = signal<CertificateType | null>(null);

  public formData: Partial<CertificateType> = {
    name: '',
    category: '',
    description: '',
    scope: '',
    is_active: 1
  };

  private searchTimeout: any;

  ngOnInit(): void {
    this.loadCertificateTypes();
  }

  loadCertificateTypes(): void {
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
          this.types.set(res.data.certificateTypes);
          if (res.data.pagination) {
            this.totalCount.set(res.data.pagination.total);
            this.totalPages.set(res.data.pagination.totalPages);
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load certificate types.');
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadCertificateTypes();
    }, 300);
  }

  onStatusChange(): void {
    this.currentPage.set(1);
    this.loadCertificateTypes();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadCertificateTypes();
    }
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.modalError.set('');
    this.formData = {
      name: '',
      category: '',
      description: '',
      scope: '',
      is_active: 1
    };
    this.showModal.set(true);
  }

  openEditModal(ct: CertificateType): void {
    this.isEditing.set(true);
    this.modalError.set('');
    this.formData = {
      id: ct.id,
      name: ct.name,
      category: ct.category || '',
      description: ct.description || '',
      scope: ct.scope || '',
      is_active: ct.is_active ? 1 : 0
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveCertificateType(): void {
    if (!this.formData.name || !this.formData.name.trim()) {
      this.modalError.set('Certificate Type Name is required.');
      return;
    }

    this.isSaving.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.formData.id) {
      this.typeService.updateCertificateType(this.formData.id, this.formData).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Certificate type updated successfully.');
          this.loadCertificateTypes();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to update certificate type.');
        }
      });
    } else {
      this.typeService.createCertificateType(this.formData).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Certificate type created successfully.');
          this.loadCertificateTypes();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to create certificate type.');
        }
      });
    }
  }

  confirmToggleStatus(ct: CertificateType): void {
    this.selectedType.set(ct);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.selectedType.set(null);
  }

  executeToggleStatus(): void {
    const ct = this.selectedType();
    if (!ct) return;

    this.typeService.toggleStatus(ct.id).subscribe({
      next: (res) => {
        this.closeConfirmModal();
        this.toast.success(res.message);
        this.loadCertificateTypes();
      },
      error: (err) => {
        this.closeConfirmModal();
        this.toast.error(err.error?.message || 'Failed to toggle status.');
      }
    });
  }
}

