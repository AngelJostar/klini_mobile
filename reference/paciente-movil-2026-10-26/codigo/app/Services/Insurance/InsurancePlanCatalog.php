<?php

namespace App\Services\Insurance;

use App\Models\InsurancePlan;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class InsurancePlanCatalog
{
    public const CATEGORIES = ['gmm' => 'Seguros de gastos médicos mayores', 'life' => 'Seguros de vida'];
    public const DETAIL_FIELDS = [
        'teleconsultations' => 'Teleconsultas', 'ambulance' => 'Ambulancia', 'term' => 'Plazo',
        'main_coverage' => 'Cobertura principal', 'beneficiaries' => 'Beneficiarios', 'coverages' => 'Coberturas',
        'conditions' => 'Condiciones', 'exclusions' => 'Exclusiones', 'waiting_periods' => 'Periodos de espera',
        'cancellation' => 'Cancelación y privacidad',
    ];

    public static function query(Request $request): Builder
    {
        return InsurancePlan::query()->with(['carrier', 'documents'])->where('category', $request->input('view', 'gmm'))
            ->when($request->filled('carrier'), fn ($q) => $q->where('insurance_carrier_id', $request->integer('carrier')))
            ->when(in_array($request->input('status'), ['active', 'inactive'], true), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($search) => $search->where('name', 'like', '%'.$request->string('q').'%')->orWhereHas('carrier', fn ($carrier) => $carrier->where('name', 'like', '%'.$request->string('q').'%'))))
            ->orderBy('id');
    }

    public static function payload(InsurancePlan $plan, bool $api = false): array
    {
        return [
            'id' => $plan->id, 'category' => $plan->category, 'name' => $plan->name,
            'carrier' => $plan->carrier?->name ?? 'Por asignar', 'price' => $plan->monthly_premium === null ? null : (float) $plan->monthly_premium,
            'insured_amount' => $plan->insured_amount, 'deductible' => $plan->deductible, 'coinsurance' => $plan->coinsurance,
            'is_demo' => $plan->is_demo, 'details' => $plan->details ?? [],
            'documents' => $plan->documents->map(fn ($doc) => ['id' => $doc->id, 'name' => $doc->name, 'url' => route($api ? 'api.mobile.v1.patient.insurance-plans.documents' : 'patient.insurance-plans.documents', $doc)])->values()->all(),
        ];
    }

    public static function published(bool $api = false): array
    {
        return InsurancePlan::query()->published()->with(['carrier', 'documents'])->orderBy('id')->get()->map(fn ($plan) => self::payload($plan, $api))->all();
    }
}
