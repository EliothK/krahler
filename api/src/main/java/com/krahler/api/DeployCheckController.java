package com.krahler.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets the deploy workflow prove the new version can reach the database.
 *
 * Nothing connects to the database at startup (see LazySchemaMigrator), so without this a broken database login would only surface when a visitor's message failed.
 * The deploy calls this once after rollout: it runs the migration and a query, and the deploy fails if either does.
 * It needs a token only the deploy workflow has; without it the endpoint answers 404, so nobody else can use it to wake the database and keep it from pausing.
 */
@RestController
class DeployCheckController {

    private static final Logger log = LoggerFactory.getLogger(DeployCheckController.class);

    private final byte[] token;
    private final LazySchemaMigrator schema;
    private final ContactMessageRepository messages;

    DeployCheckController(
            @Value("${api.deploy-check-token:}") String token,
            LazySchemaMigrator schema,
            ContactMessageRepository messages) {
        this.token = token.getBytes(StandardCharsets.UTF_8);
        this.schema = schema;
        this.messages = messages;
    }

    @PostMapping("/api/deploy-check")
    ResponseEntity<Map<String, String>> check(
            @RequestHeader(name = "X-Deploy-Check-Token", required = false) String supplied) {
        if (token.length == 0 || supplied == null
                || !MessageDigest.isEqual(token, supplied.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.notFound().build();
        }
        try {
            schema.ensureMigrated();
            messages.count();
            return ResponseEntity.ok(Map.of("database", "ok"));
        } catch (RuntimeException e) {
            log.error("deploy check could not reach the database", e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("database", "unreachable"));
        }
    }
}
