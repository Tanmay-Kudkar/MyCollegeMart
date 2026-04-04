package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByListedByUserIdOrderByCreatedAtDesc(Long listedByUserId);

    long countByListedByUserId(Long listedByUserId);
}