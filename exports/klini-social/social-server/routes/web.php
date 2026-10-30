<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/social');

// Passwordless test accounts are available only in the local environment.
Route::get('/login', function () {
    abort_unless(app()->environment('local'), 404);
    return view('social.local-login');
})->name('login');

Route::post('/local-login', function (Request $request) {
    abort_unless(app()->environment('local'), 404);
    $data = $request->validate(['account' => ['required', 'in:member,admin']]);
    Auth::login(User::where('email', $data['account'].'@social.test')->firstOrFail());
    $request->session()->regenerate();
    return redirect($data['account'] === 'admin' ? '/social/admin' : '/social');
});

Route::post('/logout', function (Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect('/login');
})->middleware('auth');

require __DIR__.'/social.php';
