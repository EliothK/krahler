package com.krahler.api;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A contact-form submission, stored before the notification email is even attempted. The email can fail (an expired app password, Gmail being Gmail); the row surviving that is the entire point of this table.
 */
@Entity
@Table(name = "contact_messages")
class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Column(name = "sender_email", nullable = false, length = 200)
    private String senderEmail;

    @Column(nullable = false, length = 2000)
    private String message;

    // Hibernate's default mapping for Instant is an offset-aware type (SQL Server: datetimeoffset), which the migration's plain DATETIME2 column doesn't match — invisible on H2, which is permissive about it, and only surfaced against real Azure SQL.
    // Pinning it here makes the Java side match the column regardless of dialect.
    @Column(name = "created_at", nullable = false)
    @JdbcTypeCode(SqlTypes.TIMESTAMP)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean emailed;

    protected ContactMessage() {
        // JPA
    }

    ContactMessage(String senderName, String senderEmail, String message, Instant createdAt) {
        this.senderName = senderName;
        this.senderEmail = senderEmail;
        this.message = message;
        this.createdAt = createdAt;
        this.emailed = false;
    }

    Long getId() {
        return id;
    }

    String getSenderName() {
        return senderName;
    }

    String getSenderEmail() {
        return senderEmail;
    }

    String getMessage() {
        return message;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    boolean isEmailed() {
        return emailed;
    }

    void markEmailed() {
        this.emailed = true;
    }
}
