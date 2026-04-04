package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.AssignmentHelpRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssignmentHelpRequestRepository extends JpaRepository<AssignmentHelpRequest, Long> {
}
