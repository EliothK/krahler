package com.krahler.api;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings under the {@code api.*} prefix. Every value can be overridden with an environment variable (for example {@code API_ALLOWED_ORIGINS}), which is how the container is configured in Azure.
 */
@ConfigurationProperties("api")
public record ApiProperties(List<String> allowedOrigins, RateLimit contactRateLimit) {

    /** At most {@code maxRequests} per client within {@code window}. */
    public record RateLimit(int maxRequests, Duration window) {
    }
}
