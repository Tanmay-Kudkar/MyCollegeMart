package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.PrimeMembershipConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PrimeMembershipConfigRepository extends JpaRepository<PrimeMembershipConfig, Long> {
    Optional<PrimeMembershipConfig> findTopByOrderByIdAsc();
}
