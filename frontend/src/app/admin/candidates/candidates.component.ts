import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EmployeeService, Employee } from '../../core/services/employee.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './candidates.component.html',
  styleUrls: ['./candidates.component.scss']
})
export class CandidatesComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private toast = inject(ToastService);
  private router = inject(Router);
  public auth = inject(AuthService);

  public candidates = signal<Employee[]>([]);
  public totalCount = signal<number>(0);
  public currentPage = signal<number>(1);
  public totalPages = signal<number>(1);
  public pageSize = 10;
  public search = '';
  public statusFilter = '';
  public isLoading = signal<boolean>(false);

  // Modal State
  public showModal = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public isSaving = signal<boolean>(false);
  public modalError = signal<string>('');

  // Photo upload state (base64 data URL preview)
  public photoPreview = signal<string>('');
  private pendingPhoto: string | null = null;

  // Confirm Modal State
  public showConfirmModal = signal<boolean>(false);
  public selectedCandidate = signal<Employee | null>(null);

  // Delete Modal State
  public showDeleteModal = signal<boolean>(false);
  public isDeleting = signal<boolean>(false);

  // Form Data
  public formData: Partial<Employee> = this.blankForm();

  private searchTimeout: any;

  ngOnInit(): void {
    this.loadCandidates();
  }

  private blankForm(): Partial<Employee> {
    return {
      name: '',
      email: '',
      phone: '',
      emirates_id: '',
      job_title: '',
      date_of_birth: '',
      nationality: '',
      gender: undefined,
      is_active: 1,
      address: '',
      company: ''
    };
  }

  loadCandidates(): void {
    this.isLoading.set(true);
    this.employeeService.getEmployees({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.search,
      status: this.statusFilter
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.candidates.set(res.data.employees);
          this.totalCount.set(res.data.pagination.total);
          this.totalPages.set(res.data.pagination.totalPages);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load candidates.');
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1);
      this.loadCandidates();
    }, 300);
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadCandidates();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadCandidates();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.modalError.set('');
    this.formData = this.blankForm();
    this.photoPreview.set('');
    this.pendingPhoto = null;
    this.showModal.set(true);
  }

  openEditModal(emp: Employee): void {
    if (!this.auth.canModifyRecords()) return;
    this.isEditing.set(true);
    this.modalError.set('');
    this.formData = {
      id: emp.id,
      name: emp.name,
      email: emp.email || '',
      phone: emp.phone || '',
      emirates_id: emp.emirates_id,
      job_title: emp.job_title || '',
      date_of_birth: emp.date_of_birth ? emp.date_of_birth.substring(0, 10) : '',
      nationality: emp.nationality || '',
      gender: emp.gender,
      is_active: emp.is_active ? 1 : 0,
      address: emp.address || '',
      company: emp.company || ''
    };
    this.photoPreview.set(emp.photo || '');
    this.pendingPhoto = null;
    this.showModal.set(true);

    // Fetch full candidate profile on demand for detail-only fields (DOB, nationality, gender, address)
    this.employeeService.getEmployee(emp.id).subscribe({
      next: (res) => {
        const full = res?.data?.employee;
        if (full && this.isEditing() && this.formData.id === emp.id) {
          this.formData = {
            ...this.formData,
            date_of_birth: full.date_of_birth ? full.date_of_birth.substring(0, 10) : '',
            nationality: full.nationality || '',
            gender: full.gender,
            address: full.address || ''
          };
        }
      }
    });
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  /** Photo * (create) — base64 file input with live preview. */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.modalError.set('Photo must be an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.photoPreview.set(dataUrl);
      this.pendingPhoto = dataUrl;
      this.formData.photo = dataUrl;
      this.modalError.set('');
    };
    reader.onerror = () => {
      this.modalError.set('Could not read the selected photo file.');
    };
    reader.readAsDataURL(file);
    // allow re-selecting the same file later
    input.value = '';
  }

  clearPhoto(): void {
    this.photoPreview.set('');
    this.pendingPhoto = null;
    this.formData.photo = undefined;
  }

  saveCandidate(): void {
    const eidRegex = /^784-\d{4}-\d{7}-\d$/;
    if (!this.formData.name || !this.formData.name.trim() || !this.formData.emirates_id || !this.formData.emirates_id.trim()) {
      this.modalError.set('Please fill out all required fields marked with *');
      return;
    }

    if (!eidRegex.test(this.formData.emirates_id.trim())) {
      this.modalError.set('Emirates ID must strictly match format 784-YYYY-XXXXXXX-X');
      return;
    }

    if (!this.isEditing() && !this.pendingPhoto) {
      this.modalError.set('Photo is required for a new candidate.');
      return;
    }

    this.isSaving.set(true);
    this.modalError.set('');

    const payload: Partial<Employee> = { ...this.formData };
    if (this.pendingPhoto) payload.photo = this.pendingPhoto;

    if (this.isEditing() && this.formData.id) {
      this.employeeService.updateEmployee(this.formData.id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Candidate updated successfully.');
          this.loadCandidates();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to update candidate.');
        }
      });
    } else {
      this.employeeService.createEmployee(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showModal.set(false);
          this.toast.success('Candidate created successfully.');
          this.loadCandidates();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.modalError.set(err.error?.message || 'Failed to create candidate.');
        }
      });
    }
  }

  goToDetail(emp: Employee): void {
    this.router.navigate(['/admin/candidates', emp.id]);
  }

  confirmToggleStatus(emp: Employee, event?: Event): void {
    event?.stopPropagation();
    if (!this.auth.canModifyRecords()) return;
    this.selectedCandidate.set(emp);
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.selectedCandidate.set(null);
  }

  executeToggleStatus(): void {
    const emp = this.selectedCandidate();
    if (!emp) return;

    this.employeeService.toggleStatus(emp.id).subscribe({
      next: (res) => {
        this.closeConfirmModal();
        this.toast.success(res.message);
        this.loadCandidates();
      },
      error: (err) => {
        this.closeConfirmModal();
        this.toast.error(err.error?.message || 'Failed to update candidate status.');
      }
    });
  }

  confirmDelete(emp: Employee, event?: Event): void {
    event?.stopPropagation();
    if (!this.auth.canModifyRecords()) return;
    this.selectedCandidate.set(emp);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) return;
    this.showDeleteModal.set(false);
    this.selectedCandidate.set(null);
  }

  executeDelete(): void {
    const emp = this.selectedCandidate();
    if (!emp || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.employeeService.deleteEmployee(emp.id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.showDeleteModal.set(false);
        this.selectedCandidate.set(null);
        this.toast.success(res.message);
        this.loadCandidates();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.error(err.error?.message || 'Failed to delete candidate.');
      }
    });
  }
}
