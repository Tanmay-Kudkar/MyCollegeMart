package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.AiFeedback;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiFeedbackRepository extends JpaRepository<AiFeedback, Long> {
    List<AiFeedback> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<AiFeedback> findByChatSessionIdContainingIgnoreCaseOrderByCreatedAtDesc(String chatSessionId,
            Pageable pageable);

    List<AiFeedback> findByFeedbackTypeIgnoreCaseOrderByCreatedAtDesc(String feedbackType, Pageable pageable);

    List<AiFeedback> findByChatSessionIdContainingIgnoreCaseAndFeedbackTypeIgnoreCaseOrderByCreatedAtDesc(
            String chatSessionId,
            String feedbackType,
            Pageable pageable);
}
