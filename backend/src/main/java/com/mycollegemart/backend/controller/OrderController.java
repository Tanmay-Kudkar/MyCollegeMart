package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.service.OrderService;
import com.mycollegemart.backend.util.JwtUtil;
import com.razorpay.RazorpayException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class OrderController {

    private final OrderService orderService;
    private final JwtUtil jwtUtil;

    @Autowired
    public OrderController(OrderService orderService, JwtUtil jwtUtil) {
        this.orderService = orderService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/api/checkout/create-order")
    public ResponseEntity<?> createRazorpayOrder(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody CheckoutOrderRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in to checkout"));
        }

        try {
            Map<String, Object> response = orderService.createRazorpayOrder(
                    userId,
                    request.items(),
                    request.deliveryOption(),
                    request.walletAmount());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", e.getMessage()));
        } catch (RazorpayException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Failed to create payment order"));
        }
    }

    @PostMapping("/api/checkout/verify-payment")
    public ResponseEntity<?> verifyPayment(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody VerifyPaymentRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in to checkout"));
        }

        try {
            return ResponseEntity.ok(orderService.verifyRazorpayPayment(
                    userId,
                    request.razorpayOrderId(),
                    request.razorpayPaymentId(),
                    request.razorpaySignature()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/checkout/place-cod")
    public ResponseEntity<?> placeCodOrder(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody CheckoutOrderRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in to checkout"));
        }

        try {
            return ResponseEntity.ok(orderService.placeCodOrder(
                    userId,
                    request.items(),
                    request.deliveryOption(),
                    request.walletAmount()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/api/orders/my")
    public ResponseEntity<?> getMyOrders(
            @RequestHeader(name = "Authorization", required = false) String authHeader) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        return ResponseEntity.ok(orderService.getOrdersForUser(userId));
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

    private record CheckoutOrderRequest(
            @NotEmpty(message = "Cart items are required") List<OrderService.OrderItemInput> items,
            String deliveryOption,
            Double walletAmount) {
    }

    private record VerifyPaymentRequest(
            @NotBlank(message = "razorpayOrderId is required") String razorpayOrderId,
            @NotBlank(message = "razorpayPaymentId is required") String razorpayPaymentId,
            @NotBlank(message = "razorpaySignature is required") String razorpaySignature) {
    }
}
