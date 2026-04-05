package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.service.ProductQuestionService;
import com.mycollegemart.backend.util.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/products/{productId}/questions")
public class ProductQuestionController {

    private final ProductQuestionService productQuestionService;
    private final JwtUtil jwtUtil;

    @Autowired
    public ProductQuestionController(ProductQuestionService productQuestionService, JwtUtil jwtUtil) {
        this.productQuestionService = productQuestionService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> getQuestions(@PathVariable Long productId) {
        return ResponseEntity.ok(productQuestionService.getQuestionsForProduct(productId));
    }

    @PostMapping
    public ResponseEntity<?> askQuestion(
            @PathVariable Long productId,
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AskQuestionRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to ask a question"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(productQuestionService.createQuestion(productId, userId, request.question()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{questionId}/answers")
    public ResponseEntity<?> answerQuestion(
            @PathVariable Long productId,
            @PathVariable Long questionId,
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AnswerQuestionRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to answer questions"));
        }

        try {
            return ResponseEntity
                    .ok(productQuestionService.createAnswer(productId, questionId, userId, request.answer()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{questionId}/answers/{answerId}")
    public ResponseEntity<?> updateAnswer(
            @PathVariable Long productId,
            @PathVariable Long questionId,
            @PathVariable Long answerId,
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AnswerQuestionRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to edit responses"));
        }

        try {
            return ResponseEntity
                    .ok(productQuestionService.updateAnswer(productId, questionId, answerId, userId, request.answer()));
        } catch (IllegalArgumentException e) {
            if ("Answer not found".equalsIgnoreCase(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{questionId}/answers/{answerId}")
    public ResponseEntity<?> deleteAnswer(
            @PathVariable Long productId,
            @PathVariable Long questionId,
            @PathVariable Long answerId,
            @RequestHeader(name = "Authorization", required = false) String authHeader) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to delete responses"));
        }

        try {
            return ResponseEntity
                    .ok(productQuestionService.deleteAnswer(productId, questionId, answerId, userId));
        } catch (IllegalArgumentException e) {
            if ("Answer not found".equalsIgnoreCase(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    private Long resolveUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String userIdFromToken = jwtUtil.validateAndGetUserId(authHeader.substring(7));
        if (userIdFromToken == null) {
            return null;
        }

        try {
            return Long.parseLong(userIdFromToken);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record AskQuestionRequest(@NotBlank(message = "question is required") String question) {
    }

    private record AnswerQuestionRequest(@NotBlank(message = "answer is required") String answer) {
    }
}
