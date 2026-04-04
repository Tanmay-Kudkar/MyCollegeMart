package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.ProductQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductQuestionRepository extends JpaRepository<ProductQuestion, Long> {

    List<ProductQuestion> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<ProductQuestion> findByProductIdInOrderByCreatedAtDesc(List<Long> productIds);

    Optional<ProductQuestion> findByIdAndProductId(Long id, Long productId);
}
