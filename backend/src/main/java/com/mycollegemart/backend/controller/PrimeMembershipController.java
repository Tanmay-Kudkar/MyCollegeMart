package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.service.PrimeMembershipConfigService;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/prime-membership")
public class PrimeMembershipController {

    private final PrimeMembershipConfigService primeMembershipConfigService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    @Autowired
    public PrimeMembershipController(
            PrimeMembershipConfigService primeMembershipConfigService,
            UserService userService,
            JwtUtil jwtUtil) {
        this.primeMembershipConfigService = primeMembershipConfigService;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(primeMembershipConfigService.getConfigPayload());
    }

    @PutMapping("/config")
    public ResponseEntity<?> updateConfig(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdatePrimeConfigRequest request) {
        User masterUser = resolveMasterUser(authHeader);
        if (masterUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Master admin access is required"));
        }

        try {
            return ResponseEntity
                    .ok(primeMembershipConfigService.updateConfig(new PrimeMembershipConfigService.UpdateInput(
                            request.primeMembershipYearlyPrice(),
                            request.assignmentStandardRegularPrice(),
                            request.assignmentStandardPrimePrice(),
                            request.assignmentExpressRegularPrice(),
                            request.assignmentExpressPrimePrice(),
                            request.assignmentUrgentRegularPrice(),
                            request.assignmentUrgentPrimePrice())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private User resolveMasterUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String userIdFromToken = jwtUtil.validateAndGetUserId(authHeader.substring(7));
        if (userIdFromToken == null) {
            return null;
        }

        Long userId;
        try {
            userId = Long.parseLong(userIdFromToken);
        } catch (NumberFormatException e) {
            return null;
        }

        User user = userService.findById(userId);
        if (user == null || !userService.isMaster(user)) {
            return null;
        }

        return user;
    }

    private record UpdatePrimeConfigRequest(
            @NotNull(message = "primeMembershipYearlyPrice is required") Double primeMembershipYearlyPrice,
            @NotNull(message = "assignmentStandardRegularPrice is required") Double assignmentStandardRegularPrice,
            @NotNull(message = "assignmentStandardPrimePrice is required") Double assignmentStandardPrimePrice,
            @NotNull(message = "assignmentExpressRegularPrice is required") Double assignmentExpressRegularPrice,
            @NotNull(message = "assignmentExpressPrimePrice is required") Double assignmentExpressPrimePrice,
            @NotNull(message = "assignmentUrgentRegularPrice is required") Double assignmentUrgentRegularPrice,
            @NotNull(message = "assignmentUrgentPrimePrice is required") Double assignmentUrgentPrimePrice) {
    }
}
