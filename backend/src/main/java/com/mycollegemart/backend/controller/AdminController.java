package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @Autowired
    public AdminController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
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
}
