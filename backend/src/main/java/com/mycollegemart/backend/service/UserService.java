package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class UserService {

    // ✅ BEST PRACTICE: Use 'final' and constructor injection instead of field
    // injection.
    // This makes the dependency explicit and the class easier to test.
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<User> findByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(normalizedEmail);
    }

    public User registerWithPassword(String email, String rawPassword) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            if (hasPassword(existingUser)) {
                throw new IllegalStateException("Email already registered.");
            }

            existingUser.setPassword(passwordEncoder.encode(rawPassword));
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
        String normalizedEmail = normalizeEmail(email);
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
            return existingUser;
        } else {
            // User does not exist, create a new one.
            User newUser = new User();
            newUser.setEmail(normalizedEmail);
            newUser.setDisplayName((name == null || name.isBlank()) ? extractDisplayName(normalizedEmail) : name);
            newUser.setGoogleId(googleId); // Set the Google ID
            newUser.setPassword(null); // No password for Google users
            newUser.setPrimeMember(false);
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
}