package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.model.UserSettings;
import com.mycollegemart.backend.service.UserSettingsService;
import com.mycollegemart.backend.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final JwtUtil jwtUtil;
    private final UserSettingsService userSettingsService;

    @Autowired
    public SettingsController(JwtUtil jwtUtil, UserSettingsService userSettingsService) {
        this.jwtUtil = jwtUtil;
        this.userSettingsService = userSettingsService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUserSettings(
            @RequestHeader(name = "Authorization", required = false) String authHeader) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        try {
            UserSettingsService.SettingsSnapshot snapshot = userSettingsService.getSettings(userId);
            return ResponseEntity.ok(toResponse(snapshot.user(), snapshot.settings()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUserSettings(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdateSettingsRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        try {
            UserSettingsService.SettingsSnapshot snapshot = userSettingsService.updateSettings(
                    userId,
                    new UserSettingsService.SettingsUpdate(
                            request.displayName(),
                            request.phoneNumber(),
                            request.campusLocation(),
                            request.bio(),
                            request.emailNotifications(),
                            request.orderUpdates(),
                            request.marketingEmails(),
                            request.twoFactorEnabled(),
                            request.preferredLanguage(),
                            request.themeMode()));

            return ResponseEntity.ok(toResponse(snapshot.user(), snapshot.settings()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private Long resolveUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authHeader.substring(7);
        String userId = jwtUtil.validateAndGetUserId(token);
        if (userId == null) {
            return null;
        }

        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, Object> toResponse(User user, UserSettings settings) {
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("displayName", user.getDisplayName());
        profile.put("accountType", user.getAccountType());
        profile.put("isPrimeMember", user.isPrimeMember());
        profile.put("primeExpiryDate", user.getPrimeExpiryDate());

        Map<String, Object> preferences = new HashMap<>();
        preferences.put("phoneNumber", settings.getPhoneNumber());
        preferences.put("campusLocation", settings.getCampusLocation());
        preferences.put("bio", settings.getBio());
        preferences.put("emailNotifications", settings.isEmailNotifications());
        preferences.put("orderUpdates", settings.isOrderUpdates());
        preferences.put("marketingEmails", settings.isMarketingEmails());
        preferences.put("twoFactorEnabled", settings.isTwoFactorEnabled());
        preferences.put("preferredLanguage", settings.getPreferredLanguage());
        preferences.put("themeMode", settings.getThemeMode());

        return Map.of(
                "profile", profile,
                "preferences", preferences);
    }

    private record UpdateSettingsRequest(
            String displayName,
            String phoneNumber,
            String campusLocation,
            String bio,
            Boolean emailNotifications,
            Boolean orderUpdates,
            Boolean marketingEmails,
            Boolean twoFactorEnabled,
            String preferredLanguage,
            String themeMode) {
    }
}
