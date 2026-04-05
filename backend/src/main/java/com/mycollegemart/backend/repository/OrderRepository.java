package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<PurchaseOrder, Long> {
    Optional<PurchaseOrder> findByRazorpayOrderId(String razorpayOrderId);

    List<PurchaseOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PurchaseOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<PurchaseOrder> findByOrderNumberContainingIgnoreCaseOrTrackingNumberContainingIgnoreCaseOrderByCreatedAtDesc(
            String orderNumberQuery,
            String trackingNumberQuery,
            Pageable pageable);
}
