package com.krahler.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.atomic.AtomicInteger;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Azure SQL serverless only pauses after 60 minutes with no connections, and the uptime check cold-starts this app about three times an hour.
 * So starting up, and answering the uptime check, must never open a database connection; only a contact submission may.
 * This counts every connection the app asks for.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NoDatabaseAtStartupTest {

    static final AtomicInteger connections = new AtomicInteger();

    @TestConfiguration
    static class CountingDataSourceConfig {

        @Bean
        @Primary
        DataSource countingDataSource() {
            DataSource h2 = DataSourceBuilder.create()
                    .url("jdbc:h2:mem:startup;DB_CLOSE_DELAY=-1;MODE=MSSQLServer")
                    .username("sa")
                    .build();
            return new DelegatingDataSource(h2) {
                @Override
                public Connection getConnection() throws SQLException {
                    connections.incrementAndGet();
                    return super.getConnection();
                }
            };
        }

        @Bean
        @Primary
        JavaMailSender noopMailSender() {
            return new JavaMailSenderImpl() {
                @Override
                public void send(SimpleMailMessage... messages) {
                }
            };
        }
    }

    @Autowired
    MockMvc mvc;

    @Test
    void startupAndTheUptimeCheckNeverTouchTheDatabaseButAContactSubmissionDoes() throws Exception {
        assertThat(connections.get()).as("connections opened during startup").isZero();

        mvc.perform(get("/api/status")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        // Without the deploy workflow's token, the deploy check must not wake the database either.
        mvc.perform(post("/api/deploy-check").header("X-Deploy-Check-Token", "guess")).andExpect(status().isNotFound());
        assertThat(connections.get()).as("connections opened by status and health checks").isZero();

        mvc.perform(post("/api/contact")
                        .header("X-Forwarded-For", "203.0.113.50")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Ada","email":"ada@example.com","message":"Hello there"}"""))
                .andExpect(status().isAccepted());
        assertThat(connections.get()).as("a contact submission migrates and stores").isPositive();
    }
}
