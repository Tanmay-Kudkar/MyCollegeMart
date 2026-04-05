package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.PrimeMembershipConfig;
import com.mycollegemart.backend.repository.PrimeMembershipConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class PrimeMembershipConfigService {

    public static final String DEADLINE_STANDARD = "Standard";
    public static final String DEADLINE_EXPRESS = "Express";
    public static final String DEADLINE_URGENT = "Urgent";

    private final PrimeMembershipConfigRepository primeMembershipConfigRepository;

    @Autowired
    public PrimeMembershipConfigService(PrimeMembershipConfigRepository primeMembershipConfigRepository) {
        this.primeMembershipConfigRepository = primeMembershipConfigRepository;
    }

    @Transactional
    public PrimeMembershipConfig getOrCreateConfig() {
        return primeMembershipConfigRepository.findTopByOrderByIdAsc()
                .orElseGet(() -> primeMembershipConfigRepository.save(buildDefaultConfig()));
    }

    public double resolvePrimeMembershipYearlyPrice() {
        PrimeMembershipConfig config = getOrCreateConfig();
        return roundCurrency(config.getPrimeMembershipYearlyPrice());
    }

    public String normalizeDeadlineOrDefault(String deadline) {
        if (deadline == null || deadline.isBlank()) {
            return DEADLINE_STANDARD;
        }

        String normalized = deadline.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("std") || normalized.startsWith("standard")) {
            return DEADLINE_STANDARD;
        }
        if (normalized.startsWith("exp") || normalized.startsWith("express")) {
            return DEADLINE_EXPRESS;
        }
        if (normalized.startsWith("urg") || normalized.startsWith("urgent")) {
            return DEADLINE_URGENT;
        }

        return DEADLINE_STANDARD;
    }

    public String normalizeDeadlineStrict(String deadline) {
        String normalized = normalizeDeadlineOrDefault(deadline);
        if (deadline == null || deadline.isBlank()) {
            return normalized;
        }

        String input = deadline.trim().toLowerCase(Locale.ROOT);
        boolean valid = input.startsWith("std")
                || input.startsWith("standard")
                || input.startsWith("exp")
                || input.startsWith("express")
                || input.startsWith("urg")
                || input.startsWith("urgent");

        if (!valid) {
            throw new IllegalArgumentException("Invalid deadline selected");
        }

        return normalized;
    }

    public double resolveAssignmentPrice(String deadline, boolean isPrimeMember) {
        PrimeMembershipConfig config = getOrCreateConfig();
        String normalizedDeadline = normalizeDeadlineOrDefault(deadline);

        return switch (normalizedDeadline) {
            case DEADLINE_EXPRESS -> roundCurrency(
                    isPrimeMember ? config.getAssignmentExpressPrimePrice()
                            : config.getAssignmentExpressRegularPrice());
            case DEADLINE_URGENT -> roundCurrency(
                    isPrimeMember ? config.getAssignmentUrgentPrimePrice() : config.getAssignmentUrgentRegularPrice());
            default -> roundCurrency(
                    isPrimeMember ? config.getAssignmentStandardPrimePrice()
                            : config.getAssignmentStandardRegularPrice());
        };
    }

    public Map<String, Object> getConfigPayload() {
        PrimeMembershipConfig config = getOrCreateConfig();
        return toPayload(config);
    }

    @Transactional
    public Map<String, Object> updateConfig(UpdateInput input) {
        validateUpdateInput(input);

        PrimeMembershipConfig config = getOrCreateConfig();
        config.setPrimeMembershipYearlyPrice(roundCurrency(input.primeMembershipYearlyPrice()));
        config.setAssignmentStandardRegularPrice(roundCurrency(input.assignmentStandardRegularPrice()));
        config.setAssignmentStandardPrimePrice(roundCurrency(input.assignmentStandardPrimePrice()));
        config.setAssignmentExpressRegularPrice(roundCurrency(input.assignmentExpressRegularPrice()));
        config.setAssignmentExpressPrimePrice(roundCurrency(input.assignmentExpressPrimePrice()));
        config.setAssignmentUrgentRegularPrice(roundCurrency(input.assignmentUrgentRegularPrice()));
        config.setAssignmentUrgentPrimePrice(roundCurrency(input.assignmentUrgentPrimePrice()));

        PrimeMembershipConfig saved = primeMembershipConfigRepository.save(config);
        return toPayload(saved);
    }

    private PrimeMembershipConfig buildDefaultConfig() {
        PrimeMembershipConfig config = new PrimeMembershipConfig();
        config.setPrimeMembershipYearlyPrice(299.0);
        config.setAssignmentStandardRegularPrice(149.0);
        config.setAssignmentStandardPrimePrice(99.0);
        config.setAssignmentExpressRegularPrice(249.0);
        config.setAssignmentExpressPrimePrice(149.0);
        config.setAssignmentUrgentRegularPrice(399.0);
        config.setAssignmentUrgentPrimePrice(249.0);
        return config;
    }

    private Map<String, Object> toPayload(PrimeMembershipConfig config) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("currency", "INR");
        payload.put("primeMembershipYearlyPrice", roundCurrency(config.getPrimeMembershipYearlyPrice()));
        payload.put("assignmentPricing", buildAssignmentPricing(config));
        payload.put("updatedAt", config.getUpdatedAt());
        return payload;
    }

    private Map<String, Object> buildAssignmentPricing(PrimeMembershipConfig config) {
        Map<String, Object> pricing = new LinkedHashMap<>();
        pricing.put(DEADLINE_STANDARD, buildTier("Standard Deadline (7 days)", "Balanced turnaround",
                config.getAssignmentStandardRegularPrice(), config.getAssignmentStandardPrimePrice()));
        pricing.put(DEADLINE_EXPRESS, buildTier("Express Deadline (3 days)", "Priority queue delivery",
                config.getAssignmentExpressRegularPrice(), config.getAssignmentExpressPrimePrice()));
        pricing.put(DEADLINE_URGENT, buildTier("Urgent Deadline (24 hours)", "Fast-track support",
                config.getAssignmentUrgentRegularPrice(), config.getAssignmentUrgentPrimePrice()));
        return pricing;
    }

    private Map<String, Object> buildTier(String label, String eta, Double regularPrice, Double primePrice) {
        double normalizedRegularPrice = roundCurrency(regularPrice);
        double normalizedPrimePrice = roundCurrency(primePrice);
        Map<String, Object> tier = new LinkedHashMap<>();
        tier.put("label", label);
        tier.put("eta", eta);
        tier.put("regularPrice", normalizedRegularPrice);
        tier.put("primePrice", normalizedPrimePrice);
        tier.put("savings", roundCurrency(Math.max(0.0, normalizedRegularPrice - normalizedPrimePrice)));
        return tier;
    }

    private void validateUpdateInput(UpdateInput input) {
        validatePositivePrice("primeMembershipYearlyPrice", input.primeMembershipYearlyPrice());
        validatePositivePrice("assignmentStandardRegularPrice", input.assignmentStandardRegularPrice());
        validatePositivePrice("assignmentStandardPrimePrice", input.assignmentStandardPrimePrice());
        validatePositivePrice("assignmentExpressRegularPrice", input.assignmentExpressRegularPrice());
        validatePositivePrice("assignmentExpressPrimePrice", input.assignmentExpressPrimePrice());
        validatePositivePrice("assignmentUrgentRegularPrice", input.assignmentUrgentRegularPrice());
        validatePositivePrice("assignmentUrgentPrimePrice", input.assignmentUrgentPrimePrice());

        validatePrimeNotAboveRegular(
                "Standard",
                input.assignmentStandardRegularPrice(),
                input.assignmentStandardPrimePrice());
        validatePrimeNotAboveRegular(
                "Express",
                input.assignmentExpressRegularPrice(),
                input.assignmentExpressPrimePrice());
        validatePrimeNotAboveRegular(
                "Urgent",
                input.assignmentUrgentRegularPrice(),
                input.assignmentUrgentPrimePrice());
    }

    private void validatePositivePrice(String fieldName, Double value) {
        if (value == null || !Double.isFinite(value) || value <= 0) {
            throw new IllegalArgumentException(fieldName + " must be greater than 0");
        }
    }

    private void validatePrimeNotAboveRegular(String tier, Double regularPrice, Double primePrice) {
        if (primePrice > regularPrice) {
            throw new IllegalArgumentException(tier + " prime price cannot be greater than regular price");
        }
    }

    private double roundCurrency(Double amount) {
        if (amount == null) {
            return 0.0;
        }

        return Math.round(amount * 100.0) / 100.0;
    }

    public record UpdateInput(
            Double primeMembershipYearlyPrice,
            Double assignmentStandardRegularPrice,
            Double assignmentStandardPrimePrice,
            Double assignmentExpressRegularPrice,
            Double assignmentExpressPrimePrice,
            Double assignmentUrgentRegularPrice,
            Double assignmentUrgentPrimePrice) {
    }
}
