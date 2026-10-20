<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'superadmin';
    case Admin = 'admin';
    case Institution = 'institution';
    case Unit = 'unit';
    case Operational = 'operational';
    case Provider = 'provider';
    case Doctor = 'doctor';
    case Patient = 'patient';
    case InsuranceAdvisor = 'insurance_advisor';
    case InsuranceAdmin = 'insurance_admin';
    case MedicalAuditor = 'medical_auditor';
    case PatientCoordinator = 'patient_coordinator';
    case DeliveryCoordinator = 'delivery_coordinator';
    case HospitalCoordinator = 'hospital_coordinator';
    case Billing = 'billing';
    case ReadOnly = 'read_only';
    case Messenger = 'messenger';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Superadministrador',
            self::Admin => 'Administracion',
            self::Institution => 'Institucion',
            self::Unit => 'Unidad',
            self::Operational => 'Area operativa',
            self::Provider => 'Proveedor',
            self::Doctor => 'Medico',
            self::Patient => 'Paciente',
            self::InsuranceAdvisor => 'Asesor de seguros',
            self::InsuranceAdmin => 'Administrador aseguradora',
            self::MedicalAuditor => 'Medico auditor',
            self::PatientCoordinator => 'Coordinador de pacientes',
            self::DeliveryCoordinator => 'Coordinador de entregas',
            self::HospitalCoordinator => 'Coordinador hospitalario',
            self::Billing => 'Facturacion',
            self::ReadOnly => 'Consulta',
            self::Messenger => 'Mensajero',
        };
    }

    public function canReviewAllModules(): bool
    {
        return in_array($this, [self::SuperAdmin, self::Admin], true);
    }
}
