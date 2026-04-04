package com.mycollegemart.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import org.hibernate.annotations.CreationTimestamp;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Double price;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    private String category;
    private String branch;
    private String semester;
    private Boolean isPrimeExclusive = false;
    private Double rating;

    @Column(name = "highlights_json", columnDefinition = "TEXT")
    private String highlightsJson;

    @Column(name = "specs_json", columnDefinition = "TEXT")
    private String specsJson;

    @Column(name = "external_video_url", length = 1024)
    private String externalVideoUrl;

    @Column(name = "listed_by_user_id")
    private Long listedByUserId;

    @Column(name = "in_stock", nullable = false)
    private Boolean inStock = true;

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @CreationTimestamp
    private Instant createdAt;
}