package com.krahler.api;

import java.lang.management.ManagementFactory;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class StatusController {

    private final String version;

    StatusController(@Value("${api.version:dev}") String version) {
        this.version = version;
    }

    record Status(String status, String version, long uptimeSeconds, Instant time) {
    }

    @GetMapping("/api/status")
    Status status() {
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        return new Status("ok", version, uptime, Instant.now());
    }
}
