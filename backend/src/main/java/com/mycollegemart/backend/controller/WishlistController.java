package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.service.WishlistService;
import com.mycollegemart.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;
    private final JwtUtil jwtUtil;

    @Autowired
    public WishlistController(WishlistService wishlistService, JwtUtil jwtUtil) {
        this.wishlistService = wishlistService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public ResponseEntity<?> getWishlist(@RequestHeader(name = "Authorization", required = false) String authHeader) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        return ResponseEntity.ok(Map.of("productIds", wishlistService.getWishlist(userId)));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<?> addToWishlist(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long productId) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        try {
            return ResponseEntity.ok(Map.of("productIds", wishlistService.addToWishlist(userId, productId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<?> removeFromWishlist(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long productId) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        return ResponseEntity.ok(Map.of("productIds", wishlistService.removeFromWishlist(userId, productId)));
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncWishlist(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) WishlistSyncRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        Set<Long> incomingIds = request == null ? Set.of() : request.productIds();
        return ResponseEntity.ok(Map.of("productIds", wishlistService.syncWishlist(userId, incomingIds)));
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

    private record WishlistSyncRequest(Set<Long> productIds) {
    }
}
