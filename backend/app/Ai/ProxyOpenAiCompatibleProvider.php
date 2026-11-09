<?php

namespace App\Ai;

use Laravel\Ai\Contracts\Gateway\StepTextGateway;
use Laravel\Ai\Providers\OpenAiCompatibleProvider;

class ProxyOpenAiCompatibleProvider extends OpenAiCompatibleProvider
{
    /**
     * Pakai gateway khusus yang membersihkan prefix "proxy_" dari nama tool.
     */
    public function textGateway(): StepTextGateway
    {
        return $this->textGateway ??= new ProxyOpenAiCompatibleGateway($this->events);
    }
}
