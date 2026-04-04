package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    public static final String ACCOUNT_TYPE_INDIVIDUAL = "INDIVIDUAL";
    public static final String ACCOUNT_TYPE_MERCHANT = "MERCHANT";
    public static final String MERCHANT_STATUS_NOT_REQUIRED = "NOT_REQUIRED";
    public static final String MERCHANT_STATUS_PENDING = "PENDING";
    public static final String MERCHANT_STATUS_APPROVED = "APPROVED";
    public static final String MERCHANT_STATUS_REJECTED = "REJECTED";

    // ✅ BEST PRACTICE: Use 'final' and constructor injection instead of field
    // injection.
    // This makes the dependency explicit and the class easier to test.
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Set<String> adminEmails;
    private final String masterEmail;
    private final String masterPassword;

    @Autowired
    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.emails:}") String adminEmailsConfig,
            @Value("${app.master.email:}") String masterEmailConfig,
            @Value("${app.master.password:}") String masterPasswordConfig) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmails = Arrays.stream((adminEmailsConfig == null ? "" : adminEmailsConfig).split(","))
                .map(this::normalizeEmail)
                .filter(email -> email != null && !email.isBlank())
                .collect(Collectors.toUnmodifiableSet());
        this.masterEmail = normalizeEmail(masterEmailConfig);
        this.masterPassword = masterPasswordConfig == null ? "" : masterPasswordConfig.trim();
    }

    @PostConstruct
    public void ensureMasterAccount() {
        if (masterEmail == null || masterEmail.isBlank()) {
            return;
        }

        if (masterPassword.isBlank()) {
            logger.warn(
                    "Master email is configured but APP_MASTER_PASSWORD is empty. Skipping master account bootstrap.");
            return;
        }

        User masterUser = userRepository.findByEmail(masterEmail).orElseGet(User::new);
        if (masterUser.getId() == null) {
            masterUser.setEmail(masterEmail);
            masterUser.setDisplayName("Master Admin");
            masterUser.setPrimeMember(true);
        }

        if (!hasPassword(masterUser) || !passwordEncoder.matches(masterPassword, masterUser.getPassword())) {
            masterUser.setPassword(passwordEncoder.encode(masterPassword));
        }
        masterUser.setAccountType(ACCOUNT_TYPE_MERCHANT);
        masterUser.setMerchantVerificationStatus(MERCHANT_STATUS_APPROVED);

        if (masterUser.getDisplayName() == null || masterUser.getDisplayName().isBlank()) {
            masterUser.setDisplayName("Master Admin");
        }

        userRepository.save(masterUser);
    }

    public Optional<User> findByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(normalizedEmail);
    }

    public User registerWithPassword(String email, String rawPassword) {
        return registerWithPassword(email, rawPassword, ACCOUNT_TYPE_INDIVIDUAL);
    }

    public User registerWithPassword(String email, String rawPassword, String accountType) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        String normalizedAccountType = normalizeAccountType(accountType);

        Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            if (hasPassword(existingUser)) {
                throw new IllegalStateException("Email already registered.");
            }

            existingUser.setPassword(passwordEncoder.encode(rawPassword));
            existingUser.setAccountType(normalizedAccountType);
            existingUser.setMerchantVerificationStatus(resolveVerificationStatusForAccountType(
                    normalizedAccountType,
                    existingUser.getMerchantVerificationStatus()));
            if (existingUser.getDisplayName() == null || existingUser.getDisplayName().isBlank()) {
                existingUser.setDisplayName(extractDisplayName(normalizedEmail));
            }
            return userRepository.save(existingUser);
        }

        User newUser = new User();
        newUser.setEmail(normalizedEmail);
        newUser.setPassword(passwordEncoder.encode(rawPassword));
        newUser.setDisplayName(extractDisplayName(normalizedEmail));
        newUser.setPrimeMember(false);
        newUser.setAccountType(normalizedAccountType);
        newUser.setMerchantVerificationStatus(resolveVerificationStatusForAccountType(normalizedAccountType, null));
        return userRepository.save(newUser);
    }

    public User authenticateWithPassword(String email, String rawPassword) {
        Optional<User> userOpt = findByEmail(email);
        if (userOpt.isEmpty()) {
            return null;
        }

        User user = userOpt.get();
        if (!hasPassword(user)) {
            return null;
        }

        return passwordEncoder.matches(rawPassword, user.getPassword()) ? user : null;
    }

    /**
     * Finds a user by email. If they don't exist, creates a new account for them.
     * This logic is specifically for handling Google Sign-In.
     */
    public User findOrCreateGoogleUser(String email, String name, String googleId) {
        return findOrCreateGoogleUser(email, name, googleId, ACCOUNT_TYPE_INDIVIDUAL);
    }

    public User findOrCreateGoogleUser(String email, String name, String googleId, String accountType) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedAccountType = normalizeAccountType(accountType);
        Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);

        if (existingUserOpt.isPresent()) {
            // User already exists, return them.
            User existingUser = existingUserOpt.get();
            // ✅ IMPROVEMENT: If an existing user signs in with Google for the first time,
            // update their account with their Google ID for future reference.
            if (existingUser.getGoogleId() == null) {
                existingUser.setGoogleId(googleId);
                userRepository.save(existingUser);
            }

            String existingAccountType = normalizeAccountType(existingUser.getAccountType());
            if (ACCOUNT_TYPE_INDIVIDUAL.equals(existingAccountType)
                    && ACCOUNT_TYPE_MERCHANT.equals(normalizedAccountType)) {
                existingUser.setAccountType(ACCOUNT_TYPE_MERCHANT);
                existingUser.setMerchantVerificationStatus(resolveVerificationStatusForAccountType(
                        ACCOUNT_TYPE_MERCHANT,
                        existingUser.getMerchantVerificationStatus()));
                userRepository.save(existingUser);
            }
            return existingUser;
        } else {
            // User does not exist, create a new one.
            User newUser = new User();
            newUser.setEmail(normalizedEmail);
            newUser.setDisplayName((name == null || name.isBlank()) ? extractDisplayName(normalizedEmail) : name);
            newUser.setGoogleId(googleId); // Set the Google ID
            newUser.setPassword(null); // No password for Google users
            newUser.setPrimeMember(false);
            newUser.setAccountType(normalizedAccountType);
            newUser.setMerchantVerificationStatus(resolveVerificationStatusForAccountType(normalizedAccountType, null));
            // Save the newly created user to the database.
            return userRepository.save(newUser);
        }
    }

    /**
     * Finds a user by their primary key ID.
     */
    public User findById(String idStr) {
        if (idStr == null)
            return null;
        try {
            Long id = Long.parseLong(idStr);
            // .orElse(null) returns the user if found, otherwise returns null.
            return userRepository.findById(id).orElse(null);
        } catch (NumberFormatException e) {
            // Handle cases where the ID is not a valid number.
            return null;
        }
    }

    public User findById(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).orElse(null);
    }

    public User activatePrimeMembership(Long userId) {
        User user = findById(userId);
        if (user == null) {
            return null;
        }

        user.setPrimeMember(true);
        user.setPrimeExpiryDate(Instant.now().plus(365, ChronoUnit.DAYS).toString());
        return userRepository.save(user);
    }

    public User updateAccountType(Long userId, String accountType) {
        User user = findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        if (isMaster(user)) {
            user.setAccountType(ACCOUNT_TYPE_MERCHANT);
            user.setMerchantVerificationStatus(MERCHANT_STATUS_APPROVED);
            return userRepository.save(user);
        }

        String normalizedAccountType = normalizeAccountType(accountType);
        user.setAccountType(normalizedAccountType);
        user.setMerchantVerificationStatus(resolveVerificationStatusForAccountType(
                normalizedAccountType,
                user.getMerchantVerificationStatus()));
        return userRepository.save(user);
    }

    public User updateMerchantProfile(
            Long userId,
            String shopName,
            String shopTagline,
            String shopDescription,
            String shopPhone,
            String shopCampusLocation) {
        User user = findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        if (!isMerchant(user)) {
            throw new IllegalStateException("Only merchant accounts can update shop profile");
        }

        String normalizedShopName = trimToNull(shopName);
        String normalizedTagline = trimToNull(shopTagline);
        String normalizedDescription = trimToNull(shopDescription);
        String normalizedPhone = trimToNull(shopPhone);
        String normalizedCampusLocation = trimToNull(shopCampusLocation);

        if (normalizedShopName == null || normalizedShopName.length() < 3) {
            throw new IllegalArgumentException("Shop name must be at least 3 characters");
        }

        if (normalizedDescription != null && normalizedDescription.length() < 20) {
            throw new IllegalArgumentException("Shop description should be at least 20 characters");
        }

        if (normalizedPhone != null && !normalizedPhone.matches("^[0-9+()\\- ]{7,16}$")) {
            throw new IllegalArgumentException("Enter a valid contact number");
        }

        if (normalizedCampusLocation == null || normalizedCampusLocation.length() < 3) {
            throw new IllegalArgumentException("Campus pickup location is required");
        }

        user.setShopName(normalizedShopName);
        user.setShopTagline(normalizedTagline);
        user.setShopDescription(normalizedDescription);
        user.setShopPhone(normalizedPhone);
        user.setShopCampusLocation(normalizedCampusLocation);
        String currentStatus = normalizeMerchantVerificationStatus(user.getMerchantVerificationStatus());
        if (!MERCHANT_STATUS_APPROVED.equals(currentStatus)) {
            user.setMerchantVerificationStatus(MERCHANT_STATUS_PENDING);
        }
        return userRepository.save(user);
    }

    public boolean isMaster(User user) {
        if (user == null || user.getEmail() == null || masterEmail == null || masterEmail.isBlank()) {
            return false;
        }

        return masterEmail.equals(normalizeEmail(user.getEmail()));
    }

    public boolean isAdmin(User user) {
        if (user == null || user.getEmail() == null) {
            return false;
        }

        if (isMaster(user)) {
            return true;
        }

        return adminEmails.contains(normalizeEmail(user.getEmail()));
    }

    public List<Map<String, Object>> getMerchantsByVerificationStatus(String status) {
        String normalizedStatus = normalizeMerchantVerificationStatus(status);
        return userRepository
                .findByAccountTypeIgnoreCaseAndMerchantVerificationStatusIgnoreCaseOrderByIdAsc(
                        ACCOUNT_TYPE_MERCHANT,
                        normalizedStatus)
                .stream()
                .map(this::mapMerchantSummary)
                .toList();
    }

    public Map<String, Object> updateMerchantVerificationStatus(Long merchantUserId, String status) {
        User merchant = findById(merchantUserId);
        if (merchant == null) {
            throw new IllegalArgumentException("Merchant account not found");
        }

        if (!isMerchant(merchant)) {
            throw new IllegalArgumentException("Selected account is not a merchant");
        }

        String normalizedStatus = normalizeMerchantVerificationStatus(status);
        if (!MERCHANT_STATUS_APPROVED.equals(normalizedStatus) && !MERCHANT_STATUS_REJECTED.equals(normalizedStatus)) {
            throw new IllegalArgumentException("Invalid merchant status update");
        }

        merchant.setMerchantVerificationStatus(normalizedStatus);
        User saved = userRepository.save(merchant);
        return mapMerchantSummary(saved);
    }

    public String normalizeAccountType(String accountType) {
        if (accountType == null || accountType.isBlank()) {
            return ACCOUNT_TYPE_INDIVIDUAL;
        }

        String normalized = accountType.trim().toUpperCase(Locale.ROOT);
        return ACCOUNT_TYPE_MERCHANT.equals(normalized)
                ? ACCOUNT_TYPE_MERCHANT
                : ACCOUNT_TYPE_INDIVIDUAL;
    }

    public boolean isMerchant(User user) {
        if (user == null) {
            return false;
        }

        return ACCOUNT_TYPE_MERCHANT.equalsIgnoreCase(user.getAccountType());
    }

    public boolean isMerchantVerified(User user) {
        if (!isMerchant(user)) {
            return false;
        }

        return MERCHANT_STATUS_APPROVED.equalsIgnoreCase(user.getMerchantVerificationStatus());
    }

    public boolean canManageListings(User user) {
        return isMaster(user) || isMerchantVerified(user);
    }

    public String normalizeMerchantVerificationStatus(String status) {
        if (status == null || status.isBlank()) {
            return MERCHANT_STATUS_NOT_REQUIRED;
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case MERCHANT_STATUS_PENDING -> MERCHANT_STATUS_PENDING;
            case MERCHANT_STATUS_APPROVED -> MERCHANT_STATUS_APPROVED;
            case MERCHANT_STATUS_REJECTED -> MERCHANT_STATUS_REJECTED;
            default -> MERCHANT_STATUS_NOT_REQUIRED;
        };
    }

    public Set<Long> getWishlist(Long userId) {
        User user = findById(userId);
        if (user == null) {
            return Set.of();
        }
        return new HashSet<>(user.getWishlistProductIds());
    }

    public Set<Long> addToWishlist(Long userId, Long productId) {
        User user = findById(userId);
        if (user == null) {
            return Set.of();
        }

        user.getWishlistProductIds().add(productId);
        userRepository.save(user);
        return new HashSet<>(user.getWishlistProductIds());
    }

    public Set<Long> removeFromWishlist(Long userId, Long productId) {
        User user = findById(userId);
        if (user == null) {
            return Set.of();
        }

        user.getWishlistProductIds().remove(productId);
        userRepository.save(user);
        return new HashSet<>(user.getWishlistProductIds());
    }

    public Set<Long> syncWishlist(Long userId, Set<Long> incomingIds) {
        User user = findById(userId);
        if (user == null) {
            return Set.of();
        }

        Set<Long> merged = new HashSet<>(user.getWishlistProductIds());
        if (incomingIds != null) {
            merged.addAll(incomingIds);
        }
        user.setWishlistProductIds(merged);
        userRepository.save(user);
        return new HashSet<>(merged);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasPassword(User user) {
        return user.getPassword() != null && !user.getPassword().isBlank();
    }

    private String resolveVerificationStatusForAccountType(String accountType, String currentStatus) {
        if (!ACCOUNT_TYPE_MERCHANT.equalsIgnoreCase(accountType)) {
            return MERCHANT_STATUS_NOT_REQUIRED;
        }

        String normalizedCurrentStatus = normalizeMerchantVerificationStatus(currentStatus);
        if (MERCHANT_STATUS_APPROVED.equals(normalizedCurrentStatus)) {
            return MERCHANT_STATUS_APPROVED;
        }

        return MERCHANT_STATUS_PENDING;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String extractDisplayName(String email) {
        if (email == null || email.isBlank()) {
            return "Student";
        }

        String localPart = email.split("@", 2)[0].trim();
        if (localPart.isBlank()) {
            return "Student";
        }

        return Character.toUpperCase(localPart.charAt(0)) + localPart.substring(1);
    }

    private Map<String, Object> mapMerchantSummary(User merchant) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", merchant.getId());
        response.put("email", merchant.getEmail());
        response.put("displayName", merchant.getDisplayName());
        response.put("shopName", merchant.getShopName());
        response.put("shopTagline", merchant.getShopTagline());
        response.put("shopPhone", merchant.getShopPhone());
        response.put("shopCampusLocation", merchant.getShopCampusLocation());
        response.put("merchantVerificationStatus",
                normalizeMerchantVerificationStatus(merchant.getMerchantVerificationStatus()));
        response.put("canManageListings", canManageListings(merchant));
        return response;
    }
}