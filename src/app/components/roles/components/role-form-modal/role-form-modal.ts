import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-role-form-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './role-form-modal.html',
  styleUrl: './role-form-modal.scss',
})
export class RoleFormModal {
  role = input<any>(null);
  allPermissions = input<any[]>([]);
  close = output<void>();
  save = output<any>();

  name = signal('');
  description = signal('');
  selectedPermissions = signal<string[]>([]);
  dropdownOpen = signal(false);
  permSearch = signal('');

  constructor() {
    effect(() => {
      const r = this.role();
      if (r) {
        this.name.set(r.name || '');
        this.description.set(r.description || '');
        this.selectedPermissions.set(r.permissions || []);
      } else {
        this.name.set('');
        this.description.set('');
        this.selectedPermissions.set([]);
      }
    });
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
    if (this.dropdownOpen()) {
      this.permSearch.set('');
    }
  }

  togglePermission(permName: string): void {
    this.selectedPermissions.update((list) =>
      list.includes(permName) ? list.filter((p) => p !== permName) : [...list, permName]
    );
  }

  filteredPermissions(): any[] {
    const s = this.permSearch().toLowerCase();
    return this.allPermissions().filter((p: any) => p.name?.toLowerCase().includes(s));
  }

  onSave(): void {
    this.save.emit({
      name: this.name(),
      description: this.description(),
      permissions: this.selectedPermissions(),
    });
  }
}
