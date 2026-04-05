package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.PurchaseOrderTrackingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderTrackingEventRepository extends JpaRepository<PurchaseOrderTrackingEvent, Long> {
    List<PurchaseOrderTrackingEvent> findByPurchaseOrderIdOrderBySortOrderAscEventTimeAsc(Long purchaseOrderId);
}
