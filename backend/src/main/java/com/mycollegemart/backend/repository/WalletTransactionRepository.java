package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.WalletTransaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    Optional<WalletTransaction> findByRazorpayOrderId(String razorpayOrderId);

    Optional<WalletTransaction> findByRazorpayPaymentId(String razorpayPaymentId);

    List<WalletTransaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
