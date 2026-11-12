<?php

namespace App\Services\Wallet;

use RuntimeException;

final class WalletPaymentException extends RuntimeException
{
    public function __construct(public readonly string $errorCode, string $message, public readonly int $httpStatus = 503)
    {
        parent::__construct($message);
    }
}
