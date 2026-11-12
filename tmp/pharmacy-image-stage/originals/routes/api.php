<?php

use App\Http\Controllers\Api\DashboardSummaryController;
use App\Http\Controllers\Api\Insurance\InsuranceApiController;
use App\Http\Controllers\Api\Integrations\CbtaWebhookController;
use App\Http\Controllers\Api\Mobile\V1\AuthController as MobileAuthController;
use App\Http\Controllers\Api\Mobile\V1\DoctorController;
use App\Http\Controllers\Api\Mobile\V1\MixtureRequestController;
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
                    Route::get('insurance-plans', [\App\Http\Controllers\Patient\InsurancePlanFeedController::class, 'index'])->name('insurance-plans.index');
                    Route::get('insurance-plan-documents/{document}', [\App\Http\Controllers\Patient\InsurancePlanFeedController::class, 'document'])->whereNumber('document')->name('insurance-plans.documents');
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

            Route::prefix('doctor')
                ->middleware('mobile.role:doctor')
                ->name('doctor.')
                ->group(function (): void {
                    Route::get('dashboard', [DoctorController::class, 'dashboard'])->name('dashboard');
                    Route::get('appointments', [DoctorController::class, 'appointments'])->name('appointments.index');
                    Route::get('appointments/{appointment}', [DoctorController::class, 'appointment'])->whereNumber('appointment')->name('appointments.show');
                    Route::patch('appointments/{appointment}', [DoctorController::class, 'updateAppointment'])->whereNumber('appointment')->name('appointments.update');
                    Route::get('patients', [DoctorController::class, 'patients'])->name('patients.index');
                    Route::get('patients/{patient}', [DoctorController::class, 'patient'])->whereNumber('patient')->name('patients.show');
                    Route::post('patients/{patient}/clinical-records', [DoctorController::class, 'storeClinicalRecord'])->whereNumber('patient')->name('clinical-records.store');
                    Route::get('prescriptions', [DoctorController::class, 'prescriptions'])->name('prescriptions.index');
                    Route::post('prescriptions', [DoctorController::class, 'storePrescription'])->name('prescriptions.store');
                    Route::get('requests', [DoctorController::class, 'requests'])->name('requests.index');
                    Route::post('requests/laboratory', [DoctorController::class, 'storeLabRequest'])->name('requests.laboratory.store');
                    Route::get('mixtures/catalogs/{type}', [MixtureRequestController::class, 'catalog'])->name('mixtures.catalogs.show');
                    Route::post('mixtures/prevalidate', [MixtureRequestController::class, 'prevalidate'])->name('mixtures.prevalidate');
                    Route::post('mixtures', [MixtureRequestController::class, 'store'])->name('mixtures.store');
                    Route::get('mixtures/{providerRequest}', [MixtureRequestController::class, 'show'])->whereNumber('providerRequest')->name('mixtures.show');
                });
        });
    });

Route::middleware(['web', 'auth'])->get('/dashboard-summary', DashboardSummaryController::class);

Route::post('/integrations/cbta/mixture-status', CbtaWebhookController::class)
    ->name('api.integrations.cbta.mixture-status');

Route::middleware(['web', 'auth'])
    ->prefix('insurance')
    ->name('api.insurance.')
    ->group(function (): void {
        Route::get('dashboard', [InsuranceApiController::class, 'dashboard'])->name('dashboard');
        Route::get('reports', [InsuranceApiController::class, 'reports'])->name('reports');
        Route::get('patients', [InsuranceApiController::class, 'patients'])->name('patients.index');
        Route::post('patients', [InsuranceApiController::class, 'storePatient'])->name('patients.store');
        Route::get('patients/{patient}', [InsuranceApiController::class, 'patient'])->name('patients.show');
        Route::post('diagnoses', [InsuranceApiController::class, 'storeDiagnosis'])->name('diagnoses.store');
        Route::post('treatments', [InsuranceApiController::class, 'storeTreatment'])->name('treatments.store');
        Route::post('deliveries', [InsuranceApiController::class, 'storeDelivery'])->name('deliveries.store');
        Route::patch('deliveries/{delivery}', [InsuranceApiController::class, 'updateDelivery'])->name('deliveries.update');
        Route::post('hospitalizations', [InsuranceApiController::class, 'storeHospitalization'])->name('hospitalizations.store');
        Route::post('hospitalization-notes', [InsuranceApiController::class, 'storeDailyNote'])->name('hospitalization-notes.store');
        Route::post('invoices', [InsuranceApiController::class, 'storeInvoice'])->name('invoices.store');
        Route::post('authorizations', [InsuranceApiController::class, 'storeAuthorization'])->name('authorizations.store');
        Route::post('documents', [InsuranceApiController::class, 'storeDocument'])->name('documents.store');
    });

Route::prefix('mobile/v1/pharmacy')->name('api.mobile.v1.pharmacy.')->middleware('throttle:mobile-api')->group(function (): void {
    $controller = \App\Http\Controllers\Api\Mobile\V1\PharmacyStoreController::class;
    Route::get('catalog', [$controller, 'catalog'])->name('catalog');
    Route::get('settings', [$controller, 'settings'])->name('settings');
    Route::get('products', [$controller, 'products'])->name('products');
    Route::get('products/{product}', [$controller, 'product'])->whereNumber('product')->name('product');
    Route::middleware(['auth:sanctum', 'mobile.role:patient'])->group(function () use ($controller): void {
        Route::post('prescription-uploads', [\App\Http\Controllers\Api\Mobile\V1\PharmacyPrescriptionUploadController::class, 'store'])->middleware('throttle:10,1')->name('prescription-uploads.store');
        Route::get('prescription-uploads/{upload}/file', [\App\Http\Controllers\Api\Mobile\V1\PharmacyPrescriptionUploadController::class, 'download'])->whereNumber('upload')->name('prescription-uploads.download');
        Route::get('orders', [$controller, 'orders'])->name('orders');
        Route::post('orders', [$controller, 'storeOrder'])->name('orders.store');
        Route::get('orders/{order}', [$controller, 'order'])->whereNumber('order')->name('order');
    });
});
