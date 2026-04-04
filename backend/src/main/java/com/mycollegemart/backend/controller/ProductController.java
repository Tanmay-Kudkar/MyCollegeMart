package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.service.ProductService;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Autowired
    public ProductController(ProductService productService, JwtUtil jwtUtil, UserService userService) {
        this.productService = productService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @GetMapping
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        return productService.getProductById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Product not found"));
    }

    @PostMapping
    public ResponseEntity<?> addProduct(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestBody Product product) {
        User merchant = resolveAuthenticatedMerchant(authHeader);
        if (merchant == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only verified merchant accounts can list products"));
        }

        try {
            product.setListedByUserId(merchant.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(productService.addProduct(product));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping(value = "/listing", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addListing(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("price") Double price,
            @RequestParam("category") String category,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestParam(value = "inStock", required = false, defaultValue = "true") Boolean inStock,
            @RequestParam(value = "stockQuantity", required = false) Integer stockQuantity,
            @RequestParam(value = "isPrimeExclusive", required = false, defaultValue = "false") Boolean isPrimeExclusive,
            @RequestParam(value = "rating", required = false) Double rating,
            @RequestParam(value = "highlightsJson", required = false) String highlightsJson,
            @RequestParam(value = "specsJson", required = false) String specsJson,
            @RequestParam(value = "externalVideoUrl", required = false) String externalVideoUrl,
            @RequestPart(value = "images", required = false) List<MultipartFile> imageFiles,
            @RequestPart(value = "videos", required = false) List<MultipartFile> videoFiles) {
        User merchant = resolveAuthenticatedMerchant(authHeader);
        if (merchant == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only verified merchant accounts can create listings"));
        }

        Product product = new Product();
        product.setName(name);
        product.setDescription(description);
        product.setPrice(price);
        product.setCategory(category);
        product.setBranch(branch);
        product.setSemester(semester);
        product.setInStock(Boolean.TRUE.equals(inStock));
        product.setStockQuantity(stockQuantity);
        product.setIsPrimeExclusive(Boolean.TRUE.equals(isPrimeExclusive));
        product.setRating(rating);
        product.setHighlightsJson(highlightsJson);
        product.setSpecsJson(specsJson);
        product.setExternalVideoUrl(externalVideoUrl);

        try {
            Product savedProduct = productService.addListing(product, merchant.getId(), imageFiles, videoFiles);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedProduct);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping(value = "/{id}/listing", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateListing(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Product updates) {
        User merchant = resolveAuthenticatedMerchant(authHeader);
        if (merchant == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only verified merchant accounts can edit listings"));
        }

        try {
            return ResponseEntity.ok(productService.updateListing(id, updates, merchant.getId()));
        } catch (IllegalArgumentException e) {
            if ("Product not found".equalsIgnoreCase(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping(value = "/{id}/listing", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateListingWithMedia(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "price", required = false) Double price,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "semester", required = false) String semester,
            @RequestParam(value = "inStock", required = false) Boolean inStock,
            @RequestParam(value = "stockQuantity", required = false) Integer stockQuantity,
            @RequestParam(value = "isPrimeExclusive", required = false) Boolean isPrimeExclusive,
            @RequestParam(value = "rating", required = false) Double rating,
            @RequestParam(value = "highlightsJson", required = false) String highlightsJson,
            @RequestParam(value = "specsJson", required = false) String specsJson,
            @RequestParam(value = "externalVideoUrl", required = false) String externalVideoUrl,
            @RequestPart(value = "images", required = false) List<MultipartFile> imageFiles,
            @RequestPart(value = "videos", required = false) List<MultipartFile> videoFiles) {
        User merchant = resolveAuthenticatedMerchant(authHeader);
        if (merchant == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only verified merchant accounts can edit listings"));
        }

        Product updates = new Product();
        updates.setName(name);
        updates.setDescription(description);
        updates.setPrice(price);
        updates.setCategory(category);
        updates.setBranch(branch);
        updates.setSemester(semester);
        updates.setInStock(inStock);
        updates.setStockQuantity(stockQuantity);
        updates.setIsPrimeExclusive(isPrimeExclusive);
        updates.setRating(rating);
        updates.setHighlightsJson(highlightsJson);
        updates.setSpecsJson(specsJson);
        updates.setExternalVideoUrl(externalVideoUrl);

        try {
            return ResponseEntity
                    .ok(productService.updateListingWithMedia(id, updates, merchant.getId(), imageFiles, videoFiles));
        } catch (IllegalArgumentException e) {
            if ("Product not found".equalsIgnoreCase(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/media")
    public ResponseEntity<List<Map<String, Object>>> getListingMedia(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getListingMedia(id));
    }

    private User resolveAuthenticatedMerchant(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String userIdFromToken = jwtUtil.validateAndGetUserId(authHeader.substring(7));
        if (userIdFromToken == null) {
            return null;
        }

        Long userId;
        try {
            userId = Long.parseLong(userIdFromToken);
        } catch (NumberFormatException e) {
            return null;
        }

        User user = userService.findById(userId);
        if (user == null || !userService.canManageListings(user)) {
            return null;
        }

        return user;
    }
}