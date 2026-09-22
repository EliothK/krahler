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
        // Sweep any previously-failed sends first: this is the only place retries happen (see retryUnemailed()'s comment for why there's no background schedule), so a new submission is also the trigger that gives an old one another chance.
        retryUnemailed();
        // Stored first: whatever happens to the email next, the message itself is now durable.
        var saved = messages.save(new ContactMessage(request.name(), request.email(), request.message(), Instant.now(clock)));
        // A failed send is logged, not retried inline: it waits for the next contact() call (this one or a future one) to sweep it, and the sender already sees this as accepted either way.
        try {
            notify(saved);
            saved.markEmailed();
            messages.save(saved);
        } catch (MailException e) {
            log.error("failed to send the contact notification email for message {}", saved.getId(), e);
        }
        return ResponseEntity.accepted().build();
    }

    // Deliberately NOT @Scheduled.
    // The API is scale-to-zero, and the site's own uptime check pings it roughly every 15 minutes, which is often enough to cold-start a fresh replica but not often enough to keep one alive continuously (Container Apps' default 300s idle cooldown is shorter than the gap between pings).
    // Spring's fixedRate has no initial delay, so a scheduled version of this ran on nearly every single cold start regardless of the interval configured — and since it queried the database every time, Azure SQL's 60-minute auto-pause could never
    // accumulate 60 idle minutes and the database ran (and billed) continuously, 24/7, instead of mostly-paused.
    // Measured cost from this: roughly $3.90/day in vCore charges alone.
    // Tying the// retry to real contact-form submissions instead means the database is only woken by an actual visitor, which is exactly when it needs to be awake anyway to store their message.
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
