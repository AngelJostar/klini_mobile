<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\InsurancePlan;
use App\Models\InsurancePlanDocument;
use App\Services\Insurance\InsurancePlanCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InsurancePlanFeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => ['plans' => InsurancePlanCatalog::published($request->is('api/*'))]])->header('Cache-Control', 'private, no-store');
    }

    public function document(Request $request, InsurancePlanDocument $document): StreamedResponse
    {
        $admin = $request->user()?->role === 'superadmin';
        abort_unless($admin || InsurancePlan::query()->published()->whereKey($document->insurance_plan_id)->exists(), 404);
        abort_unless(Storage::disk('local')->exists($document->path), 404);
        return Storage::disk('local')->download($document->path, $document->name, ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
