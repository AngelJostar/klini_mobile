<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Community\CommunityActivityController as Activity;
use App\Http\Controllers\Wallet\TokenWalletController;
Route::middleware('auth')->group(function () {
    Route::view('/social', 'social.index')->name('social.home');
    Route::view('/social/admin', 'social.admin')->middleware('can:manage-social-communities');
    Route::get('/wallet/tokens', [TokenWalletController::class, 'show'])->name('wallet.tokens');
    Route::prefix('communities/activities')->group(function () {
        Route::get('/', [Activity::class, 'index']);
        Route::post('/', [Activity::class, 'store']);
        Route::get('/{activity}/image', [Activity::class, 'image'])->name('community.activities.image');
        Route::get('/{activity}/attendees', [Activity::class, 'attendees']);
        Route::patch('/{activity}', [Activity::class, 'publish']);
        Route::post('/{activity}/reservation', [Activity::class, 'reserve']);
        Route::delete('/{activity}/reservation', [Activity::class, 'cancel']);
    });
});
