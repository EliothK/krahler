package com.krahler.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "api.contact-rate-limit.max-requests=3",
        "api.contact-rate-limit.window=1h"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    RecordingMailSender mailSender;

    @Autowired
    ContactMessageRepository messages;

    @Autowired
    ContactController contactController;

    // Real network calls to smtp.gmail.com have no place in a test run. Records what was sent instead.
    @org.springframework.boot.test.context.TestConfiguration
    static class MailTestConfig {
        @Bean
        @Primary
        JavaMailSender recordingMailSender() {
            return new RecordingMailSender();
        }
    }

    static class RecordingMailSender implements JavaMailSender {
        final List<SimpleMailMessage> sent = new ArrayList<>();
        final AtomicBoolean failing = new AtomicBoolean(false);

        @Override
        public void send(SimpleMailMessage simpleMessage) {
            if (failing.get()) throw new MailSendException("simulated SMTP failure");
            sent.add(simpleMessage);
        }

        @Override
        public void send(SimpleMailMessage... simpleMessages) {
            for (var m : simpleMessages) send(m);
        }

        @Override
        public MimeMessage createMimeMessage() {
            throw new UnsupportedOperationException("not used by ContactController");
        }

        @Override
        public MimeMessage createMimeMessage(java.io.InputStream contentStream) {
            throw new UnsupportedOperationException("not used by ContactController");
        }

        @Override
        public void send(MimeMessage mimeMessage) {
            throw new UnsupportedOperationException("not used by ContactController");
        }

        @Override
        public void send(MimeMessage... mimeMessages) {
            throw new UnsupportedOperationException("not used by ContactController");
        }

        @Override
        public void send(MimeMessagePreparator mimeMessagePreparator) {
            throw new UnsupportedOperationException("not used by ContactController");
        }

        @Override
        public void send(MimeMessagePreparator... mimeMessagePreparators) {
            throw new UnsupportedOperationException("not used by ContactController");
        }
    }

    private static final String VALID = """
            {"name":"Ada","email":"ada@example.com","message":"Hello there"}""";

    @Test
    void statusReportsOk() throws Exception {
        mvc.perform(get("/api/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.uptimeSeconds").isNumber());
    }

    @Test
    void healthProbeIsExposed() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void otherActuatorEndpointsAreNotExposed() throws Exception {
        mvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
    }

    @Test
    void acceptsAValidContactMessage() throws Exception {
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID))
                .andExpect(status().isAccepted());
    }

    @Test
    void emailsTheOwnerWithTheSenderAsReplyTo() throws Exception {
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.6")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID))
                .andExpect(status().isAccepted());

        var mail = mailSender.sent.get(mailSender.sent.size() - 1);
        org.assertj.core.api.Assertions.assertThat(mail.getTo()).contains("eliothkrahler@gmail.com");
        org.assertj.core.api.Assertions.assertThat(mail.getReplyTo()).isEqualTo("ada@example.com");
        org.assertj.core.api.Assertions.assertThat(mail.getText()).contains("Hello there");
    }

    @Test
    void storesTheMessageEvenWhenTheEmailIsAccepted() throws Exception {
        long before = messages.count();

        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID))
                .andExpect(status().isAccepted());

        assertThat(messages.count()).isEqualTo(before + 1);
        var stored = messages.findAll().get((int) before);
        assertThat(stored.getSenderName()).isEqualTo("Ada");
        assertThat(stored.isEmailed()).isTrue();
    }

    @Test
    void storesTheMessageEvenWhenTheEmailFails() throws Exception {
        long before = messages.count();
        mailSender.failing.set(true);
        try {
            mvc.perform(post("/api/contact")
                            .header("X-Forwarded-For", "203.0.113.8")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID))
                    .andExpect(status().isAccepted());
        } finally {
            mailSender.failing.set(false);
        }

        assertThat(messages.count()).isEqualTo(before + 1);
        var stored = messages.findAll().get((int) before);
        assertThat(stored.isEmailed()).isFalse();
    }

    @Test
    void retriesAMessageThatFailedToEmailTheFirstTime() throws Exception {
        mailSender.failing.set(true);
        try {
            mvc.perform(post("/api/contact")
                            .header("X-Forwarded-For", "203.0.113.9")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID))
                    .andExpect(status().isAccepted());
        } finally {
            mailSender.failing.set(false);
        }
        int sentBefore = mailSender.sent.size();

        contactController.retryUnemailed();

        assertThat(mailSender.sent.size()).isEqualTo(sentBefore + 1);
        assertThat(messages.findByEmailedFalse()).isEmpty();
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        for (String body : new String[] {
                """
                {"name":"","email":"ada@example.com","message":"hi"}""",
                """
                {"name":"Ada","email":"not-an-email","message":"hi"}""",
                """
                {"name":"Ada","email":"ada@example.com","message":""}""",
        }) {
            mvc.perform(post("/api/contact")
                            .header("X-Forwarded-For", "203.0.113.2")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void rejectsALineBreakInTheNameField() throws Exception {
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Ada\\r\\nBcc: victim@example.com","email":"ada@example.com","message":"hi"}"""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAFilledHoneypotField() throws Exception {
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bot","email":"bot@example.com","message":"buy now","website":"http://spam"}"""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void limitsHowOftenOneClientCanWrite() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/contact")
                            .header("X-Forwarded-For", "203.0.113.4")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID))
                    .andExpect(status().isAccepted());
        }
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));

        // A different client is unaffected.
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID))
                .andExpect(status().isAccepted());
    }

    @Test
    void rateLimitsOnTheRightmostForwardedForEntryNotTheClientSuppliedOnes() throws Exception {
        // Azure appends the real client IP after whatever the caller sent, so only the rightmost entry is trustworthy.
        // A different fake leftmost value on every request must not evade the limit as long as the rightmost (real) address stays the same.
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/contact")
                            .header("X-Forwarded-For", "203.0.113." + (50 + i) + ", 198.51.100.9")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID))
                    .andExpect(status().isAccepted());
        }
        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.99, 198.51.100.9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void allowsTheSiteOriginAndNoOthers() throws Exception {
        mvc.perform(options("/api/contact")
                        .header("Origin", "https://krahler.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://krahler.com"));

        mvc.perform(options("/api/contact")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }
}
