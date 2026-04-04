package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.model.UserSettings;
import com.mycollegemart.backend.repository.UserRepository;
import com.mycollegemart.backend.repository.UserSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Set;

@Service
public class UserSettingsService {

    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("EN", "HI", "MR");
    private static final Set<String> SUPPORTED_THEME_MODES = Set.of("SYSTEM", "LIGHT", "DARK");

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;

    @Autowired
    public UserSettingsService(UserRepository userRepository, UserSettingsRepository userSettingsRepository) {
        this.userRepository = userRepository;
        this.userSettingsRepository = userSettingsRepository;
    }

    public SettingsSnapshot getSettings(Long userId) {
        User user = findUserOrThrow(userId);
        UserSettings settings = getOrCreateSettings(userId);
        return new SettingsSnapshot(user, settings);
    }

    public SettingsSnapshot updateSettings(Long userId, SettingsUpdate update) {
        User user = findUserOrThrow(userId);
        UserSettings settings = getOrCreateSettings(userId);

        if (update.displayName() != null) {
            user.setDisplayName(normalizeRequiredText(update.displayName(), 255, "displayName"));
            user = userRepository.save(user);
        }

        if (update.phoneNumber() != null) {
            settings.setPhoneNumber(normalizeOptionalText(update.phoneNumber(), 32, "phoneNumber"));
        }

        if (update.campusLocation() != null) {
            settings.setCampusLocation(normalizeOptionalText(update.campusLocation(), 255, "campusLocation"));
        }

        if (update.bio() != null) {
            settings.setBio(normalizeOptionalText(update.bio(), 2000, "bio"));
        }

        if (update.emailNotifications() != null) {
            settings.setEmailNotifications(update.emailNotifications());
        }

        if (update.orderUpdates() != null) {
            settings.setOrderUpdates(update.orderUpdates());
        }

        if (update.marketingEmails() != null) {
            settings.setMarketingEmails(update.marketingEmails());
        }

        if (update.twoFactorEnabled() != null) {
            settings.setTwoFactorEnabled(update.twoFactorEnabled());
        }

        if (update.preferredLanguage() != null) {
            settings.setPreferredLanguage(normalizePreferredLanguage(update.preferredLanguage()));
        }

        if (update.themeMode() != null) {
            settings.setThemeMode(normalizeThemeMode(update.themeMode()));
        }

        settings = userSettingsRepository.save(settings);

        return new SettingsSnapshot(user, settings);
    }

    private User findUserOrThrow(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User is required");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private UserSettings getOrCreateSettings(Long userId) {
        return userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings defaults = new UserSettings();
                    defaults.setUserId(userId);
                    defaults.setEmailNotifications(true);
                    defaults.setOrderUpdates(true);
                    defaults.setMarketingEmails(false);
                    defaults.setTwoFactorEnabled(false);
                    defaults.setPreferredLanguage("EN");
                    defaults.setThemeMode("SYSTEM");
                    return userSettingsRepository.save(defaults);
                });
    }

    private String normalizeRequiredText(String value, int maxLength, String fieldName) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException(fieldName + " cannot be blank");
        }
        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " is too long");
        }
        return trimmed;
    }

    private String normalizeOptionalText(String value, int maxLength, String fieldName) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }

        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " is too long");
        }

        return trimmed;
    }

    private String normalizePreferredLanguage(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "EN";
        }

        if (!SUPPORTED_LANGUAGES.contains(normalized)) {
            throw new IllegalArgumentException("preferredLanguage is not supported");
        }

        return normalized;
    }

    private String normalizeThemeMode(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "SYSTEM";
        }

        if (!SUPPORTED_THEME_MODES.contains(normalized)) {
            throw new IllegalArgumentException("themeMode is not supported");
        }

        return normalized;
    }

    public record SettingsUpdate(
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

    public record SettingsSnapshot(User user, UserSettings settings) {
    }
}
