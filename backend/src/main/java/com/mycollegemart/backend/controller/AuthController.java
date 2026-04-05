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
@RequestMapping({ "/api/auth", "/auth" })
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
            User user = userService.registerWithPassword(request.email(), request.password(), request.accountType());
            return ResponseEntity.status(HttpStatus.CREATED).body(buildUserResponse(user));
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
            UserService.PasswordAuthResult authResult = userService.authenticateWithPasswordDetailed(
                    request.email(),
                    request.password());

            if (!authResult.isAuthenticated()) {
                return switch (authResult.failureReason()) {
                    case ACCOUNT_NOT_FOUND -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("message", "Account does not exist. Create account to continue."));
                    case WRONG_PASSWORD -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Wrong password. Please try again."));
                    case PASSWORD_LOGIN_NOT_AVAILABLE -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message",
                                    "This account uses Google sign-in. Continue with Google to sign in."));
                    default -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Unable to sign in with email/password."));
                };
            }

            User user = authResult.user();

            if (request.accountType() != null && !request.accountType().isBlank()) {
                String requestedPortal = request.accountType().trim().toUpperCase();
                if (!"MASTER".equals(requestedPortal)
                        && !UserService.ACCOUNT_TYPE_MERCHANT.equals(requestedPortal)
                        && !UserService.ACCOUNT_TYPE_INDIVIDUAL.equals(requestedPortal)) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "Unsupported portal selection."));
                }

                if ("MASTER".equals(requestedPortal)) {
                    if (!userService.isMaster(user)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "Master access is required for this portal."));
                    }
                } else if (!userService.isMaster(user)) {
                    String userType = userService.normalizeAccountType(user.getAccountType());

                    if (!requestedPortal.equals(userType)) {
                        if (UserService.ACCOUNT_TYPE_MERCHANT.equals(userType)
                                && UserService.ACCOUNT_TYPE_INDIVIDUAL.equals(requestedPortal)) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("message",
                                            "This account is linked to Business / Merchant portal. Sign in using Business / Merchant."));
                        }

                        if (UserService.ACCOUNT_TYPE_INDIVIDUAL.equals(userType)
                                && UserService.ACCOUNT_TYPE_MERCHANT.equals(requestedPortal)) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("message",
                                            "This account is registered as Individual. Use Individual portal or request merchant access."));
                        }

                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "This account is not registered for the selected portal."));
                    }
                }
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
    public void startGoogleOAuth(
            @RequestParam(name = "accountType", required = false) String accountType,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        if (accountType != null && "MASTER".equalsIgnoreCase(accountType.trim())) {
            redirectWithError(response, "master_google_disabled");
            return;
        }

        if (!isGoogleConfiguredForOAuthCodeFlow()) {
            logger.error("Google OAuth code flow is not configured on backend");
            redirectWithError(response, "google_oauth_not_configured");
            return;
        }

        String redirectUri = resolveGoogleRedirectUri(request);
        String normalizedAccountType = userService.normalizeAccountType(accountType);

        String authUrl = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + encode(googleClientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&scope=" + encode("openid email profile")
                + "&state=" + encode(normalizedAccountType)
                + "&prompt=select_account";

        response.sendRedirect(authUrl);
    }

    @GetMapping("/google/callback")
    public void handleGoogleOAuthCallback(
            @RequestParam(name = "code", required = false) String code,
            @RequestParam(name = "error", required = false) String error,
            @RequestParam(name = "state", required = false) String state,
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

            User user = userService.findOrCreateGoogleUser(email, name, googleId, state);
            String jwt = jwtUtil.generateToken(user.getId(), user.getEmail());

            response.sendRedirect(frontendBaseUrl + "/#token=" + encode(jwt));
        } catch (IllegalStateException e) {
            logger.warn("Google OAuth rejected: {}", e.getMessage());
            redirectWithError(response, "master_google_disabled");
        } catch (Exception e) {
            logger.error("Google OAuth callback failed. Cause: {}", e.getMessage(), e);
            redirectWithError(response, "google_sign_in_failed");
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader(name = "Authorization", required = false) String authHeader) {
        try {
            Long userId = resolveUserId(authHeader);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid JWT");
            }

            User user = userService.findById(userId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            return ResponseEntity.ok(buildUserResponse(user));
        } catch (Exception e) {
            logger.error("Failed to fetch user. Cause: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to fetch user");
        }
    }

    @PostMapping("/account-type")
    public ResponseEntity<?> updateAccountType(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AccountTypeRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        try {
            User updatedUser = userService.updateAccountType(userId, request.accountType());
            return ResponseEntity.ok(buildUserResponse(updatedUser));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/merchant-profile")
    public ResponseEntity<?> updateMerchantProfile(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody MerchantProfileRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in"));
        }

        try {
            User updatedUser = userService.updateMerchantProfile(
                    userId,
                    request.shopName(),
                    request.shopTagline(),
                    request.shopDescription(),
                    request.shopPhone(),
                    request.shopCampusLocation());
            return ResponseEntity.ok(buildUserResponse(updatedUser));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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

        String requestPath = request.getRequestURI();
        String callbackPath = "/api/auth/google/callback";
        if (requestPath != null && requestPath.endsWith("/google/start")) {
            callbackPath = requestPath.substring(0, requestPath.length() - "/google/start".length())
                    + "/google/callback";
        }

        return ServletUriComponentsBuilder.fromRequestUri(request)
                .replacePath(callbackPath)
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

    private Map<String, Object> buildUserResponse(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("displayName", user.getDisplayName());
        response.put("isPrimeMember", user.isPrimeMember());
        response.put("primeExpiryDate", user.getPrimeExpiryDate());
        response.put("accountType", user.getAccountType());
        response.put("merchantVerificationStatus",
                userService.normalizeMerchantVerificationStatus(user.getMerchantVerificationStatus()));
        response.put("canManageListings", userService.canManageListings(user));
        response.put("isAdmin", userService.isAdmin(user));
        response.put("isMaster", userService.isMaster(user));
        response.put("shopName", user.getShopName());
        response.put("shopTagline", user.getShopTagline());
        response.put("shopDescription", user.getShopDescription());
        response.put("shopPhone", user.getShopPhone());
        response.put("shopCampusLocation", user.getShopCampusLocation());
        response.put("wishlistProductIds", user.getWishlistProductIds());
        return response;
    }

    private record AuthRequest(
            @NotBlank(message = "Email is required") @Email(message = "Please enter a valid email") String email,
            @NotBlank(message = "Password is required") String password,
            String accountType) {
    }

    private record AccountTypeRequest(
            @NotBlank(message = "accountType is required") String accountType) {
    }

    private record MerchantProfileRequest(
            @NotBlank(message = "shopName is required") String shopName,
            String shopTagline,
            String shopDescription,
            String shopPhone,
            @NotBlank(message = "shopCampusLocation is required") String shopCampusLocation) {
    }
}