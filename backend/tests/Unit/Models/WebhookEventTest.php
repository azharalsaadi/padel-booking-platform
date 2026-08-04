<?php

namespace Tests\Unit\Models;

use App\Models\WebhookEvent;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookEventTest extends TestCase
{
    use RefreshDatabase;

    public function test_payload_is_cast_to_array(): void
    {
        $event = WebhookEvent::create([
            'provider' => 'thawani',
            'event_reference' => 'checkout_abc:completed',
            'payload' => ['status' => 'paid'],
        ]);

        $this->assertIsArray($event->payload);
        $this->assertSame('paid', $event->payload['status']);
    }

    public function test_has_no_updated_at_column(): void
    {
        $this->assertNull(WebhookEvent::UPDATED_AT);

        $event = WebhookEvent::create([
            'provider' => 'thawani',
            'event_reference' => 'checkout_xyz:completed',
            'payload' => ['status' => 'paid'],
        ]);

        $this->assertNotNull($event->created_at);
    }

    public function test_duplicate_provider_and_event_reference_is_rejected(): void
    {
        WebhookEvent::create([
            'provider' => 'thawani',
            'event_reference' => 'checkout_dup:completed',
            'payload' => ['status' => 'paid'],
        ]);

        $this->expectException(QueryException::class);

        WebhookEvent::create([
            'provider' => 'thawani',
            'event_reference' => 'checkout_dup:completed',
            'payload' => ['status' => 'paid'],
        ]);
    }
}
