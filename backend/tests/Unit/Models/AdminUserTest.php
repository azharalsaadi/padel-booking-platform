<?php

namespace Tests\Unit\Models;

use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\CourtClosure;
use App\Models\PricingRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_is_hashed_automatically(): void
    {
        $admin = AdminUser::factory()->create(['password' => 'plain-text-password']);

        $this->assertNotSame('plain-text-password', $admin->password);
        $this->assertTrue(Hash::check('plain-text-password', $admin->password));
    }

    public function test_password_and_remember_token_are_hidden(): void
    {
        $admin = AdminUser::factory()->create();

        $array = $admin->toArray();

        $this->assertArrayNotHasKey('password', $array);
        $this->assertArrayNotHasKey('remember_token', $array);
    }

    public function test_has_many_created_court_closures(): void
    {
        $admin = AdminUser::factory()->create();
        CourtClosure::factory()->count(2)->create(['created_by' => $admin->id]);

        $this->assertCount(2, $admin->createdCourtClosures);
        $this->assertInstanceOf(CourtClosure::class, $admin->createdCourtClosures->first());
    }

    public function test_has_many_created_pricing_rules(): void
    {
        $admin = AdminUser::factory()->create();
        PricingRule::factory()->count(3)->create(['created_by' => $admin->id]);

        $this->assertCount(3, $admin->createdPricingRules);
    }

    public function test_has_many_created_bookings(): void
    {
        $admin = AdminUser::factory()->create();
        Booking::factory()->count(2)->create(['created_by_admin_id' => $admin->id]);

        $this->assertCount(2, $admin->createdBookings);
        $this->assertInstanceOf(Booking::class, $admin->createdBookings->first());
    }
}
