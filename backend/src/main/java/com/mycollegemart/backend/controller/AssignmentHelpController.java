package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.AssignmentHelpRequest;
import com.mycollegemart.backend.service.AssignmentHelpService;
import com.mycollegemart.backend.util.JwtUtil;
import com.razorpay.RazorpayException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assignment-help")
public class AssignmentHelpController {

    private final AssignmentHelpService assignmentHelpService;
    private final JwtUtil jwtUtil;

    @Autowired
    public AssignmentHelpController(AssignmentHelpService assignmentHelpService, JwtUtil jwtUtil) {
        this.assignmentHelpService = assignmentHelpService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping(value = "/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitRequest(
            @RequestParam(value = "skillServiceId", required = false) Long skillServiceId,
            @RequestParam("serviceType") String serviceType,
            @RequestParam("subject") String subject,
            @RequestParam("topic") String topic,
            @RequestParam("description") String description,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestParam("deadline") String deadline,
            @RequestParam("totalAmount") Double totalAmount,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {

        AssignmentHelpRequest request = new AssignmentHelpRequest();
        request.setSkillServiceId(skillServiceId);
        request.setServiceType(serviceType);
        request.setSubject(subject);
        request.setTopic(topic);
        request.setDescription(description);
        request.setBranch(branch);
        request.setSemester(semester);
        request.setDeadline(deadline);
        request.setTotalAmount(totalAmount);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(assignmentHelpService.createRequest(request, files));
    }

    @PostMapping(value = "/checkout/create-order", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createCheckoutOrder(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(value = "skillServiceId", required = false) Long skillServiceId,
            @RequestParam("serviceType") String serviceType,
            @RequestParam("subject") String subject,
            @RequestParam("topic") String topic,
            @RequestParam("description") String description,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestParam("deadline") String deadline,
            @RequestParam("totalAmount") Double totalAmount,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to continue"));
        }

        AssignmentHelpRequest request = new AssignmentHelpRequest();
        request.setSkillServiceId(skillServiceId);
        request.setServiceType(serviceType);
        request.setSubject(subject);
        request.setTopic(topic);
        request.setDescription(description);
        request.setBranch(branch);
        request.setSemester(semester);
        request.setDeadline(deadline);
        request.setTotalAmount(totalAmount);

        try {
            return ResponseEntity.ok(assignmentHelpService.createCheckoutOrder(userId, request, files));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", e.getMessage()));
        } catch (RazorpayException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Failed to create payment order"));
        }
    }

    @PostMapping("/checkout/verify-payment")
    public ResponseEntity<?> verifyCheckoutPayment(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @Valid @RequestBody VerifyCheckoutPaymentRequest request) {
        Long userId = resolveUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please sign in to continue"));
        }

        try {
            return ResponseEntity.ok(assignmentHelpService.verifyCheckoutPayment(
                    userId,
                    request.requestId(),
                    request.razorpayOrderId(),
                    request.razorpayPaymentId(),
                    request.razorpaySignature()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getRequests() {
        return ResponseEntity.ok(assignmentHelpService.getRequests());
    }

    private Long resolveUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String userIdFromToken = jwtUtil.validateAndGetUserId(authHeader.substring(7));
        if (userIdFromToken == null) {
            return null;
        }

        try {
            return Long.parseLong(userIdFromToken);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record VerifyCheckoutPaymentRequest(
            @NotNull(message = "requestId is required") Long requestId,
            @NotBlank(message = "razorpayOrderId is required") String razorpayOrderId,
            @NotBlank(message = "razorpayPaymentId is required") String razorpayPaymentId,
            @NotBlank(message = "razorpaySignature is required") String razorpaySignature) {
    }
}
