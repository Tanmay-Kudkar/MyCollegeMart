package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.ProductQuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductQuestionAnswerRepository extends JpaRepository<ProductQuestionAnswer, Long> {

    List<ProductQuestionAnswer> findByQuestionIdOrderByCreatedAtAsc(Long questionId);

    List<ProductQuestionAnswer> findByQuestionIdInOrderByCreatedAtAsc(List<Long> questionIds);

    @Query("SELECT DISTINCT answer.questionId FROM ProductQuestionAnswer answer WHERE answer.questionId IN :questionIds")
    List<Long> findAnsweredQuestionIds(@Param("questionIds") List<Long> questionIds);
}
