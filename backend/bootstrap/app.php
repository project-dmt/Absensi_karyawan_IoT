<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use App\Exceptions\ApiException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'api.key' => \App\Http\Middleware\ValidateApiKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // ModelNotFoundException → 404 konsisten
        $exceptions->renderable(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                $model = class_basename($e->getModel());
                return response()->json([
                    'success' => false,
                    'message' => "Data {$model} tidak ditemukan",
                ], 404);
            }
        });

        // ValidationException → 422 dengan format konsisten
        $exceptions->renderable(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        // NotFoundHttpException (route gak ada) → 404
        $exceptions->renderable(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                // Cek apakah ini ModelNotFoundException (route model binding gagal)
                $previous = $e->getPrevious();
                if ($previous instanceof ModelNotFoundException) {
                    $model = class_basename($previous->getModel());
                    return response()->json([
                        'success' => false,
                        'message' => "Data {$model} tidak ditemukan",
                    ], 404);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Endpoint tidak ditemukan',
                ], 404);
            }
        });

        // ApiException → response custom konsisten
        $exceptions->renderable(function (ApiException $e, Request $request) {
            if ($request->is('api/*')) {
                $response = [
                    'success' => false,
                    'message' => $e->getMessage(),
                ];

                if ($e->getData()) {
                    $response['data'] = $e->getData();
                }

                return response()->json($response, $e->getStatusCode());
            }
        });

        // Generic exception → 500
        $exceptions->renderable(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') && !app()->hasDebugModeEnabled()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan server',
                ], 500);
            }
        });
    })->create();
