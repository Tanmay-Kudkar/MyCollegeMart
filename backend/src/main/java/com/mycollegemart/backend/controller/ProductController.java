package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.service.ProductService;
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

    @Autowired
    private ProductService productService;

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
    public Product addProduct(@RequestBody Product product) {
        return productService.addProduct(product);
    }

    @PostMapping(value = "/listing", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addListing(
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("price") Double price,
            @RequestParam("category") String category,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestParam(value = "isPrimeExclusive", required = false, defaultValue = "false") Boolean isPrimeExclusive,
            @RequestParam(value = "rating", required = false) Double rating,
            @RequestParam(value = "highlightsJson", required = false) String highlightsJson,
            @RequestParam(value = "specsJson", required = false) String specsJson,
            @RequestParam(value = "externalVideoUrl", required = false) String externalVideoUrl,
            @RequestPart(value = "images", required = false) List<MultipartFile> imageFiles,
            @RequestPart(value = "videos", required = false) List<MultipartFile> videoFiles) {

        Product product = new Product();
        product.setName(name);
        product.setDescription(description);
        product.setPrice(price);
        product.setCategory(category);
        product.setBranch(branch);
        product.setSemester(semester);
        product.setIsPrimeExclusive(Boolean.TRUE.equals(isPrimeExclusive));
        product.setRating(rating);
        product.setHighlightsJson(highlightsJson);
        product.setSpecsJson(specsJson);
        product.setExternalVideoUrl(externalVideoUrl);

        Product savedProduct = productService.addListing(product, imageFiles, videoFiles);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedProduct);
    }

    @GetMapping("/{id}/media")
    public ResponseEntity<List<Map<String, Object>>> getListingMedia(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getListingMedia(id));
    }
}