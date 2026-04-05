package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.model.ProductQuestion;
import com.mycollegemart.backend.repository.ProductQuestionAnswerRepository;
import com.mycollegemart.backend.repository.ProductQuestionRepository;
import com.mycollegemart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SellerService {

    private final ProductRepository productRepository;
    private final ProductQuestionRepository productQuestionRepository;
    private final ProductQuestionAnswerRepository productQuestionAnswerRepository;

    @Autowired
    public SellerService(
            ProductRepository productRepository,
            ProductQuestionRepository productQuestionRepository,
            ProductQuestionAnswerRepository productQuestionAnswerRepository) {
        this.productRepository = productRepository;
        this.productQuestionRepository = productQuestionRepository;
        this.productQuestionAnswerRepository = productQuestionAnswerRepository;
    }

    public Map<String, Object> getDashboardOverview(Long sellerUserId, boolean includeAllListings) {
        List<Product> products = includeAllListings
                ? productRepository.findAllByOrderByCreatedAtDesc()
                : productRepository.findByListedByUserIdOrderByCreatedAtDesc(sellerUserId);

        List<Long> productIds = products.stream()
                .map(Product::getId)
                .filter(id -> id != null)
                .toList();

        Map<Long, Integer> totalQuestionsByProduct = new HashMap<>();
        Map<Long, Integer> unansweredQuestionsByProduct = new HashMap<>();
        int totalUnansweredQuestions = 0;

        if (!productIds.isEmpty()) {
            List<ProductQuestion> questions = productQuestionRepository
                    .findByProductIdInOrderByCreatedAtDesc(productIds);
            List<Long> questionIds = questions.stream().map(ProductQuestion::getId).toList();
            Set<Long> answeredQuestionIds = questionIds.isEmpty()
                    ? Set.of()
                    : new HashSet<>(productQuestionAnswerRepository.findAnsweredQuestionIds(questionIds));

            for (ProductQuestion question : questions) {
                Long productId = question.getProductId();
                totalQuestionsByProduct.merge(productId, 1, Integer::sum);

                if (!answeredQuestionIds.contains(question.getId())) {
                    unansweredQuestionsByProduct.merge(productId, 1, Integer::sum);
                    totalUnansweredQuestions += 1;
                }
            }
        }

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
                    item.put("totalQuestionCount", totalQuestionsByProduct.getOrDefault(product.getId(), 0));
                    item.put("openQuestionCount", unansweredQuestionsByProduct.getOrDefault(product.getId(), 0));
                    return item;
                })
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("scope", includeAllListings ? "ALL" : "OWN");
        response.put("activeListings", activeListings);
        response.put("averageRating", averageRating);
        response.put("estimatedSales", 0);
        response.put("recentListings", recentListings);
        response.put("unansweredQuestions", totalUnansweredQuestions);
        response.put("questionCount", totalQuestionsByProduct.values().stream().mapToInt(Integer::intValue).sum());
        return response;
    }
}
