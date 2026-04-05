package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.service.WalletService;
import com.mycollegemart.backend.util.JwtUtil;
import com.razorpay.RazorpayException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;
    private final JwtUtil jwtUtil;

    @Autowired
    public WalletController(WalletService walletService, JwtUtil jwtUtil) {
        this.walletService = walletService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/topup/create-order")
    public ResponseEntity<?> createTopupOrder(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody CreateTopupOrderRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to add money"));
        }

        try {
            return ResponseEntity.ok(walletService.createTopupOrder(userId, request.amount()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", e.getMessage()));
        } catch (RazorpayException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Failed to create top-up payment order"));
        }
    }

    @PostMapping("/topup/verify-payment")
    public ResponseEntity<?> verifyTopupPayment(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody VerifyTopupPaymentRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to add money"));
        }

        try {
            return ResponseEntity.ok(walletService.verifyTopupPayment(
                    userId,
                    request.razorpayOrderId(),
                    request.razorpayPaymentId(),
                    request.razorpaySignature()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "limit", required = false) Integer limit) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to view wallet transactions"));
        }

        try {
            return ResponseEntity.ok(walletService.getTransactions(userId, limit));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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

    private record CreateTopupOrderRequest(
            @NotNull(message = "amount is required") Double amount) {
    }

    private record VerifyTopupPaymentRequest(
            @NotBlank(message = "razorpayOrderId is required") String razorpayOrderId,
            @NotBlank(message = "razorpayPaymentId is required") String razorpayPaymentId,
            @NotBlank(message = "razorpaySignature is required") String razorpaySignature) {
    }
}
