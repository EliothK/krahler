package com.krahler.api;

import java.time.Clock;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ContactController {

    private static final Logger log = LoggerFactory.getLogger(ContactController.class);

    record ContactRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 200) String email,
            @NotBlank @Size(max = 2000) String message,
            // Hidden field in the form. People never fill it in, so anything here is a bot.
            @Size(max = 0) String website) {
    }

    private final RateLimiter limiter;

    ContactController(ApiProperties properties, Clock clock) {
        var limit = properties.contactRateLimit();
        this.limiter = new RateLimiter(limit.maxRequests(), limit.window(), clock);
    }

    @PostMapping("/api/contact")
    ResponseEntity<Void> contact(@Valid @RequestBody ContactRequest request, HttpServletRequest http) {
        if (!limiter.tryAcquire(clientKey(http))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", "3600").build();
        }
        // Stored in the database once that exists. Until then only the fact of the message is logged, never its content.
        log.info("contact message received ({} characters)", request.message().length());
        return ResponseEntity.accepted().build();
    }

    // Behind Azure's ingress the caller's address arrives in X-Forwarded-For; the first entry is the original client.
    private static String clientKey(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }

    @Scheduled(fixedRate = 600_000)
    void evictIdle() {
        limiter.evictIdle();
    }
}
