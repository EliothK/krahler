package com.krahler.api;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window limiter, kept in memory per key. That is enough for one small instance; with several replicas each would count on its own, so a shared store would be needed to enforce the limit exactly.
 */
class RateLimiter {

    private final int maxRequests;
    private final Duration window;
    private final Clock clock;
    private final ConcurrentHashMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    RateLimiter(int maxRequests, Duration window, Clock clock) {
        this.maxRequests = maxRequests;
        this.window = window;
        this.clock = clock;
    }

    /** Records a request for {@code key} and returns whether it is within the limit. */
    boolean tryAcquire(String key) {
        Instant now = clock.instant();
        Instant cutoff = now.minus(window);
        Deque<Instant> times = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && !times.peekFirst().isAfter(cutoff)) {
                times.pollFirst();
            }
            if (times.size() >= maxRequests) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }

    /** Drops keys with no recent requests so the map cannot grow without bound. */
    void evictIdle() {
        Instant cutoff = clock.instant().minus(window);
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || !e.getValue().peekLast().isAfter(cutoff);
            }
        });
    }
}
