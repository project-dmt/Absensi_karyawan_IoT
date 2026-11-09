<?php

namespace App\Ai;

use Laravel\Ai\Gateway\OpenAiCompatible\OpenAiCompatibleGateway;
use Laravel\Ai\Gateway\StepResponse;
use Laravel\Ai\Providers\Provider;

class ProxyOpenAiCompatibleGateway extends OpenAiCompatibleGateway
{
    /**
     * Beberapa gateway OpenAI-compatible menambahkan prefix "proxy_" ke nama tool.
     * Buang prefix itu agar nama tool cocok dengan tool yang terdaftar di aplikasi.
     */
    protected function normalizeToolName(string $name): string
    {
        return str_starts_with($name, 'proxy_') ? substr($name, 6) : $name;
    }

    /**
     * Rapikan nama tool pada respons non-streaming sebelum dipetakan parent.
     */
    protected function parseTextResponse(array $data, Provider $provider, bool $structured): StepResponse
    {
        if (isset($data['choices'][0]['message']['tool_calls']) && is_array($data['choices'][0]['message']['tool_calls'])) {
            foreach ($data['choices'][0]['message']['tool_calls'] as &$toolCall) {
                if (isset($toolCall['function']['name'])) {
                    $toolCall['function']['name'] = $this->normalizeToolName((string) $toolCall['function']['name']);
                }
            }
            unset($toolCall);
        }

        return parent::parseTextResponse($data, $provider, $structured);
    }

    /**
     * Rapikan nama tool pada respons streaming sebelum dipetakan parent.
     */
    protected function mapStreamToolCalls(array $toolCalls): array
    {
        foreach ($toolCalls as &$toolCall) {
            if (isset($toolCall['name'])) {
                $toolCall['name'] = $this->normalizeToolName((string) $toolCall['name']);
            }
        }
        unset($toolCall);

        return parent::mapStreamToolCalls($toolCalls);
    }
}
