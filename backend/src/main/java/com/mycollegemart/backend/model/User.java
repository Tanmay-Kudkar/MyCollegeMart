package com.mycollegemart.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "users") // This explicitly names the table in the database
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    // ✅ CHANGE: Made nullable=true so users signing up with Google don't need a
    // password.
    @Column(nullable = true)
    private String password;

    private String displayName;

    private boolean isPrimeMember;

    private String primeExpiryDate;

    @Column(name = "account_type", nullable = false, length = 32)
    private String accountType = "INDIVIDUAL";

    @Column(name = "merchant_verification_status", nullable = false, length = 32)
    private String merchantVerificationStatus = "NOT_REQUIRED";

    @Column(name = "shop_name")
    private String shopName;

    @Column(name = "shop_tagline", length = 255)
    private String shopTagline;

    @Column(name = "shop_description", columnDefinition = "TEXT")
    private String shopDescription;

    @Column(name = "shop_phone", length = 32)
    private String shopPhone;

    @Column(name = "shop_campus_location", length = 255)
    private String shopCampusLocation;

    // ✅ ADDED: A new field to store the unique Google User ID.
    // This is a more reliable identifier than email.
    @Column(name = "google_id")
    private String googleId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_wishlist", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "product_id")
    private Set<Long> wishlistProductIds = new HashSet<>();
}