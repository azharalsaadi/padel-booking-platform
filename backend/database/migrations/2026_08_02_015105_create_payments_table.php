<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->enum('method', ['pay_at_venue', 'thawani']);
            $table->enum('status', ['pending', 'paid', 'failed', 'expired', 'refunded', 'cancelled']);
            $table->unsignedInteger('amount_baisa');
            $table->char('currency', 3)->default('OMR');
            $table->string('thawani_session_id', 100)->nullable()->unique();
            $table->string('thawani_payment_id', 100)->nullable();
            $table->string('checkout_url', 255)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index('booking_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
