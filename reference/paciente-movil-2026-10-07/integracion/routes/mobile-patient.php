<?php

use App\Http\Controllers\Api\Mobile\V1\AuthController as MobileAuthController;
use App\Http\Controllers\Api\Mobile\V1\MobileDeviceController;
use App\Http\Controllers\Api\Mobile\V1\PasswordController;
use App\Http\Controllers\Api\Mobile\V1\PatientReadController;
use Illuminate\Support\Facades\Route;

Route::prefix('mobile/v1')
    ->name('api.mobile.v1.')
    ->middleware('throttle:mobile-api')
    ->group(function (): void {
        Route::post('auth/login', [MobileAuthController::class, 'login'])
            ->middleware('throttle:mobile-login')
            ->name('auth.login');
        Route::post('auth/forgot-password', [PasswordController::class, 'forgot'])
            ->middleware('throttle:mobile-login')
            ->name('auth.password.forgot');
        Route::post('auth/reset-password', [PasswordController::class, 'reset'])
            ->middleware('throttle:mobile-login')
            ->name('auth.password.reset');

        Route::middleware(['auth:sanctum', 'mobile.role:patient,doctor'])->group(function (): void {
            Route::get('me', [MobileAuthController::class, 'me'])->name('me');
            Route::get('auth/sessions', [MobileAuthController::class, 'sessions'])->name('auth.sessions.index');
            Route::delete('auth/sessions/{token}', [MobileAuthController::class, 'revokeSession'])
                ->whereNumber('token')
                ->name('auth.sessions.destroy');
            Route::post('auth/logout', [MobileAuthController::class, 'logout'])->name('auth.logout');
            Route::put('auth/password', [PasswordController::class, 'change'])->name('auth.password.change');
            Route::put('devices/push', [MobileDeviceController::class, 'store'])->name('devices.push.store');
            Route::delete('devices/push', [MobileDeviceController::class, 'destroy'])->name('devices.push.destroy');

            Route::prefix('patient')
                ->middleware('mobile.role:patient')
                ->name('patient.')
                ->group(function (): void {
                    Route::get('dashboard', [PatientReadController::class, 'dashboard'])->name('dashboard');
                    Route::get('profile', [PatientReadController::class, 'profile'])->name('profile');
                    Route::patch('profile', [PatientReadController::class, 'updateProfile'])->name('profile.update');
                    Route::get('appointments', [PatientReadController::class, 'appointments'])->name('appointments.index');
                    Route::get('appointments/{appointment}', [PatientReadController::class, 'appointment'])->whereNumber('appointment')->name('appointments.show');
                    Route::get('clinical-records', [PatientReadController::class, 'clinicalRecords'])->name('clinical-records.index');
                    Route::get('prescriptions', [PatientReadController::class, 'prescriptions'])->name('prescriptions.index');
                    Route::get('documents', [PatientReadController::class, 'documents'])->name('documents.index');
                    Route::get('documents/{document}/download', [PatientReadController::class, 'downloadDocument'])
                        ->whereNumber('document')
                        ->name('documents.download');
                });

        });
    });

