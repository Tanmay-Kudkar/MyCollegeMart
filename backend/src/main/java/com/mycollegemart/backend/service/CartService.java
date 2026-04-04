package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.Cart;
import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.repository.CartRepository;
import com.mycollegemart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;

    @Autowired
    public CartService(CartRepository cartRepository, ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    public Cart getCartByUserId(Long userId) {
        Cart existing = cartRepository.findByUserId(userId);
        if (existing != null) {
            return existing;
        }

        Cart newCart = new Cart();
        newCart.setUserId(userId);
        return cartRepository.save(newCart);
    }

    public Cart saveCart(Cart cart) {
        return cartRepository.save(cart);
    }

    public Map<String, Object> addItem(Long userId, Long productId, Integer quantity) {
        int safeQuantity = (quantity == null || quantity <= 0) ? 1 : quantity;
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        Cart cart = getCartByUserId(userId);
        Map<Long, Integer> items = cart.getProducts();
        int existingQty = items.getOrDefault(product.getId(), 0);
        items.put(product.getId(), existingQty + safeQuantity);
        cart.setProducts(items);
        cartRepository.save(cart);

        return buildCartResponse(cart);
    }

    public Map<String, Object> updateItemQuantity(Long userId, Long productId, Integer quantity) {
        Cart cart = getCartByUserId(userId);
        Map<Long, Integer> items = cart.getProducts();

        if (quantity == null || quantity <= 0) {
            items.remove(productId);
        } else {
            items.put(productId, quantity);
        }

        cart.setProducts(items);
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    public Map<String, Object> removeItem(Long userId, Long productId) {
        Cart cart = getCartByUserId(userId);
        cart.getProducts().remove(productId);
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    public Map<String, Object> clearCart(Long userId) {
        Cart cart = getCartByUserId(userId);
        cart.getProducts().clear();
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    public Map<String, Object> getDetailedCart(Long userId) {
        Cart cart = getCartByUserId(userId);
        return buildCartResponse(cart);
    }

    private Map<String, Object> buildCartResponse(Cart cart) {
        List<Map<String, Object>> items = new ArrayList<>();
        double subtotal = 0.0;

        for (Map.Entry<Long, Integer> entry : cart.getProducts().entrySet()) {
            Long productId = entry.getKey();
            Integer quantity = entry.getValue();
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || quantity == null || quantity <= 0) {
                continue;
            }

            double price = product.getPrice() == null ? 0.0 : product.getPrice();
            double lineTotal = price * quantity;
            subtotal += lineTotal;

            Map<String, Object> row = new HashMap<>();
            row.put("id", product.getId());
            row.put("name", product.getName());
            row.put("price", price);
            row.put("imageUrl", product.getImageUrl());
            row.put("quantity", quantity);
            row.put("lineTotal", lineTotal);
            items.add(row);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("userId", cart.getUserId());
        response.put("items", items);
        response.put("subtotal", subtotal);
        return response;
    }
}