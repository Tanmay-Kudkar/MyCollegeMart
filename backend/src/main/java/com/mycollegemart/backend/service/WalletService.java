package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.model.WalletTransaction;
import com.mycollegemart.backend.repository.WalletTransactionRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class WalletService {

    private static final double MIN_TOPUP_AMOUNT = 1.0;
    private static final double MAX_TOPUP_AMOUNT = 50000.0;

    private final WalletTransactionRepository walletTransactionRepository;
    private final UserService userService;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;

    @Autowired
    public WalletService(
            WalletTransactionRepository walletTransactionRepository,
            UserService userService,
            @Value("${razorpay.key-id:}") String razorpayKeyId,
            @Value("${razorpay.key-secret:}") String razorpayKeySecret) {
        this.walletTransactionRepository = walletTransactionRepository;
        this.userService = userService;
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
    }

    public Map<String, Object> createTopupOrder(Long userId, Double amount) throws RazorpayException {
        if (userId == null) {
            throw new IllegalArgumentException("Please sign in to add money");
        }

        User user = userService.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        if (!isRazorpayConfigured()) {
            throw new IllegalStateException("Razorpay is not configured on backend");
        }

        double safeAmount = normalizeTopupAmount(amount);

        WalletTransaction transaction = new WalletTransaction();
        transaction.setUserId(userId);
        transaction.setTransactionType("CREDIT");
        transaction.setStatus("PENDING");
        transaction.setAmount(safeAmount);
        transaction.setCurrency("INR");
        transaction.setDescription("Wallet top up");
        transaction = walletTransactionRepository.save(transaction);

        RazorpayClient razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject options = new JSONObject();
        options.put("amount", toPaise(safeAmount));
        options.put("currency", "INR");
        options.put("receipt", "mcm_wallet_" + transaction.getId());

        Order razorpayOrder = razorpayClient.orders.create(options);
        transaction.setRazorpayOrderId(razorpayOrder.get("id"));
        walletTransactionRepository.save(transaction);

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", transaction.getId());
        payload.put("requiresPayment", true);
        payload.put("keyId", razorpayKeyId);
        payload.put("amount", toPaise(safeAmount));
        payload.put("amountRupees", safeAmount);
        payload.put("currency", "INR");
        payload.put("razorpayOrderId", transaction.getRazorpayOrderId());
        payload.put("description", transaction.getDescription());
        return payload;
    }

    public Map<String, Object> verifyTopupPayment(
            Long userId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {
        WalletTransaction transaction = walletTransactionRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new IllegalArgumentException("Top-up order not found"));

        if (!Objects.equals(transaction.getUserId(), userId)) {
            throw new IllegalArgumentException("Top-up order does not belong to this user");
        }

        if ("SUCCESS".equalsIgnoreCase(transaction.getStatus())) {
            if (!Objects.equals(transaction.getRazorpayPaymentId(), razorpayPaymentId)) {
                throw new IllegalArgumentException("This order is already linked to a different payment");
            }
            return buildVerificationResponse(transaction, true, 0.0);
        }

        Optional<WalletTransaction> existingPayment = walletTransactionRepository
                .findByRazorpayPaymentId(razorpayPaymentId);
        if (existingPayment.isPresent() && !Objects.equals(existingPayment.get().getId(), transaction.getId())) {
            throw new IllegalArgumentException("This payment is already linked to another transaction");
        }

        String generatedSignature = generateSignature(razorpayOrderId, razorpayPaymentId);
        if (!Objects.equals(generatedSignature, razorpaySignature)) {
            transaction.setStatus("FAILED");
            transaction.setRazorpayPaymentId(razorpayPaymentId);
            transaction.setRazorpaySignature(razorpaySignature);
            walletTransactionRepository.save(transaction);
            throw new IllegalArgumentException("Invalid payment signature");
        }

        transaction.setStatus("SUCCESS");
        transaction.setRazorpayPaymentId(razorpayPaymentId);
        transaction.setRazorpaySignature(razorpaySignature);
        WalletTransaction saved = walletTransactionRepository.save(transaction);

        return buildVerificationResponse(saved, false, saved.getAmount());
    }

    public List<Map<String, Object>> getTransactions(Long userId, Integer limit) {
        if (userId == null) {
            throw new IllegalArgumentException("Please sign in");
        }

        int safeLimit = sanitizeLimit(limit);
        return walletTransactionRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::mapTransaction)
                .toList();
    }

    private Map<String, Object> buildVerificationResponse(
            WalletTransaction transaction,
            boolean alreadyProcessed,
            double creditedAmount) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("success", true);
        payload.put("alreadyProcessed", alreadyProcessed);
        payload.put("transactionId", transaction.getId());
        payload.put("creditedAmount", roundCurrency(creditedAmount));
        payload.put("amount", transaction.getAmount());
        payload.put("paymentStatus", transaction.getStatus());
        payload.put("paymentId", transaction.getRazorpayPaymentId());
        payload.put("createdAt", transaction.getCreatedAt());
        return payload;
    }

    private Map<String, Object> mapTransaction(WalletTransaction transaction) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", transaction.getId());
        payload.put("transactionType", transaction.getTransactionType());
        payload.put("status", transaction.getStatus());
        payload.put("amount", transaction.getAmount());
        payload.put("currency", transaction.getCurrency());
        payload.put("description", transaction.getDescription());
        payload.put("razorpayOrderId", transaction.getRazorpayOrderId());
        payload.put("razorpayPaymentId", transaction.getRazorpayPaymentId());
        payload.put("createdAt", transaction.getCreatedAt());
        payload.put("updatedAt", transaction.getUpdatedAt());
        return payload;
    }

    private int sanitizeLimit(Integer limit) {
        if (limit == null) {
            return 20;
        }

        return Math.min(Math.max(limit, 1), 100);
    }

    private double normalizeTopupAmount(Double amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount is required");
        }

        double safeAmount = roundCurrency(amount);
        if (safeAmount < MIN_TOPUP_AMOUNT) {
            throw new IllegalArgumentException("Minimum top-up amount is Rs. 1");
        }

        if (safeAmount > MAX_TOPUP_AMOUNT) {
            throw new IllegalArgumentException("Maximum top-up amount is Rs. 50000");
        }

        return safeAmount;
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

    private double roundCurrency(double amount) {
        return Math.round(amount * 100.0) / 100.0;
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
}
