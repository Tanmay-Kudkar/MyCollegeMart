package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.service.SellerService;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/seller")
public class SellerController {

    private final SellerService sellerService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    @Autowired
    public SellerController(SellerService sellerService, UserService userService, JwtUtil jwtUtil) {
        this.sellerService = sellerService;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @RequestHeader(name = "Authorization", required = false) String authHeader) {
        User listingManager = resolveListingManager(authHeader);
        if (listingManager == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Verified merchant or admin access is required for seller dashboard"));
        }

        return ResponseEntity.ok(sellerService.getDashboardOverview(
                listingManager.getId(),
                userService.isAdmin(listingManager)));
    }

    private User resolveListingManager(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String userId = jwtUtil.validateAndGetUserId(authHeader.substring(7));
        if (userId == null) {
            return null;
        }

        Long parsedUserId;
        try {
            parsedUserId = Long.parseLong(userId);
        } catch (NumberFormatException e) {
            return null;
        }

        User user = userService.findById(parsedUserId);
        if (user == null || (!userService.canManageListings(user) && !userService.isAdmin(user))) {
            return null;
        }

        return user;
    }
}
