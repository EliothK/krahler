package com.krahler.api;

import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * Runs the Flyway migration the first time the database is actually needed, not at startup.
 *
 * The API scales to zero and the uptime check cold-starts it about three times an hour.
 * Flyway at startup (plus Hibernate's schema validation) opened a database connection on every one of those starts, which kept Azure SQL serverless from ever reaching its 60 idle minutes: the database never paused and billed about $7.50 a day.
 * Only a contact submission needs the database, so that is now the only thing that connects to it.
 */
@Component
class LazySchemaMigrator {

    private final Flyway flyway;
    private volatile boolean migrated;

    LazySchemaMigrator(Flyway flyway) {
        this.flyway = flyway;
    }

    void ensureMigrated() {
        if (migrated) {
            return;
        }
        synchronized (this) {
            if (!migrated) {
                flyway.migrate();
                migrated = true;
            }
        }
    }

    @Configuration(proxyBeanMethods = false)
    static class StartupStrategy {

        // Replaces Spring Boot's default "migrate at startup". Building the Flyway bean itself doesn't connect.
        @Bean
        FlywayMigrationStrategy skipMigrationAtStartup() {
            return flyway -> { };
        }
    }
}
