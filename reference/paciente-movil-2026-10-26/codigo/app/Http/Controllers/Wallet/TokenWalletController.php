<?php

namespace App\Http\Controllers\Wallet;

use App\Http\Controllers\Controller;
use App\Services\Wallet\TokenWallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TokenWalletController extends Controller
{
    public function show(Request $request, TokenWallet $wallet): JsonResponse
    {
        return response()->json($wallet->summary($request->user()->id))->header('Cache-Control', 'private, no-store');
    }
}
