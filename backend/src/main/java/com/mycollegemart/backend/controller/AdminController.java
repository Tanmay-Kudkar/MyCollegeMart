package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.AiFeedback;
import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.repository.AiFeedbackRepository;
import com.mycollegemart.backend.service.OrderService;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final OrderService orderService;
    private final AiFeedbackRepository aiFeedbackRepository;
    private final JwtUtil jwtUtil;

    @Autowired
    public AdminController(
            UserService userService,
            OrderService orderService,
            AiFeedbackRepository aiFeedbackRepository,
            JwtUtil jwtUtil) {
        this.userService = userService;
        this.orderService = orderService;
        this.aiFeedbackRepository = aiFeedbackRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/merchants")
    public ResponseEntity<?> getMerchantsByStatus(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "status", defaultValue = "PENDING") String status) {
        User adminUser = resolveAdminUser(authHeader);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access is required"));
        }

        List<Map<String, Object>> merchants = userService.getMerchantsByVerificationStatus(status);
        return ResponseEntity.ok(Map.of(
                "status", userService.normalizeMerchantVerificationStatus(status),
                "items", merchants));
    }

    @PostMapping("/merchants/{merchantId}/approve")
    public ResponseEntity<?> approveMerchant(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long merchantId) {
        return updateMerchantStatus(authHeader, merchantId, UserService.MERCHANT_STATUS_APPROVED);
    }

    @PostMapping("/merchants/{merchantId}/reject")
    public ResponseEntity<?> rejectMerchant(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long merchantId) {
        return updateMerchantStatus(authHeader, merchantId, UserService.MERCHANT_STATUS_REJECTED);
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getOrders(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "limit", required = false) Integer limit) {
        User adminUser = resolveAdminUser(authHeader);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access is required"));
        }

        List<Map<String, Object>> orders = (query == null || query.isBlank())
                ? orderService.getRecentOrdersForAdmin(limit)
                : orderService.searchOrdersForAdmin(query, limit);

        return ResponseEntity.ok(Map.of(
                "query", query == null ? "" : query.trim(),
                "items", orders));
    }

    @PostMapping("/orders/{orderId}/tracking-events")
    public ResponseEntity<?> addTrackingEvent(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long orderId,
            @Valid @RequestBody TrackingEventRequest request) {
        User adminUser = resolveAdminUser(authHeader);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access is required"));
        }

        try {
            return ResponseEntity.ok(orderService.addManualTrackingEventForAdmin(
                    orderId,
                    new OrderService.AdminTrackingEventInput(
                            request.trackingStage(),
                            request.eventTitle(),
                            request.eventDescription(),
                            request.eventLocation(),
                            request.carrierName(),
                            request.carrierContact(),
                            request.trackingNumber(),
                            request.estimatedDeliveryAt(),
                            request.eventTime())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/ai-feedback")
    public ResponseEntity<?> getAiFeedback(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "sessionId", required = false) String sessionId,
            @RequestParam(name = "feedbackType", required = false) String feedbackType,
            @RequestParam(name = "limit", required = false) Integer limit) {
        User adminUser = resolveAdminUser(authHeader);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access is required"));
        }

        int safeLimit = Math.min(100, Math.max(1, limit == null ? 20 : limit));
        String normalizedSessionId = sessionId == null ? "" : sessionId.trim();
        String normalizedFeedbackType = normalizeFeedbackType(feedbackType);

        List<AiFeedback> feedbackItems;
        if (normalizedSessionId.isBlank() && normalizedFeedbackType.isEmpty()) {
            feedbackItems = aiFeedbackRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit));
        } else if (normalizedSessionId.isBlank()) {
            feedbackItems = aiFeedbackRepository.findByFeedbackTypeIgnoreCaseOrderByCreatedAtDesc(
                    normalizedFeedbackType,
                    PageRequest.of(0, safeLimit));
        } else if (normalizedFeedbackType.isEmpty()) {
            feedbackItems = aiFeedbackRepository.findByChatSessionIdContainingIgnoreCaseOrderByCreatedAtDesc(
                    normalizedSessionId,
                    PageRequest.of(0, safeLimit));
        } else {
            feedbackItems = aiFeedbackRepository
                    .findByChatSessionIdContainingIgnoreCaseAndFeedbackTypeIgnoreCaseOrderByCreatedAtDesc(
                            normalizedSessionId,
                            normalizedFeedbackType,
                            PageRequest.of(0, safeLimit));
        }

        List<Map<String, Object>> payload = feedbackItems.stream()
                .map(this::mapAiFeedback)
                .toList();

        return ResponseEntity.ok(Map.of(
                "sessionId", normalizedSessionId,
                "feedbackType", normalizedFeedbackType,
                "limit", safeLimit,
                "count", payload.size(),
                "items", payload));
    }

    private ResponseEntity<?> updateMerchantStatus(String authHeader, Long merchantId, String status) {
        User adminUser = resolveAdminUser(authHeader);
        if (adminUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin access is required"));
        }

        try {
            Map<String, Object> updatedMerchant = userService.updateMerchantVerificationStatus(merchantId, status);
            return ResponseEntity.ok(updatedMerchant);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private String normalizeFeedbackType(String feedbackType) {
        if (feedbackType == null || feedbackType.isBlank()) {
            return "";
        }

        String normalized = feedbackType.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "UP", "DOWN" -> normalized;
            default -> "";
        };
    }

    private Map<String, Object> mapAiFeedback(AiFeedback feedback) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", feedback.getId());
        payload.put("assistantType", coalesce(feedback.getAssistantType()));
        payload.put("feedbackType", coalesce(feedback.getFeedbackType()));
        payload.put("sourcePage", coalesce(feedback.getSourcePage()));
        payload.put("promptText", coalesce(feedback.getPromptText()));
        payload.put("responseText", coalesce(feedback.getResponseText()));
        payload.put("reasonCodes", parseReasonCodes(feedback.getReasonCodes()));
        payload.put("feedbackDetails", coalesce(feedback.getFeedbackDetails()));
        payload.put("chatSessionId", coalesce(feedback.getChatSessionId()));
        payload.put("chatSessionStartedAt", feedback.getChatSessionStartedAt());
        payload.put("messageTimestamp", feedback.getMessageTimestamp());
        payload.put("createdAt", feedback.getCreatedAt());
        return payload;
    }

    private List<String> parseReasonCodes(String reasonCodes) {
        if (reasonCodes == null || reasonCodes.isBlank()) {
            return List.of();
        }

        return Arrays.stream(reasonCodes.split(","))
                .map(String::trim)
                .filter(reason -> !reason.isBlank())
                .toList();
    }

    private String coalesce(String value) {
        return value == null ? "" : value;
    }

    private User resolveAdminUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String userIdFromToken = jwtUtil.validateAndGetUserId(authHeader.substring(7));
        if (userIdFromToken == null) {
            return null;
        }

        Long userId;
        try {
            userId = Long.parseLong(userIdFromToken);
        } catch (NumberFormatException e) {
            return null;
        }

        User user = userService.findById(userId);
        if (user == null || !userService.isAdmin(user)) {
            return null;
        }

        return user;
    }

    private record TrackingEventRequest(
            @NotBlank(message = "trackingStage is required") String trackingStage,
            String eventTitle,
            String eventDescription,
            String eventLocation,
            String carrierName,
            String carrierContact,
            String trackingNumber,
            Instant estimatedDeliveryAt,
            Instant eventTime) {
    }
}
