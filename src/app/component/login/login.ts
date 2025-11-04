import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { set } from 'lodash';
import { LoginService } from './service/loginservice';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  hidePassword: boolean = true;
  errorMessage: string | null = null;
  isLoading: boolean = false;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private _login: LoginService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    this.isLoading = true;
    const req = {
      username: this.loginForm.value.username,
      password: this.loginForm.value.password,
    };
    console.log("req",req);
    this._login.loginSSO(req).subscribe({
      next: (data) => {
        console.log('✅ Login success:', data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        localStorage.setItem('UserName', data.NAMFIRSTE + ' ' + data.NAMLASTE);
        this.isLoading = false;
        this.router.navigate(['/manage']);
      },
      error: (err) => {
        console.error('❌ Login failed:', err);
        this.isLoading = false;
      },
    });
  }

  intoDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
