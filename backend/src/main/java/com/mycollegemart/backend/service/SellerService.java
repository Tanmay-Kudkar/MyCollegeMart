package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SellerService {

    private final ProductRepository productRepository;

    @Autowired
    public SellerService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Map<String, Object> getDashboardOverview(Long sellerUserId) {
        List<Product> products = productRepository.findByListedByUserIdOrderByCreatedAtDesc(sellerUserId);

        int activeListings = products.size();
        double averageRating = products.stream()
                .map(Product::getRating)
                .filter(rating -> rating != null && rating > 0)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        List<Map<String, Object>> recentListings = products.stream()
                .limit(8)
                .map(product -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", product.getId());
                    item.put("name", product.getName());
                    item.put("description", product.getDescription());
                    item.put("price", product.getPrice());
                    item.put("category", product.getCategory());
                    item.put("branch", product.getBranch());
                    item.put("semester", product.getSemester());
                    item.put("imageUrl", product.getImageUrl());
                    item.put("rating", product.getRating());
                    item.put("inStock", product.getInStock());
                    item.put("stockQuantity", product.getStockQuantity());
                    item.put("listedByUserId", product.getListedByUserId());
                    item.put("createdAt", product.getCreatedAt());
                    return item;
                })
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("activeListings", activeListings);
        response.put("averageRating", averageRating);
        response.put("estimatedSales", 0);
        response.put("recentListings", recentListings);
        return response;
    }
}
