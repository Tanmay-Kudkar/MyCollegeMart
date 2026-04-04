package com.mycollegemart.backend.service;

import com.mycollegemart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Service
public class WishlistService {

    private final UserService userService;
    private final ProductRepository productRepository;

    @Autowired
    public WishlistService(UserService userService, ProductRepository productRepository) {
        this.userService = userService;
        this.productRepository = productRepository;
    }

    public Set<Long> getWishlist(Long userId) {
        return userService.getWishlist(userId);
    }

    public Set<Long> addToWishlist(Long userId, Long productId) {
        ensureProductExists(productId);
        return userService.addToWishlist(userId, productId);
    }

    public Set<Long> removeFromWishlist(Long userId, Long productId) {
        return userService.removeFromWishlist(userId, productId);
    }

    public Set<Long> syncWishlist(Long userId, Set<Long> incomingProductIds) {
        Set<Long> validIds = new HashSet<>();
        if (incomingProductIds != null) {
            for (Long productId : incomingProductIds) {
                if (productId != null && productRepository.existsById(productId)) {
                    validIds.add(productId);
                }
            }
        }
        return userService.syncWishlist(userId, validIds);
    }

    private void ensureProductExists(Long productId) {
        if (productId == null || !productRepository.existsById(productId)) {
            throw new IllegalArgumentException("Product not found");
        }
    }
}
