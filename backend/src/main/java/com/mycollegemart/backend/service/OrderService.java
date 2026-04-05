package com.mycollegemart.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.model.PurchaseOrder;
import com.mycollegemart.backend.model.PurchaseOrderTrackingEvent;
import com.mycollegemart.backend.repository.OrderRepository;
import com.mycollegemart.backend.repository.OrderTrackingEventRepository;
import com.mycollegemart.backend.repository.ProductRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.data.domain.PageRequest;
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

    private static final String TRACKING_STAGE_PENDING_PAYMENT = "PENDING_PAYMENT";
    private static final String TRACKING_STAGE_PLACED = "PLACED";
    private static final String TRACKING_STAGE_PACKED = "PACKED";
    private static final String TRACKING_STAGE_SHIPPED = "SHIPPED";
    private static final String TRACKING_STAGE_OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY";
    private static final String TRACKING_STAGE_READY_FOR_PICKUP = "READY_FOR_PICKUP";
    private static final String TRACKING_STAGE_DELIVERED = "DELIVERED";

    private final OrderRepository orderRepository;
    private final OrderTrackingEventRepository orderTrackingEventRepository;
    private final ProductRepository productRepository;
    private final CartService cartService;
    private final UserService userService;
    private final PrimeMembershipConfigService primeMembershipConfigService;
    private final ObjectMapper objectMapper;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;

    @Autowired
    public OrderService(
            OrderRepository orderRepository,
            OrderTrackingEventRepository orderTrackingEventRepository,
            ProductRepository productRepository,
            CartService cartService,
            UserService userService,
            PrimeMembershipConfigService primeMembershipConfigService,
            ObjectMapper objectMapper,
            @Value("${razorpay.key-id:}") String razorpayKeyId,
            @Value("${razorpay.key-secret:}") String razorpayKeySecret) {
        this.orderRepository = orderRepository;
        this.orderTrackingEventRepository = orderTrackingEventRepository;
        this.productRepository = productRepository;
        this.cartService = cartService;
        this.userService = userService;
        this.primeMembershipConfigService = primeMembershipConfigService;
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
            walletOnlyOrder.setOrderStatus(TRACKING_STAGE_PLACED);
            walletOnlyOrder.setAmountPaid(roundCurrency(subtotal));

            PurchaseOrder saved = orderRepository.save(walletOnlyOrder);
            synchronizeTracking(saved);
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
        pendingOrder.setOrderStatus(TRACKING_STAGE_PENDING_PAYMENT);
        pendingOrder.setRazorpayOrderId(razorpayOrder.get("id"));
        pendingOrder = orderRepository.save(pendingOrder);
        TrackingSnapshot pendingTracking = synchronizeTracking(pendingOrder);

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
        response.put("trackingNumber", pendingOrder.getTrackingNumber());
        response.put("trackingStage", pendingTracking.currentStage());
        response.put("trackingProgress", pendingTracking.progressPercent());
        response.put("estimatedDeliveryAt", pendingOrder.getEstimatedDeliveryAt());
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
        order.setOrderStatus(TRACKING_STAGE_PLACED);
        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setRazorpaySignature(razorpaySignature);
        order.setAmountPaid(roundCurrency(order.getAmountDue() + order.getWalletAmount()));
        orderRepository.save(order);
        TrackingSnapshot trackingSnapshot = synchronizeTracking(order);

        List<ResolvedItem> resolvedItems = deserializeItems(order.getItemsJson());
        postSuccessfulCheckout(userId, resolvedItems);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("orderNumber", order.getOrderNumber());
        response.put("paymentId", razorpayPaymentId);
        response.put("paymentStatus", order.getPaymentStatus());
        response.put("trackingNumber", order.getTrackingNumber());
        response.put("trackingStage", trackingSnapshot.currentStage());
        response.put("trackingProgress", trackingSnapshot.progressPercent());
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
        codOrder.setOrderStatus(TRACKING_STAGE_PLACED);
        codOrder.setAmountPaid(roundCurrency(subtotal - amountDue));
        PurchaseOrder saved = orderRepository.save(codOrder);
        TrackingSnapshot trackingSnapshot = synchronizeTracking(saved);

        postSuccessfulCheckout(userId, resolvedItems);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("orderNumber", saved.getOrderNumber());
        response.put("paymentStatus", saved.getPaymentStatus());
        response.put("amountDue", saved.getAmountDue());
        response.put("trackingNumber", saved.getTrackingNumber());
        response.put("trackingStage", trackingSnapshot.currentStage());
        response.put("trackingProgress", trackingSnapshot.progressPercent());
        return response;
    }

    public List<Map<String, Object>> getOrdersForUser(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(order -> mapOrderRow(order, false))
                .toList();
    }

    public List<Map<String, Object>> getRecentOrdersForAdmin(Integer limit) {
        int safeLimit = sanitizeLimit(limit);
        return orderRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit)).stream()
                .map(order -> mapOrderRow(order, true))
                .toList();
    }

    public List<Map<String, Object>> searchOrdersForAdmin(String query, Integer limit) {
        int safeLimit = sanitizeLimit(limit);

        if (query == null || query.isBlank()) {
            return getRecentOrdersForAdmin(safeLimit);
        }

        String normalizedQuery = query.trim();
        return orderRepository
                .findByOrderNumberContainingIgnoreCaseOrTrackingNumberContainingIgnoreCaseOrderByCreatedAtDesc(
                        normalizedQuery,
                        normalizedQuery,
                        PageRequest.of(0, safeLimit))
                .stream()
                .map(order -> mapOrderRow(order, true))
                .toList();
    }

    public Map<String, Object> addManualTrackingEventForAdmin(Long orderId, AdminTrackingEventInput input) {
        PurchaseOrder order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (input == null) {
            throw new IllegalArgumentException("Tracking update payload is required");
        }

        String requestedStage = normalizeTrackingStageStrict(input.trackingStage());
        String currentStage = normalizeTrackingStage(order.getOrderStatus());

        if (stageOrder(requestedStage) < stageOrder(currentStage)) {
            throw new IllegalArgumentException("Tracking stage cannot move backwards");
        }

        Instant now = Instant.now();
        Instant eventTime = input.eventTime() == null ? now : input.eventTime();

        String eventLocation = normalizeTextOrDefault(
                input.eventLocation(),
                normalizeTextOrDefault(order.getCurrentLocation(), resolveDefaultLocation(requestedStage, order)));

        PurchaseOrderTrackingEvent event = new PurchaseOrderTrackingEvent();
        event.setPurchaseOrderId(order.getId());
        event.setEventStatus(requestedStage);
        event.setEventTitle(normalizeTextOrDefault(input.eventTitle(), defaultEventTitle(requestedStage)));
        event.setEventDescription(
                normalizeTextOrDefault(input.eventDescription(), defaultEventDescription(requestedStage)));
        event.setEventLocation(eventLocation);
        event.setEventTime(eventTime);
        event.setSortOrder(resolveNextTrackingSortOrder(order.getId()));

        PurchaseOrderTrackingEvent savedEvent = orderTrackingEventRepository.save(event);

        order.setOrderStatus(requestedStage);
        order.setCurrentLocation(eventLocation);

        String updatedCarrierName = normalizeTextOrDefault(input.carrierName(), order.getCarrierName());
        if (updatedCarrierName != null) {
            order.setCarrierName(updatedCarrierName);
        }

        String updatedCarrierContact = normalizeTextOrDefault(input.carrierContact(), order.getCarrierContact());
        if (updatedCarrierContact != null) {
            order.setCarrierContact(updatedCarrierContact);
        }

        String updatedTrackingNumber = normalizeTextOrDefault(input.trackingNumber(), order.getTrackingNumber());
        if (updatedTrackingNumber != null) {
            order.setTrackingNumber(updatedTrackingNumber);
        }

        if (input.estimatedDeliveryAt() != null) {
            order.setEstimatedDeliveryAt(input.estimatedDeliveryAt());
        }

        if (TRACKING_STAGE_DELIVERED.equals(requestedStage)) {
            order.setDeliveredAt(eventTime);
        }

        order.setLastTrackingUpdateAt(now);
        orderRepository.save(order);

        Map<String, Object> payload = new HashMap<>();
        payload.put("updatedOrder", mapOrderRow(order, true));
        payload.put("trackingEvent", mapTrackingEvent(savedEvent));
        return payload;
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

    private Map<String, Object> mapOrderRow(PurchaseOrder order, boolean includeUserId) {
        TrackingSnapshot trackingSnapshot = synchronizeTracking(order);
        List<ResolvedItem> items = deserializeItems(order.getItemsJson());

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
        row.put("trackingNumber", order.getTrackingNumber());
        row.put("carrierName", order.getCarrierName());
        row.put("carrierContact", order.getCarrierContact());
        row.put("currentLocation", order.getCurrentLocation());
        row.put("estimatedDeliveryAt", order.getEstimatedDeliveryAt());
        row.put("deliveredAt", order.getDeliveredAt());
        row.put("lastTrackingUpdateAt", order.getLastTrackingUpdateAt());
        row.put("trackingStage", trackingSnapshot.currentStage());
        row.put("trackingProgress", trackingSnapshot.progressPercent());
        row.put("trackingEvents", trackingSnapshot.events());
        row.put("createdAt", order.getCreatedAt());
        row.put("items", items);
        row.put("itemCount", items.stream().mapToInt(item -> item.quantity() == null ? 0 : item.quantity()).sum());

        if (includeUserId) {
            row.put("userId", order.getUserId());
        }

        return row;
    }

    private Map<String, Object> mapTrackingEvent(PurchaseOrderTrackingEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", event.getId());
        payload.put("purchaseOrderId", event.getPurchaseOrderId());
        payload.put("eventStatus", event.getEventStatus());
        payload.put("eventTitle", event.getEventTitle());
        payload.put("eventDescription", event.getEventDescription());
        payload.put("eventLocation", event.getEventLocation());
        payload.put("eventTime", event.getEventTime());
        payload.put("sortOrder", event.getSortOrder());
        return payload;
    }

    private int sanitizeLimit(Integer requestedLimit) {
        if (requestedLimit == null) {
            return 20;
        }

        return Math.max(1, Math.min(60, requestedLimit));
    }

    private int resolveNextTrackingSortOrder(Long orderId) {
        return orderTrackingEventRepository.findByPurchaseOrderIdOrderBySortOrderAscEventTimeAsc(orderId)
                .stream()
                .mapToInt(event -> event.getSortOrder() == null ? 0 : event.getSortOrder())
                .max()
                .orElse(0) + 1;
    }

    private String normalizeTrackingStageStrict(String stage) {
        if (stage == null || stage.isBlank()) {
            throw new IllegalArgumentException("trackingStage is required");
        }

        String normalized = stage.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case TRACKING_STAGE_PENDING_PAYMENT,
                    TRACKING_STAGE_PLACED,
                    TRACKING_STAGE_PACKED,
                    TRACKING_STAGE_SHIPPED,
                    TRACKING_STAGE_OUT_FOR_DELIVERY,
                    TRACKING_STAGE_READY_FOR_PICKUP,
                    TRACKING_STAGE_DELIVERED -> normalized;
            default -> throw new IllegalArgumentException("Unsupported trackingStage value");
        };
    }

    private String normalizeTextOrDefault(String value, String fallback) {
        if (value != null && !value.isBlank()) {
            return value.trim();
        }

        if (fallback != null && !fallback.isBlank()) {
            return fallback.trim();
        }

        return null;
    }

    private String defaultEventTitle(String stage) {
        return switch (normalizeTrackingStage(stage)) {
            case TRACKING_STAGE_PENDING_PAYMENT -> "Awaiting payment confirmation";
            case TRACKING_STAGE_PACKED -> "Packed at fulfillment center";
            case TRACKING_STAGE_SHIPPED -> "Shipped";
            case TRACKING_STAGE_OUT_FOR_DELIVERY -> "Out for delivery";
            case TRACKING_STAGE_READY_FOR_PICKUP -> "Ready for pickup";
            case TRACKING_STAGE_DELIVERED -> "Delivered";
            default -> "Order confirmed";
        };
    }

    private String defaultEventDescription(String stage) {
        return switch (normalizeTrackingStage(stage)) {
            case TRACKING_STAGE_PENDING_PAYMENT -> "Payment verification is in progress.";
            case TRACKING_STAGE_PACKED -> "The package has been packed and is waiting for dispatch.";
            case TRACKING_STAGE_SHIPPED -> "The package is in transit with the assigned courier.";
            case TRACKING_STAGE_OUT_FOR_DELIVERY -> "The package reached the local hub and is out for delivery.";
            case TRACKING_STAGE_READY_FOR_PICKUP -> "The package is ready at the pickup counter.";
            case TRACKING_STAGE_DELIVERED -> "Delivery completed successfully.";
            default -> "Order confirmed and under processing.";
        };
    }

    private String resolveDefaultLocation(String stage, PurchaseOrder order) {
        String normalized = normalizeTrackingStage(stage);
        boolean pickupOrder = isPickupOrder(order.getDeliveryOption());

        if (TRACKING_STAGE_READY_FOR_PICKUP.equals(normalized)) {
            return "Campus pickup counter";
        }

        if (TRACKING_STAGE_DELIVERED.equals(normalized) && pickupOrder) {
            return "Campus pickup counter";
        }

        if (TRACKING_STAGE_OUT_FOR_DELIVERY.equals(normalized)) {
            return "Local delivery hub";
        }

        if (TRACKING_STAGE_SHIPPED.equals(normalized)) {
            return "In transit";
        }

        if (TRACKING_STAGE_PACKED.equals(normalized)) {
            return "Regional fulfillment center";
        }

        if (TRACKING_STAGE_PENDING_PAYMENT.equals(normalized)) {
            return "Payment gateway";
        }

        return "Seller order desk";
    }

    private int stageOrder(String stage) {
        String normalized = normalizeTrackingStage(stage);
        return switch (normalized) {
            case TRACKING_STAGE_PENDING_PAYMENT -> 0;
            case TRACKING_STAGE_PLACED -> 1;
            case TRACKING_STAGE_PACKED -> 2;
            case TRACKING_STAGE_SHIPPED -> 3;
            case TRACKING_STAGE_OUT_FOR_DELIVERY,
                    TRACKING_STAGE_READY_FOR_PICKUP -> 4;
            case TRACKING_STAGE_DELIVERED -> 5;
            default -> 1;
        };
    }

    private TrackingSnapshot synchronizeTracking(PurchaseOrder order) {
        if (order == null || order.getId() == null) {
            return new TrackingSnapshot(TRACKING_STAGE_PENDING_PAYMENT, 0.0, List.of());
        }

        Instant now = Instant.now();
        Instant baseTime = order.getCreatedAt() == null ? now : order.getCreatedAt();
        boolean pickupOrder = isPickupOrder(order.getDeliveryOption());

        boolean changed = ensureTrackingMetadata(order, baseTime, now, pickupOrder);
        List<PurchaseOrderTrackingEvent> events = new ArrayList<>(
                orderTrackingEventRepository.findByPurchaseOrderIdOrderBySortOrderAscEventTimeAsc(order.getId()));

        if (isPendingPayment(order)) {
            changed |= ensureTrackingEvent(
                    order,
                    events,
                    TRACKING_STAGE_PENDING_PAYMENT,
                    "Awaiting payment confirmation",
                    "Payment verification is in progress. Tracking will continue after confirmation.",
                    "Payment gateway",
                    baseTime,
                    0);

            if (!Objects.equals(order.getOrderStatus(), TRACKING_STAGE_PENDING_PAYMENT)) {
                order.setOrderStatus(TRACKING_STAGE_PENDING_PAYMENT);
                changed = true;
            }

            if (!Objects.equals(order.getCurrentLocation(), "Payment gateway")) {
                order.setCurrentLocation("Payment gateway");
                changed = true;
            }
        } else {
            List<StageMilestone> milestones = buildMilestones(baseTime, order.getDeliveryOption(), pickupOrder);
            StageMilestone latestReached = milestones.get(0);

            for (StageMilestone milestone : milestones) {
                if (now.isBefore(milestone.reachedAt())) {
                    continue;
                }

                changed |= ensureTrackingEvent(
                        order,
                        events,
                        milestone.stage(),
                        milestone.title(),
                        milestone.description(),
                        milestone.location(),
                        milestone.reachedAt(),
                        milestone.sortOrder());
                latestReached = milestone;
            }

            String nextStage = normalizeTrackingStage(latestReached.stage());
            String nextLocation = latestReached.location();
            String currentStage = normalizeTrackingStage(order.getOrderStatus());

            if (stageOrder(currentStage) > stageOrder(nextStage)) {
                nextStage = currentStage;
                nextLocation = normalizeTextOrDefault(order.getCurrentLocation(), latestReached.location());
            }

            if (!Objects.equals(order.getOrderStatus(), nextStage)) {
                order.setOrderStatus(nextStage);
                changed = true;
            }

            if (!Objects.equals(order.getCurrentLocation(), nextLocation)) {
                order.setCurrentLocation(nextLocation);
                changed = true;
            }

            if (TRACKING_STAGE_DELIVERED.equals(nextStage) && order.getDeliveredAt() == null) {
                order.setDeliveredAt(latestReached.reachedAt());
                changed = true;
            }
        }

        if (changed) {
            order.setLastTrackingUpdateAt(now);
            orderRepository.save(order);
            events = new ArrayList<>(
                    orderTrackingEventRepository.findByPurchaseOrderIdOrderBySortOrderAscEventTimeAsc(order.getId()));
        }

        return buildTrackingSnapshot(order, events, pickupOrder);
    }

    private boolean ensureTrackingMetadata(PurchaseOrder order, Instant baseTime, Instant now, boolean pickupOrder) {
        boolean changed = false;

        if (order.getTrackingNumber() == null || order.getTrackingNumber().isBlank()) {
            order.setTrackingNumber(generateTrackingNumber(order));
            changed = true;
        }

        if (order.getCarrierName() == null || order.getCarrierName().isBlank()) {
            order.setCarrierName(resolveCarrierName(order.getDeliveryOption(), pickupOrder));
            changed = true;
        }

        if (order.getCarrierContact() == null || order.getCarrierContact().isBlank()) {
            order.setCarrierContact(resolveCarrierContact(order.getDeliveryOption(), pickupOrder));
            changed = true;
        }

        if (order.getEstimatedDeliveryAt() == null) {
            order.setEstimatedDeliveryAt(baseTime.plus(resolveDeliveredHours(order.getDeliveryOption(), pickupOrder),
                    ChronoUnit.HOURS));
            changed = true;
        }

        if (order.getCurrentLocation() == null || order.getCurrentLocation().isBlank()) {
            order.setCurrentLocation(isPendingPayment(order) ? "Payment gateway" : "Seller order desk");
            changed = true;
        }

        if (order.getLastTrackingUpdateAt() == null) {
            order.setLastTrackingUpdateAt(now);
            changed = true;
        }

        return changed;
    }

    private boolean ensureTrackingEvent(
            PurchaseOrder order,
            List<PurchaseOrderTrackingEvent> events,
            String stage,
            String title,
            String description,
            String location,
            Instant eventTime,
            int sortOrder) {
        boolean alreadyExists = events.stream()
                .anyMatch(event -> stage.equalsIgnoreCase(event.getEventStatus()));

        if (alreadyExists) {
            return false;
        }

        PurchaseOrderTrackingEvent trackingEvent = new PurchaseOrderTrackingEvent();
        trackingEvent.setPurchaseOrderId(order.getId());
        trackingEvent.setEventStatus(stage);
        trackingEvent.setEventTitle(title);
        trackingEvent.setEventDescription(description);
        trackingEvent.setEventLocation(location);
        trackingEvent.setEventTime(eventTime == null ? Instant.now() : eventTime);
        trackingEvent.setSortOrder(sortOrder);

        PurchaseOrderTrackingEvent saved = orderTrackingEventRepository.save(trackingEvent);
        events.add(saved);
        return true;
    }

    private TrackingSnapshot buildTrackingSnapshot(
            PurchaseOrder order,
            List<PurchaseOrderTrackingEvent> events,
            boolean pickupOrder) {
        String normalizedStage = normalizeTrackingStage(order.getOrderStatus());
        List<Map<String, Object>> eventPayload = events.stream()
                .map(event -> {
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("eventStatus", event.getEventStatus());
                    payload.put("eventTitle", event.getEventTitle());
                    payload.put("eventDescription", event.getEventDescription());
                    payload.put("eventLocation", event.getEventLocation());
                    payload.put("eventTime", event.getEventTime());
                    payload.put("sortOrder", event.getSortOrder());
                    return payload;
                })
                .toList();

        return new TrackingSnapshot(
                normalizedStage,
                calculateProgress(normalizedStage, pickupOrder),
                eventPayload);
    }

    private List<StageMilestone> buildMilestones(Instant baseTime, String deliveryOption, boolean pickupOrder) {
        if (pickupOrder) {
            return List.of(
                    new StageMilestone(
                            TRACKING_STAGE_PLACED,
                            "Order confirmed",
                            "Your order is confirmed and being prepared for pickup.",
                            "Seller order desk",
                            baseTime,
                            1),
                    new StageMilestone(
                            TRACKING_STAGE_READY_FOR_PICKUP,
                            "Ready for pickup",
                            "Your package is ready at the campus pickup counter.",
                            "Campus pickup counter",
                            baseTime.plus(18, ChronoUnit.HOURS),
                            2),
                    new StageMilestone(
                            TRACKING_STAGE_DELIVERED,
                            "Picked up",
                            "Pickup was completed successfully.",
                            "Campus pickup counter",
                            baseTime.plus(72, ChronoUnit.HOURS),
                            3));
        }

        int deliveredHours = resolveDeliveredHours(deliveryOption, false);
        int packedHours = Math.max(2, deliveredHours / 6);
        int shippedHours = Math.max(packedHours + 4, deliveredHours / 3);
        int outForDeliveryHours = Math.max(shippedHours + 6, deliveredHours - 10);

        return List.of(
                new StageMilestone(
                        TRACKING_STAGE_PLACED,
                        "Order confirmed",
                        "Seller has accepted your order and started processing.",
                        "Seller order desk",
                        baseTime,
                        1),
                new StageMilestone(
                        TRACKING_STAGE_PACKED,
                        "Packed at fulfillment center",
                        "Your package has been packed and is ready for dispatch.",
                        "Regional fulfillment center",
                        baseTime.plus(packedHours, ChronoUnit.HOURS),
                        2),
                new StageMilestone(
                        TRACKING_STAGE_SHIPPED,
                        "Shipped",
                        "The package has left the fulfillment center and is in transit.",
                        "In transit",
                        baseTime.plus(shippedHours, ChronoUnit.HOURS),
                        3),
                new StageMilestone(
                        TRACKING_STAGE_OUT_FOR_DELIVERY,
                        "Out for delivery",
                        "Your package has reached the local hub and is out for delivery.",
                        "Local delivery hub",
                        baseTime.plus(outForDeliveryHours, ChronoUnit.HOURS),
                        4),
                new StageMilestone(
                        TRACKING_STAGE_DELIVERED,
                        "Delivered",
                        "Delivery completed. Enjoy your purchase.",
                        "Delivery address",
                        baseTime.plus(deliveredHours, ChronoUnit.HOURS),
                        5));
    }

    private int resolveDeliveredHours(String deliveryOption, boolean pickupOrder) {
        if (pickupOrder) {
            return 72;
        }

        String normalized = normalizeDeliveryOption(deliveryOption);
        if (normalized.contains("same day")) {
            return 24;
        }
        if (normalized.contains("next day")) {
            return 36;
        }
        if (normalized.contains("express") || normalized.contains("priority")) {
            return 60;
        }
        return 120;
    }

    private String resolveCarrierName(String deliveryOption, boolean pickupOrder) {
        if (pickupOrder) {
            return "Campus Pickup Desk";
        }

        String normalized = normalizeDeliveryOption(deliveryOption);
        if (normalized.contains("same day")) {
            return "MCM Swift";
        }
        if (normalized.contains("express") || normalized.contains("priority")) {
            return "MCM Express";
        }
        return "MCM Logistics";
    }

    private String resolveCarrierContact(String deliveryOption, boolean pickupOrder) {
        if (pickupOrder) {
            return "+91-1800-266-274";
        }

        String normalized = normalizeDeliveryOption(deliveryOption);
        if (normalized.contains("same day")) {
            return "+91-1800-266-782";
        }
        if (normalized.contains("express") || normalized.contains("priority")) {
            return "+91-1800-266-397";
        }
        return "+91-1800-266-543";
    }

    private boolean isPickupOrder(String deliveryOption) {
        String normalized = normalizeDeliveryOption(deliveryOption);
        return normalized.contains("pickup") || normalized.contains("collect");
    }

    private String normalizeDeliveryOption(String deliveryOption) {
        return deliveryOption == null ? "" : deliveryOption.toLowerCase(Locale.ROOT);
    }

    private String normalizeTrackingStage(String stage) {
        String normalized = stage == null ? "" : stage.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case TRACKING_STAGE_PENDING_PAYMENT,
                    TRACKING_STAGE_PLACED,
                    TRACKING_STAGE_PACKED,
                    TRACKING_STAGE_SHIPPED,
                    TRACKING_STAGE_OUT_FOR_DELIVERY,
                    TRACKING_STAGE_READY_FOR_PICKUP,
                    TRACKING_STAGE_DELIVERED ->
                normalized;
            default -> TRACKING_STAGE_PLACED;
        };
    }

    private boolean isPendingPayment(PurchaseOrder order) {
        if (TRACKING_STAGE_PENDING_PAYMENT.equals(normalizeTrackingStage(order.getOrderStatus()))) {
            return true;
        }

        return "ONLINE".equalsIgnoreCase(order.getPaymentMethod())
                && "PENDING".equalsIgnoreCase(order.getPaymentStatus());
    }

    private double calculateProgress(String stage, boolean pickupOrder) {
        return switch (normalizeTrackingStage(stage)) {
            case TRACKING_STAGE_PENDING_PAYMENT -> 8.0;
            case TRACKING_STAGE_PLACED -> 20.0;
            case TRACKING_STAGE_PACKED -> 45.0;
            case TRACKING_STAGE_SHIPPED -> 68.0;
            case TRACKING_STAGE_OUT_FOR_DELIVERY,
                    TRACKING_STAGE_READY_FOR_PICKUP ->
                88.0;
            case TRACKING_STAGE_DELIVERED -> 100.0;
            default -> pickupOrder ? 30.0 : 20.0;
        };
    }

    private String generateTrackingNumber(PurchaseOrder order) {
        if (order.getId() != null) {
            return String.format(Locale.ROOT, "MCMTRK-%08d", order.getId());
        }

        return "MCMTRK-" + Instant.now().toEpochMilli();
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
                double price = primeMembershipConfigService.resolvePrimeMembershipYearlyPrice();
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
        response.put("trackingNumber", order.getTrackingNumber());
        response.put("trackingStage", order.getOrderStatus());
        response.put("estimatedDeliveryAt", order.getEstimatedDeliveryAt());
        return response;
    }

    private record StageMilestone(
            String stage,
            String title,
            String description,
            String location,
            Instant reachedAt,
            int sortOrder) {
    }

    private record TrackingSnapshot(
            String currentStage,
            double progressPercent,
            List<Map<String, Object>> events) {
    }

        public record AdminTrackingEventInput(
            String trackingStage,
            String eventTitle,
            String eventDescription,
            String eventLocation,
            String carrierName,
            String carrierContact,
            String trackingNumber,
            Instant estimatedDeliveryAt,
            Instant eventTime) {
        }

    public record OrderItemInput(String id, Integer quantity) {
    }

    public record ResolvedItem(String id, String name, Double unitPrice, Integer quantity, Double lineTotal) {
    }
}
