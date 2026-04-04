package com.mycollegemart.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.model.PurchaseOrder;
import com.mycollegemart.backend.repository.OrderRepository;
import com.mycollegemart.backend.repository.ProductRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CartService cartService;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;

    @Autowired
    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CartService cartService,
            UserService userService,
            ObjectMapper objectMapper,
            @Value("${razorpay.key-id:}") String razorpayKeyId,
            @Value("${razorpay.key-secret:}") String razorpayKeySecret) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.cartService = cartService;
        this.userService = userService;
        this.objectMapper = objectMapper;
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
    }

    public Map<String, Object> createRazorpayOrder(Long userId, List<OrderItemInput> items, String deliveryOption,
            Double walletAmount)
            throws RazorpayException {
        List<ResolvedItem> resolvedItems = resolveItems(items);
        if (resolvedItems.isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty");
        }

        if (!isRazorpayConfigured()) {
            throw new IllegalStateException("Razorpay is not configured on backend");
        }

        double subtotal = resolvedItems.stream().mapToDouble(ResolvedItem::lineTotal).sum();
        double safeWalletAmount = clampWalletAmount(walletAmount, subtotal);
        double amountDue = roundCurrency(subtotal - safeWalletAmount);

        if (amountDue <= 0) {
            PurchaseOrder walletOnlyOrder = buildBaseOrder(userId, deliveryOption, resolvedItems, subtotal,
                    safeWalletAmount, amountDue);
            walletOnlyOrder.setPaymentMethod("WALLET");
            walletOnlyOrder.setPaymentStatus("PAID");
            walletOnlyOrder.setOrderStatus("PLACED");
            walletOnlyOrder.setAmountPaid(roundCurrency(subtotal));

            PurchaseOrder saved = orderRepository.save(walletOnlyOrder);
            postSuccessfulCheckout(userId, resolvedItems);
            return buildWalletOnlyResponse(saved);
        }

        RazorpayClient razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        JSONObject options = new JSONObject();
        options.put("amount", toPaise(amountDue));
        options.put("currency", "INR");
        options.put("receipt", "mcm_" + System.currentTimeMillis());
        Order razorpayOrder = razorpayClient.orders.create(options);

        PurchaseOrder pendingOrder = buildBaseOrder(userId, deliveryOption, resolvedItems, subtotal, safeWalletAmount,
                amountDue);
        pendingOrder.setPaymentMethod("ONLINE");
        pendingOrder.setPaymentStatus("PENDING");
        pendingOrder.setOrderStatus("PENDING_PAYMENT");
        pendingOrder.setRazorpayOrderId(razorpayOrder.get("id"));
        orderRepository.save(pendingOrder);

        Map<String, Object> response = new HashMap<>();
        response.put("requiresPayment", true);
        response.put("keyId", razorpayKeyId);
        response.put("currency", "INR");
        response.put("amount", toPaise(amountDue));
        response.put("amountDue", amountDue);
        response.put("walletAmount", safeWalletAmount);
        response.put("subtotal", subtotal);
        response.put("orderNumber", pendingOrder.getOrderNumber());
        response.put("razorpayOrderId", pendingOrder.getRazorpayOrderId());
        return response;
    }

    public Map<String, Object> verifyRazorpayPayment(
            Long userId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {
        PurchaseOrder order = orderRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!Objects.equals(order.getUserId(), userId)) {
            throw new IllegalArgumentException("Order does not belong to this user");
        }

        String generatedSignature = generateSignature(razorpayOrderId, razorpayPaymentId);
        if (!Objects.equals(generatedSignature, razorpaySignature)) {
            throw new IllegalArgumentException("Invalid payment signature");
        }

        order.setPaymentStatus("PAID");
        order.setOrderStatus("PLACED");
        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setRazorpaySignature(razorpaySignature);
        order.setAmountPaid(roundCurrency(order.getAmountDue() + order.getWalletAmount()));
        orderRepository.save(order);

        List<ResolvedItem> resolvedItems = deserializeItems(order.getItemsJson());
        postSuccessfulCheckout(userId, resolvedItems);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("orderNumber", order.getOrderNumber());
        response.put("paymentId", razorpayPaymentId);
        response.put("paymentStatus", order.getPaymentStatus());
        return response;
    }

    public Map<String, Object> placeCodOrder(Long userId, List<OrderItemInput> items, String deliveryOption,
            Double walletAmount) {
        List<ResolvedItem> resolvedItems = resolveItems(items);
        if (resolvedItems.isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty");
        }

        boolean hasPrimeMembership = resolvedItems.stream()
                .anyMatch(item -> "prime-membership".equals(item.id()));
        if (hasPrimeMembership) {
            throw new IllegalArgumentException("Prime membership requires online payment");
        }

        double subtotal = resolvedItems.stream().mapToDouble(ResolvedItem::lineTotal).sum();
        double safeWalletAmount = clampWalletAmount(walletAmount, subtotal);
        double amountDue = roundCurrency(subtotal - safeWalletAmount);

        PurchaseOrder codOrder = buildBaseOrder(userId, deliveryOption, resolvedItems, subtotal, safeWalletAmount,
                amountDue);
        codOrder.setPaymentMethod("COD");
        codOrder.setPaymentStatus(amountDue <= 0 ? "PAID" : "COD_PENDING");
        codOrder.setOrderStatus("PLACED");
        codOrder.setAmountPaid(roundCurrency(subtotal - amountDue));
        PurchaseOrder saved = orderRepository.save(codOrder);

        postSuccessfulCheckout(userId, resolvedItems);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("orderNumber", saved.getOrderNumber());
        response.put("paymentStatus", saved.getPaymentStatus());
        response.put("amountDue", saved.getAmountDue());
        return response;
    }

    public List<Map<String, Object>> getOrdersForUser(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(order -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", order.getId());
                    row.put("orderNumber", order.getOrderNumber());
                    row.put("paymentMethod", order.getPaymentMethod());
                    row.put("paymentStatus", order.getPaymentStatus());
                    row.put("orderStatus", order.getOrderStatus());
                    row.put("deliveryOption", order.getDeliveryOption());
                    row.put("subtotal", order.getSubtotal());
                    row.put("walletAmount", order.getWalletAmount());
                    row.put("amountDue", order.getAmountDue());
                    row.put("amountPaid", order.getAmountPaid());
                    row.put("currency", order.getCurrency());
                    row.put("createdAt", order.getCreatedAt());
                    row.put("items", deserializeItems(order.getItemsJson()));
                    return row;
                })
                .toList();
    }

    private PurchaseOrder buildBaseOrder(
            Long userId,
            String deliveryOption,
            List<ResolvedItem> resolvedItems,
            double subtotal,
            double walletAmount,
            double amountDue) {
        PurchaseOrder order = new PurchaseOrder();
        order.setUserId(userId);
        order.setOrderNumber(generateOrderNumber());
        order.setDeliveryOption(
                (deliveryOption == null || deliveryOption.isBlank()) ? "Library Pickup Point" : deliveryOption);
        order.setSubtotal(roundCurrency(subtotal));
        order.setWalletAmount(roundCurrency(walletAmount));
        order.setAmountDue(roundCurrency(amountDue));
        order.setAmountPaid(0.0);
        order.setCurrency("INR");
        order.setItemsJson(serializeItems(resolvedItems));
        return order;
    }

    private void postSuccessfulCheckout(Long userId, List<ResolvedItem> resolvedItems) {
        cartService.clearCart(userId);

        boolean hasPrimeMembership = resolvedItems.stream()
                .anyMatch(item -> "prime-membership".equals(item.id()));
        if (hasPrimeMembership) {
            userService.activatePrimeMembership(userId);
        }
    }

    private List<ResolvedItem> resolveItems(List<OrderItemInput> items) {
        if (items == null) {
            return List.of();
        }

        List<ResolvedItem> resolved = new ArrayList<>();
        for (OrderItemInput item : items) {
            if (item == null || item.id() == null || item.id().isBlank()) {
                continue;
            }

            int quantity = item.quantity() == null || item.quantity() <= 0 ? 1 : item.quantity();
            String normalizedId = item.id().trim();

            if ("prime-membership".equalsIgnoreCase(normalizedId)) {
                double price = 299.0;
                resolved.add(new ResolvedItem("prime-membership", "MyCollegeMart Prime Membership", price, quantity,
                        roundCurrency(price * quantity)));
                continue;
            }

            Long productId;
            try {
                productId = Long.parseLong(normalizedId);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid cart item id: " + normalizedId);
            }

            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + normalizedId));
            double price = product.getPrice() == null ? 0.0 : product.getPrice();
            resolved.add(new ResolvedItem(
                    String.valueOf(product.getId()),
                    product.getName(),
                    price,
                    quantity,
                    roundCurrency(price * quantity)));
        }

        return resolved;
    }

    private String serializeItems(List<ResolvedItem> resolvedItems) {
        try {
            return objectMapper.writeValueAsString(resolvedItems);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize order items", e);
        }
    }

    private List<ResolvedItem> deserializeItems(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(
                    json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, ResolvedItem.class));
        } catch (Exception e) {
            return List.of();
        }
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

    private double clampWalletAmount(Double walletAmount, double subtotal) {
        if (walletAmount == null || walletAmount <= 0) {
            return 0.0;
        }
        return roundCurrency(Math.min(walletAmount, subtotal));
    }

    private double roundCurrency(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

    private String generateOrderNumber() {
        return "MCM-" + Instant.now().truncatedTo(ChronoUnit.MILLIS).toEpochMilli();
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

    private Map<String, Object> buildWalletOnlyResponse(PurchaseOrder order) {
        Map<String, Object> response = new HashMap<>();
        response.put("requiresPayment", false);
        response.put("success", true);
        response.put("paymentStatus", order.getPaymentStatus());
        response.put("orderNumber", order.getOrderNumber());
        response.put("amountPaid", order.getAmountPaid());
        return response;
    }

    public record OrderItemInput(String id, Integer quantity) {
    }

    public record ResolvedItem(String id, String name, Double unitPrice, Integer quantity, Double lineTotal) {
    }
}
