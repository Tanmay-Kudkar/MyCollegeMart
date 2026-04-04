package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.AssignmentHelpRequest;
import com.mycollegemart.backend.repository.AssignmentHelpRequestRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class AssignmentHelpService {

    private static final String OWNER_TYPE = "ASSIGNMENT_HELP_REQUEST";

    private final AssignmentHelpRequestRepository assignmentHelpRequestRepository;
    private final MediaAssetService mediaAssetService;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;

    @Autowired
    public AssignmentHelpService(
            AssignmentHelpRequestRepository assignmentHelpRequestRepository,
            MediaAssetService mediaAssetService,
            @Value("${razorpay.key-id:}") String razorpayKeyId,
            @Value("${razorpay.key-secret:}") String razorpayKeySecret) {
        this.assignmentHelpRequestRepository = assignmentHelpRequestRepository;
        this.mediaAssetService = mediaAssetService;
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
    }

    public Map<String, Object> createRequest(AssignmentHelpRequest request, List<MultipartFile> files) {
        normalize(request);
        request.setStatus("SUBMITTED");
        request.setPaymentMethod("DIRECT");
        request.setPaymentStatus("PENDING");
        AssignmentHelpRequest saved = assignmentHelpRequestRepository.save(request);

        storeFiles(saved, files);

        return toResponse(saved);
    }

    public Map<String, Object> createCheckoutOrder(Long userId, AssignmentHelpRequest request,
            List<MultipartFile> files)
            throws RazorpayException {
        if (userId == null) {
            throw new IllegalArgumentException("Please sign in to continue");
        }

        normalize(request);
        if (request.getTotalAmount() == null || request.getTotalAmount() <= 0) {
            throw new IllegalArgumentException("Invalid request amount");
        }
        if (!isRazorpayConfigured()) {
            throw new IllegalStateException("Razorpay is not configured on backend");
        }

        request.setUserId(userId);
        request.setStatus("PAYMENT_PENDING");
        request.setPaymentMethod("ONLINE");
        request.setPaymentStatus("PENDING");
        request.setAmountPaid(0.0);

        AssignmentHelpRequest saved = assignmentHelpRequestRepository.save(request);
        storeFiles(saved, files);

        RazorpayClient razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject options = new JSONObject();
        options.put("amount", toPaise(saved.getTotalAmount()));
        options.put("currency", saved.getCurrency());
        options.put("receipt", "mcm_ah_" + saved.getId());

        Order razorpayOrder = razorpayClient.orders.create(options);
        saved.setRazorpayOrderId(razorpayOrder.get("id"));
        assignmentHelpRequestRepository.save(saved);

        Map<String, Object> payload = new HashMap<>();
        payload.put("requiresPayment", true);
        payload.put("requestId", saved.getId());
        payload.put("serviceType", saved.getServiceType());
        payload.put("subject", saved.getSubject());
        payload.put("deadline", saved.getDeadline());
        payload.put("amountDue", saved.getTotalAmount());
        payload.put("amount", toPaise(saved.getTotalAmount()));
        payload.put("currency", saved.getCurrency());
        payload.put("keyId", razorpayKeyId);
        payload.put("razorpayOrderId", saved.getRazorpayOrderId());
        return payload;
    }

    public Map<String, Object> verifyCheckoutPayment(
            Long userId,
            Long requestId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {
        AssignmentHelpRequest request = assignmentHelpRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment request not found"));

        if (request.getUserId() == null || !Objects.equals(request.getUserId(), userId)) {
            throw new IllegalArgumentException("Request does not belong to this user");
        }

        if (!Objects.equals(request.getRazorpayOrderId(), razorpayOrderId)) {
            throw new IllegalArgumentException("Invalid Razorpay order reference");
        }

        String generatedSignature = generateSignature(razorpayOrderId, razorpayPaymentId);
        if (!Objects.equals(generatedSignature, razorpaySignature)) {
            throw new IllegalArgumentException("Invalid payment signature");
        }

        request.setPaymentStatus("PAID");
        request.setStatus("SUBMITTED");
        request.setAmountPaid(roundCurrency(request.getTotalAmount()));
        request.setRazorpayPaymentId(razorpayPaymentId);
        request.setRazorpaySignature(razorpaySignature);
        AssignmentHelpRequest saved = assignmentHelpRequestRepository.save(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("success", true);
        payload.put("requestId", saved.getId());
        payload.put("paymentId", saved.getRazorpayPaymentId());
        payload.put("paymentStatus", saved.getPaymentStatus());
        payload.put("status", saved.getStatus());
        return payload;
    }

    public List<Map<String, Object>> getRequests() {
        return assignmentHelpRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toResponse)
                .toList();
    }

    private void storeFiles(AssignmentHelpRequest saved, List<MultipartFile> files) {
        if (files != null && !files.isEmpty()) {
            int order = 0;
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                mediaAssetService.storeSingle(OWNER_TYPE, saved.getId(), detectMediaType(file.getContentType()), file,
                        order);
                order += 1;
            }
        }
    }

    private void normalize(AssignmentHelpRequest request) {
        if (request.getServiceType() == null || request.getServiceType().isBlank()) {
            request.setServiceType("Assignment");
        }
        if (request.getBranch() == null || request.getBranch().isBlank()) {
            request.setBranch("All Branches");
        }
        if (request.getSemester() == null || request.getSemester().isBlank()) {
            request.setSemester("1");
        }
        if (request.getDeadline() == null || request.getDeadline().isBlank()) {
            request.setDeadline("Standard");
        }
        if (request.getTotalAmount() == null || request.getTotalAmount() < 0) {
            request.setTotalAmount(0.0);
        }
        if (request.getAmountPaid() == null || request.getAmountPaid() < 0) {
            request.setAmountPaid(0.0);
        }
        if (request.getCurrency() == null || request.getCurrency().isBlank()) {
            request.setCurrency("INR");
        }
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            request.setStatus("SUBMITTED");
        }
        if (request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()) {
            request.setPaymentMethod("ONLINE");
        }
        if (request.getPaymentStatus() == null || request.getPaymentStatus().isBlank()) {
            request.setPaymentStatus("PENDING");
        }
    }

    private String detectMediaType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "DOCUMENT";
        }
        if (contentType.startsWith("image/")) {
            return "IMAGE";
        }
        if (contentType.startsWith("video/")) {
            return "VIDEO";
        }
        return "DOCUMENT";
    }

    private boolean isRazorpayConfigured() {
        return razorpayKeyId != null
                && !razorpayKeyId.isBlank()
                && razorpayKeySecret != null
                && !razorpayKeySecret.isBlank();
    }

    private int toPaise(double amount) {
        return (int) Math.round(roundCurrency(amount) * 100);
    }

    private String generateSignature(String razorpayOrderId, String razorpayPaymentId) {
        if (!isRazorpayConfigured()) {
            throw new IllegalStateException("Razorpay is not configured on backend");
        }

        try {
            String data = razorpayOrderId + "|" + razorpayPaymentId;
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to verify payment signature", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.ROOT, "%02x", b));
        }
        return sb.toString();
    }

    private double roundCurrency(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

    private Map<String, Object> toResponse(AssignmentHelpRequest request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", request.getId());
        payload.put("userId", request.getUserId());
        payload.put("skillServiceId", request.getSkillServiceId());
        payload.put("serviceType", request.getServiceType());
        payload.put("subject", request.getSubject());
        payload.put("topic", request.getTopic());
        payload.put("description", request.getDescription());
        payload.put("branch", request.getBranch());
        payload.put("semester", request.getSemester());
        payload.put("deadline", request.getDeadline());
        payload.put("totalAmount", request.getTotalAmount());
        payload.put("amountPaid", request.getAmountPaid());
        payload.put("paymentMethod", request.getPaymentMethod());
        payload.put("paymentStatus", request.getPaymentStatus());
        payload.put("currency", request.getCurrency());
        payload.put("razorpayOrderId", request.getRazorpayOrderId());
        payload.put("razorpayPaymentId", request.getRazorpayPaymentId());
        payload.put("status", request.getStatus());
        payload.put("createdAt", request.getCreatedAt());
        payload.put("media", mediaAssetService.toResponsePayload(OWNER_TYPE, request.getId()));
        return payload;
    }
}
