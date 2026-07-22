<?php

namespace App\Exceptions;

use Exception;

class ApiException extends Exception
{
    protected $statusCode;
    protected $data;

    public function __construct(string $message, int $statusCode = 400, $data = null)
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->data = $data;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getData()
    {
        return $this->data;
    }
}
