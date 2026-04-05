package com.mycollegemart.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "ai_feedback")
public class AiFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assistant_type", nullable = false, length = 64)
    private String assistantType;

    @Column(name = "feedback_type", nullable = false, length = 16)
    private String feedbackType;

    @Column(name = "prompt_text", columnDefinition = "TEXT")
    private String promptText;

    @Column(name = "response_text", nullable = false, columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "source_page", nullable = false, length = 64)
    private String sourcePage = "STUDY_CORNER";

    @Column(name = "reason_codes", columnDefinition = "TEXT")
    private String reasonCodes;

    @Column(name = "feedback_details", columnDefinition = "TEXT")
    private String feedbackDetails;

    @Column(name = "chat_session_id", nullable = false, length = 128)
    private String chatSessionId = "UNKNOWN";

    @Column(name = "chat_session_started_at", nullable = false)
    private Instant chatSessionStartedAt;

    @Column(name = "message_timestamp", nullable = false)
    private Instant messageTimestamp;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (sourcePage == null || sourcePage.isBlank()) {
            sourcePage = "STUDY_CORNER";
        }
        if (chatSessionId == null || chatSessionId.isBlank()) {
            chatSessionId = "UNKNOWN";
        }
        if (chatSessionStartedAt == null) {
            chatSessionStartedAt = createdAt;
        }
        if (messageTimestamp == null) {
            messageTimestamp = createdAt;
        }
    }
}
