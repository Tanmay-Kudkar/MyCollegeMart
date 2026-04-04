package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.SkillServiceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillServiceRepository extends JpaRepository<SkillServiceListing, Long> {
}
