package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.service.AiAssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiAssistantService aiAssistantService;

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
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

    private record ChatRequest(
            @NotBlank(message = "assistantType is required") String assistantType,
            @NotBlank(message = "message is required") @Size(max = 2000, message = "message is too long") String message,
            @Size(max = 20, message = "history is too long") List<@Valid ChatTurnRequest> history) {
    }

    private record ChatTurnRequest(
            @NotBlank(message = "history role is required") String role,
            @NotBlank(message = "history text is required") @Size(max = 2000, message = "history text is too long") String text) {
    }
}
