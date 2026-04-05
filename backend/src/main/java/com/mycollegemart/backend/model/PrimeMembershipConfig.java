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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "prime_membership_config")
public class PrimeMembershipConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prime_membership_yearly_price", nullable = false)
    private Double primeMembershipYearlyPrice;

    @Column(name = "assignment_standard_regular_price", nullable = false)
    private Double assignmentStandardRegularPrice;

    @Column(name = "assignment_standard_prime_price", nullable = false)
    private Double assignmentStandardPrimePrice;

    @Column(name = "assignment_express_regular_price", nullable = false)
    private Double assignmentExpressRegularPrice;

    @Column(name = "assignment_express_prime_price", nullable = false)
    private Double assignmentExpressPrimePrice;

    @Column(name = "assignment_urgent_regular_price", nullable = false)
    private Double assignmentUrgentRegularPrice;

    @Column(name = "assignment_urgent_prime_price", nullable = false)
    private Double assignmentUrgentPrimePrice;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
