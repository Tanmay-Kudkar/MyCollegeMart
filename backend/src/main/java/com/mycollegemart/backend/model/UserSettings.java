package com.mycollegemart.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "user_settings")
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "phone_number", length = 32)
    private String phoneNumber;

    @Column(name = "campus_location", length = 255)
    private String campusLocation;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "email_notifications", nullable = false)
    private boolean emailNotifications = true;

    @Column(name = "order_updates", nullable = false)
    private boolean orderUpdates = true;

    @Column(name = "marketing_emails", nullable = false)
    private boolean marketingEmails = false;

    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled = false;

    @Column(name = "preferred_language", nullable = false, length = 16)
    private String preferredLanguage = "EN";

    @Column(name = "theme_mode", nullable = false, length = 16)
    private String themeMode = "SYSTEM";
}
