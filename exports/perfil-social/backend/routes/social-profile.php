<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Require from routes/web.php so session cookies and CSRF protection apply.
Route::middleware('auth')->group(function () {
    Route::get('/social/profile', function (Request $request) {
        return response()->json(['user' => $request->user()->only(['id', 'name'])])->header('Cache-Control', 'private, no-store');
    });
    Route::put('/social/profile', function (Request $request) {
        $data = $request->validate(['name' => ['required', 'string', 'max:255']]);
        $request->user()->forceFill(['name' => $data['name']])->save();
        return response()->json(['user' => $request->user()->only(['id', 'name'])])->header('Cache-Control', 'private, no-store');
    });
    Route::post('/social/logout', function (Request $request) {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['logged_out' => true])->header('Cache-Control', 'no-store');
    });
});
