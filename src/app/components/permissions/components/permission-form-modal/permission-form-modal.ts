import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-permission-form-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-form-modal.html',
  styleUrl: './permission-form-modal.scss',
})
export class PermissionFormModal {
  permission = input<any>(null);
  close = output<void>();
  save = output<any>();

  name = signal('');
  description = signal('');

  constructor() {
    effect(() => {
      const p = this.permission();
      if (p) {
        this.name.set(p.name || '');
        this.description.set(p.description || '');
      } else {
        this.name.set('');
        this.description.set('');
      }
    });
  }

  onSave(): void {
    this.save.emit({
      name: this.name(),
      description: this.description(),
    });
  }
}
