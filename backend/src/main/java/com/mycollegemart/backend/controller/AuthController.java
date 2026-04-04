package com.mycollegemart.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final String googleClientId;
    private final String googleClientSecret;
    private final String googleRedirectUri;
    private final String frontendBaseUrl;

    @Autowired
    public AuthController(
            UserService userService,
            JwtUtil jwtUtil,
            @Value("${google.clientId:}") String googleClientId,
            @Value("${google.clientSecret:}") String googleClientSecret,
            @Value("${google.redirectUri:}") String googleRedirectUri,
            @Value("${app.frontend.base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
        this.googleRedirectUri = googleRedirectUri;
        this.frontendBaseUrl = stripTrailingSlash(frontendBaseUrl);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthRequest request) {
        try {
            User user = userService.registerWithPassword(request.email(), request.password());
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("displayName", user.getDisplayName());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Registration failed. Cause: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to register user"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        try {
            User user = userService.authenticateWithPassword(request.email(), request.password());
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Invalid email or password"));
            }

            String token = jwtUtil.generateToken(user.getId(), user.getEmail());
            return ResponseEntity.ok(Map.of("token", token));
        } catch (Exception e) {
            logger.error("Login failed. Cause: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to sign in"));
        }
    }

    @GetMapping("/google/start")
    public void startGoogleOAuth(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!isGoogleConfiguredForOAuthCodeFlow()) {
            logger.error("Google OAuth code flow is not configured on backend");
            redirectWithError(response, "google_oauth_not_configured");
            return;
        }

        String redirectUri = resolveGoogleRedirectUri(request);

        String authUrl = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + encode(googleClientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&scope=" + encode("openid email profile")
                + "&prompt=select_account";

        response.sendRedirect(authUrl);
    }

    @GetMapping("/google/callback")
    public void handleGoogleOAuthCallback(
            @RequestParam(name = "code", required = false) String code,
            @RequestParam(name = "error", required = false) String error,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        if (error != null && !error.isBlank()) {
            redirectWithError(response, "google_access_denied");
            return;
        }

        if (code == null || code.isBlank()) {
            redirectWithError(response, "google_code_missing");
            return;
        }

        if (!isGoogleConfiguredForOAuthCodeFlow()) {
            redirectWithError(response, "google_oauth_not_configured");
            return;
        }

        String redirectUri = resolveGoogleRedirectUri(request);

        try {
            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    googleClientId,
                    googleClientSecret,
                    code,
                    redirectUri).execute();

            String idTokenValue = tokenResponse.getIdToken();
            if (idTokenValue == null || idTokenValue.isBlank()) {
                redirectWithError(response, "google_id_token_missing");
                return;
            }

            GoogleIdToken idToken = verifyGoogleIdToken(idTokenValue);
            if (idToken == null) {
                redirectWithError(response, "google_id_token_invalid");
                return;
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String googleId = payload.getSubject();

            User user = userService.findOrCreateGoogleUser(email, name, googleId);
            String jwt = jwtUtil.generateToken(user.getId(), user.getEmail());

            response.sendRedirect(frontendBaseUrl + "/#token=" + encode(jwt));
        } catch (Exception e) {
            logger.error("Google OAuth callback failed. Cause: {}", e.getMessage(), e);
            redirectWithError(response, "google_sign_in_failed");
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader(name = "Authorization", required = false) String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing or invalid token");
            }

            String token = authHeader.substring(7);
            String userId = jwtUtil.validateAndGetUserId(token);

            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid JWT");
            }

            User user = userService.findById(userId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("displayName", user.getDisplayName());
            response.put("isPrimeMember", user.isPrimeMember());
            response.put("primeExpiryDate", user.getPrimeExpiryDate());
            response.put("wishlistProductIds", user.getWishlistProductIds());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to fetch user. Cause: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to fetch user");
        }
    }

    private GoogleIdToken verifyGoogleIdToken(String idToken) throws Exception {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        return verifier.verify(idToken);
    }

    private boolean isGoogleConfiguredForOAuthCodeFlow() {
        return googleClientId != null
                && !googleClientId.isBlank()
                && googleClientSecret != null
                && !googleClientSecret.isBlank();
    }

    private String resolveGoogleRedirectUri(HttpServletRequest request) {
        if (googleRedirectUri != null && !googleRedirectUri.isBlank()) {
            return googleRedirectUri.trim();
        }

        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath("/api/auth/google/callback")
                .replaceQuery(null)
                .build()
                .toUriString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String stripTrailingSlash(String value) {
        if (value == null) {
            return "";
        }

        String trimmed = value.trim();
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }

        return trimmed;
    }

    private void redirectWithError(HttpServletResponse response, String errorCode) throws IOException {
        response.sendRedirect(frontendBaseUrl + "/#authError=" + encode(errorCode));
    }

    private record AuthRequest(
            @NotBlank(message = "Email is required") @Email(message = "Please enter a valid email") String email,
            @NotBlank(message = "Password is required") String password) {
    }
}