package com.krahler.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    /** A clock the test can move forward. */
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void allowsUpToTheLimitThenRejects() {
        var limiter = new RateLimiter(2, Duration.ofHours(1), new MutableClock());

        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isFalse();
    }

    @Test
    void countsEachKeySeparately() {
        var limiter = new RateLimiter(1, Duration.ofHours(1), new MutableClock());

        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("b")).isTrue();
        assertThat(limiter.tryAcquire("a")).isFalse();
    }

    @Test
    void allowsAgainOnceTheWindowHasPassed() {
        var clock = new MutableClock();
        var limiter = new RateLimiter(1, Duration.ofHours(1), clock);

        assertThat(limiter.tryAcquire("a")).isTrue();
        assertThat(limiter.tryAcquire("a")).isFalse();

        clock.now = clock.now.plus(Duration.ofHours(1).plusSeconds(1));
        assertThat(limiter.tryAcquire("a")).isTrue();
    }

    @Test
    void rejectedRequestsDoNotExtendTheWindow() {
        var clock = new MutableClock();
        var limiter = new RateLimiter(1, Duration.ofHours(1), clock);

        limiter.tryAcquire("a");
        clock.now = clock.now.plus(Duration.ofMinutes(59));
        assertThat(limiter.tryAcquire("a")).isFalse();

        clock.now = clock.now.plus(Duration.ofMinutes(2));
        assertThat(limiter.tryAcquire("a")).isTrue();
    }
}
