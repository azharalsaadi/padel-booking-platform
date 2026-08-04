<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('court_closures', function (Blueprint $table) {
            $table->id();
            $table->uuid('batch_id')->nullable();
            // null court_id = applies to all courts
            $table->foreignId('court_id')->nullable()->constrained('courts')->cascadeOnDelete();
            $table->date('date_start');
            $table->date('date_end');
            $table->boolean('is_full_day')->default(true);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('reason', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('admin_users')->nullOnDelete();
            $table->timestamps();

            $table->index(['court_id', 'date_start', 'date_end']);
            $table->index(['date_start', 'date_end']);
            $table->index('batch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('court_closures');
    }
};
