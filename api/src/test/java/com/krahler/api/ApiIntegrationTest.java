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
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.List;

@SpringBootTest(properties = {
        "api.contact-rate-limit.max-requests=3",
        "api.contact-rate-limit.window=1h"
})
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    RecordingMailSender mailSender;

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

        @Override
        public void send(SimpleMailMessage simpleMessage) {
            sent.add(simpleMessage);
        }

        @Override
        public void send(SimpleMailMessage... simpleMessages) {
            for (var m : simpleMessages) sent.add(m);
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
