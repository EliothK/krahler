package com.krahler.api;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ContactController {

    private static final Logger log = LoggerFactory.getLogger(ContactController.class);

    record ContactRequest(
            // No line breaks: name flows straight into the notification email's Subject header (see notify()), and nothing else stops a "name" containing \r\n from injecting extra headers.
            @NotBlank @Size(max = 100) @Pattern(regexp = "[^\r\n]*") String name,
            @NotBlank @Email @Size(max = 200) String email,
            @NotBlank @Size(max = 2000) String message,
            // Hidden field in the form. People never fill it in, so anything here is a bot.
            @Size(max = 0) String website) {
    }

    private final RateLimiter limiter;
    private final JavaMailSender mailSender;
    private final String notifyTo;
    private final ContactMessageRepository messages;
    private final Clock clock;

    ContactController(
            ApiProperties properties, Clock clock, JavaMailSender mailSender, ContactMessageRepository messages) {
        var limit = properties.contactRateLimit();
        this.limiter = new RateLimiter(limit.maxRequests(), limit.window(), clock);
        this.clock = clock;
        this.mailSender = mailSender;
        this.notifyTo = properties.contactNotifyTo();
        this.messages = messages;
    }

    @PostMapping("/api/contact")
    ResponseEntity<Void> contact(@Valid @RequestBody ContactRequest request, HttpServletRequest http) {
        if (!limiter.tryAcquire(clientKey(http))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", "3600").build();
        }
        // Stored first: whatever happens to the email next, the message itself is now durable.
        var saved = messages.save(new ContactMessage(request.name(), request.email(), request.message(), Instant.now(clock)));
        // A failed send is logged, not retried inline: retryUnemailed() picks it up on its own schedule, and the sender already sees this as accepted either way.
        try {
            notify(saved);
            saved.markEmailed();
            messages.save(saved);
        } catch (MailException e) {
            log.error("failed to send the contact notification email for message {}", saved.getId(), e);
        }
        return ResponseEntity.accepted().build();
    }

    // Catches transient failures (an expired app password, Gmail throttling) that a plain retry-on-submit can't: the sender is long gone by the time this runs, but the message they wrote isn't.
    @Scheduled(fixedRate = 900_000)
    void retryUnemailed() {
        List<ContactMessage> pending = messages.findByEmailedFalse();
        for (var msg : pending) {
            try {
                notify(msg);
                msg.markEmailed();
                messages.save(msg);
            } catch (MailException e) {
                log.warn("retry failed for contact message {}", msg.getId(), e);
            }
        }
    }

    private void notify(ContactMessage msg) {
        var mail = new SimpleMailMessage();
        mail.setTo(notifyTo);
        mail.setReplyTo(msg.getSenderEmail());
        mail.setSubject("Site contact: " + msg.getSenderName());
        mail.setText(msg.getMessage() + "\n\n— " + msg.getSenderName() + " <" + msg.getSenderEmail() + ">");
        mailSender.send(mail);
    }

    // Azure Container Apps appends the real client IP to X-Forwarded-For rather than replacing it, so the rightmost entry is the one Azure itself observed;
    // anything to its left is whatever the caller chose to send and rate-limits on it trivially (Microsoft's own ingress docs confirm this:
    // "Only the rightmost IP is provided by Azure Container Apps. Any other values must be validated by the user to prevent IP spoofing.").
    // Taking the first entry, as this used to, let a client defeat the rate limit outright by sending a different fake leftmost value on every request.
    private static String clientKey(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            return parts[parts.length - 1].trim();
        }
        return http.getRemoteAddr();
    }

    @Scheduled(fixedRate = 600_000)
    void evictIdle() {
        limiter.evictIdle();
    }
}
