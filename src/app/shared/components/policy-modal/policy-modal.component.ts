import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './policy-modal.component.html',
  styleUrl: './policy-modal.component.scss'
})
export class PolicyModalComponent {
  public policyService = inject(PolicyService);

  get isOpen(): boolean {
    return this.policyService.isOpen();
  }

  get isMandatory(): boolean {
    return this.policyService.isMandatory();
  }

  onAccept() {
    this.policyService.accept();
  }

  onClose() {
    if (!this.isMandatory) {
      this.policyService.close();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.isMandatory) {
      this.onClose();
    }
  }
}
