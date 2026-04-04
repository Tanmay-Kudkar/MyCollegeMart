package com.mycollegemart.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "assignment_help_request")
public class AssignmentHelpRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "skill_service_id")
    private Long skillServiceId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "service_type", nullable = false, length = 64)
    private String serviceType;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String topic;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String branch;

    @Column(nullable = false, length = 16)
    private String semester;

    @Column(nullable = false, length = 32)
    private String deadline;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "amount_paid", nullable = false)
    private Double amountPaid;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "payment_method", nullable = false, length = 32)
    private String paymentMethod;

    @Column(name = "payment_status", nullable = false, length = 32)
    private String paymentStatus;

    @Column(nullable = false, length = 8)
    private String currency;

    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature")
    private String razorpaySignature;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
