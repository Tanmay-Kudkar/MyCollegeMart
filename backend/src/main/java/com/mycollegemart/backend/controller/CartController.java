package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.service.CartService;
import com.mycollegemart.backend.util.JwtUtil;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;
    private final JwtUtil jwtUtil;

    @Autowired
    public CartController(CartService cartService, JwtUtil jwtUtil) {
        this.cartService = cartService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> getCart(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "userId", required = false) Long userId) {
        Long resolvedUserId = resolveUserId(authHeader, userId);
        if (resolvedUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing or invalid token"));
        }
        return ResponseEntity.ok(cartService.getDetailedCart(resolvedUserId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getCartByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(cartService.getDetailedCart(userId));
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToCart(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestBody AddCartItemRequest request) {
        Long resolvedUserId = resolveUserId(authHeader, request.userId());
        if (resolvedUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing or invalid token"));
        }

        try {
            return ResponseEntity.ok(cartService.addItem(resolvedUserId, request.productId(), request.quantity()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/item/{productId}")
    public ResponseEntity<?> updateItemQuantity(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long productId,
            @RequestBody UpdateQuantityRequest request) {
        Long resolvedUserId = resolveUserId(authHeader, request.userId());
        if (resolvedUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing or invalid token"));
        }

        try {
            return ResponseEntity.ok(cartService.updateItemQuantity(resolvedUserId, productId, request.quantity()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/item/{productId}")
    public ResponseEntity<?> removeItem(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long productId,
            @RequestParam(name = "userId", required = false) Long userId) {
        Long resolvedUserId = resolveUserId(authHeader, userId);
        if (resolvedUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing or invalid token"));
        }

        return ResponseEntity.ok(cartService.removeItem(resolvedUserId, productId));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearCart(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "userId", required = false) Long userId) {
        Long resolvedUserId = resolveUserId(authHeader, userId);
        if (resolvedUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing or invalid token"));
        }

        return ResponseEntity.ok(cartService.clearCart(resolvedUserId));
    }

    private Long resolveUserId(String authHeader, Long fallbackUserId) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String userId = jwtUtil.validateAndGetUserId(authHeader.substring(7));
            if (userId != null) {
                try {
                    return Long.parseLong(userId);
                } catch (NumberFormatException ignored) {
                    // fall through
                }
            }
        }

        return fallbackUserId;
    }

    private record AddCartItemRequest(
            Long userId,
            @NotNull(message = "productId is required") Long productId,
            Integer quantity) {
    }

    private record UpdateQuantityRequest(
            Long userId,
            Integer quantity) {
    }
}