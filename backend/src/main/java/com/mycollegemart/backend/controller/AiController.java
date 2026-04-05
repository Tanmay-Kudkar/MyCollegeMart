package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.AiFeedback;
import com.mycollegemart.backend.repository.AiFeedbackRepository;
import com.mycollegemart.backend.service.AiAssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiAssistantService aiAssistantService;
    private final AiFeedbackRepository aiFeedbackRepository;

    public AiController(AiAssistantService aiAssistantService, AiFeedbackRepository aiFeedbackRepository) {
        this.aiAssistantService = aiAssistantService;
        this.aiFeedbackRepository = aiFeedbackRepository;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@Valid @RequestBody ChatRequest request) {
        try {
            List<AiAssistantService.ChatTurn> history = request.history() == null
                    ? List.of()
                    : request.history().stream()
                            .map(turn -> new AiAssistantService.ChatTurn(turn.role(), turn.text()))
                            .toList();

            String reply = aiAssistantService.chat(request.assistantType(), request.message(), history);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> feedback(@Valid @RequestBody FeedbackRequest request) {
        String normalizedFeedbackType = request.feedbackType().trim().toUpperCase(Locale.ROOT);
        List<String> normalizedReasons = request.reasons() == null
                ? List.of()
                : request.reasons().stream()
                        .map(reason -> reason == null ? "" : reason.trim().toUpperCase(Locale.ROOT))
                        .filter(reason -> !reason.isBlank())
                        .toList();

        if ("DOWN".equals(normalizedFeedbackType) && normalizedReasons.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "At least one reason is required for DOWN feedback."));
        }

        AiFeedback feedback = new AiFeedback();
        feedback.setAssistantType(request.assistantType().trim().toUpperCase());
        feedback.setFeedbackType(normalizedFeedbackType);
        feedback.setPromptText(request.message() == null ? "" : request.message().trim());
        feedback.setResponseText(request.response().trim());
        feedback.setSourcePage(request.sourcePage() == null || request.sourcePage().isBlank()
                ? "STUDY_CORNER"
                : request.sourcePage().trim().toUpperCase());
        feedback.setReasonCodes(normalizedReasons.isEmpty() ? null : String.join(",", normalizedReasons));
        feedback.setFeedbackDetails(request.details() == null ? null : request.details().trim());
        feedback.setChatSessionId(request.chatSessionId() == null || request.chatSessionId().isBlank()
                ? "UNKNOWN"
                : request.chatSessionId().trim());
        feedback.setChatSessionStartedAt(request.chatSessionStartedAt());
        feedback.setMessageTimestamp(request.messageTimestamp());

        aiFeedbackRepository.save(feedback);
        return ResponseEntity.ok(Map.of("status", "recorded"));
    }

    private record ChatRequest(
            @NotBlank(message = "assistantType is required") String assistantType,
            @NotBlank(message = "message is required") @Size(max = 2000, message = "message is too long") String message,
            @Size(max = 20, message = "history is too long") List<@Valid ChatTurnRequest> history) {
    }

    private record FeedbackRequest(
            @NotBlank(message = "assistantType is required") @Size(max = 64, message = "assistantType is too long") String assistantType,
            @NotBlank(message = "feedbackType is required") @Pattern(regexp = "(?i)UP|DOWN", message = "feedbackType must be UP or DOWN") String feedbackType,
            @Size(max = 4000, message = "message is too long") String message,
            @NotBlank(message = "response is required") @Size(max = 20000, message = "response is too long") String response,
            @Size(max = 64, message = "sourcePage is too long") String sourcePage,
            @Size(max = 6, message = "Too many reasons") List<@Size(max = 64, message = "Reason is too long") String> reasons,
            @Size(max = 2000, message = "details is too long") String details,
            @Size(max = 128, message = "chatSessionId is too long") String chatSessionId,
            Instant chatSessionStartedAt,
            Instant messageTimestamp) {
    }

    private record ChatTurnRequest(
            @NotBlank(message = "history role is required") String role,
            @NotBlank(message = "history text is required") @Size(max = 2000, message = "history text is too long") String text) {
    }
}
