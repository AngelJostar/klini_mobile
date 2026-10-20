<?php

use App\Http\Controllers\Patient\PatientPortalController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function (): void {
    Route::get('/patient', PatientPortalController::class)
        ->middleware('role:superadmin,admin,patient')
        ->name('patient.dashboard');
    Route::post('/patient/register-attachments', [PatientPortalController::class, 'storeRegisterAttachment'])
        ->middleware('role:superadmin,admin,patient')
        ->name('patient.register_attachments.store');
    Route::get('/patient/register-attachments/{document}', [PatientPortalController::class, 'downloadRegisterAttachment'])
        ->middleware('role:superadmin,admin,patient')
        ->name('patient.register_attachments.download');
    Route::patch('/patient/profile', [PatientPortalController::class, 'updateProfile'])
        ->middleware('role:superadmin,admin,patient')
        ->name('patient.profile.update');
    Route::post('/patient/insurance', [PatientPortalController::class, 'saveInsurance'])
        ->middleware('role:superadmin,admin,patient')
        ->name('patient.insurance.save');
    Route::post('/patient/appointments', [PatientPortalController::class, 'storeAppointment'])
        ->middleware('role:superadmin,admin,patient')
        ->name('patient.appointments.store');
});
