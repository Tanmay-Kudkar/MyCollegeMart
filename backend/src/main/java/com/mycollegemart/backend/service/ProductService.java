package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.MediaAsset;
import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class ProductService {

    private static final String PRODUCT_MEDIA_OWNER_TYPE = "MARKETPLACE_LISTING";
    private static final int MAX_IMAGES_PER_LISTING = 10;
    private static final int MAX_VIDEOS_PER_LISTING = 3;
    private static final Set<String> ALLOWED_BRANCHES = Set.of(
            "All Branches",
            "Any",
            "Computer Engineering",
            "Civil Engineering",
            "Electronics and Telecommunication Engineering",
            "Information Technology",
            "Instrumentation Engineering",
            "Mechanical Engineering",
            "Artificial Intelligence and Data Science",
            "Computer Science and Engineering (Data Science)",
            "Electronics and Telecommunication Engineering (VLSI)");
    private static final Set<String> ALLOWED_SEMESTERS = Set.of("All", "Any", "1", "2", "3", "4", "5", "6", "7", "8");
    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "Textbooks",
            "Notes",
            "Lab Equipment",
            "Electronics",
            "Calculators",
            "Drawing Supplies",
            "Study Guides",
            "Programming Tools",
            "Project Materials",
            "Workshop Equipment",
            "Technical Devices",
            "Reference Books",
            "Stationery",
            "General");

    private final ProductRepository productRepository;
    private final MediaAssetService mediaAssetService;

    @Autowired
    public ProductService(ProductRepository productRepository, MediaAssetService mediaAssetService) {
        this.productRepository = productRepository;
        this.mediaAssetService = mediaAssetService;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    public Product addProduct(Product product) {
        sanitizeProduct(product);
        normalizeDefaults(product);
        validateListing(product);
        return productRepository.save(product);
    }

    public Product addListing(
            Product product,
            Long sellerUserId,
            List<MultipartFile> imageFiles,
            List<MultipartFile> videoFiles) {
        validateMediaCounts(imageFiles, videoFiles);
        sanitizeProduct(product);
        normalizeDefaults(product);
        validateListing(product);
        product.setListedByUserId(sellerUserId);
        Product savedProduct = productRepository.save(product);

        List<MediaAsset> storedImages = mediaAssetService.storeFiles(
                PRODUCT_MEDIA_OWNER_TYPE,
                savedProduct.getId(),
                "IMAGE",
                imageFiles);

        mediaAssetService.storeFiles(
                PRODUCT_MEDIA_OWNER_TYPE,
                savedProduct.getId(),
                "VIDEO",
                videoFiles);

        if ((savedProduct.getImageUrl() == null || savedProduct.getImageUrl().isBlank()) && !storedImages.isEmpty()) {
            savedProduct.setImageUrl(mediaAssetService.buildMediaUrl(storedImages.get(0).getId()));
            savedProduct = productRepository.save(savedProduct);
        }

        return savedProduct;
    }

    public Product updateListing(Long productId, Product updates, Long sellerUserId) {
        Product existing = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        if (existing.getListedByUserId() == null || !existing.getListedByUserId().equals(sellerUserId)) {
            throw new IllegalStateException("You can edit only your own listings");
        }

        if (updates.getName() != null && !updates.getName().isBlank()) {
            existing.setName(updates.getName().trim());
        }
        if (updates.getDescription() != null) {
            existing.setDescription(updates.getDescription().trim());
        }
        if (updates.getPrice() != null && updates.getPrice() >= 0) {
            existing.setPrice(updates.getPrice());
        }
        if (updates.getCategory() != null && !updates.getCategory().isBlank()) {
            existing.setCategory(updates.getCategory().trim());
        }
        if (updates.getBranch() != null && !updates.getBranch().isBlank()) {
            existing.setBranch(updates.getBranch().trim());
        }
        if (updates.getSemester() != null && !updates.getSemester().isBlank()) {
            existing.setSemester(updates.getSemester().trim());
        }
        if (updates.getIsPrimeExclusive() != null) {
            existing.setIsPrimeExclusive(updates.getIsPrimeExclusive());
        }
        if (updates.getRating() != null && updates.getRating() >= 0) {
            existing.setRating(updates.getRating());
        }
        if (updates.getHighlightsJson() != null) {
            existing.setHighlightsJson(updates.getHighlightsJson());
        }
        if (updates.getSpecsJson() != null) {
            existing.setSpecsJson(updates.getSpecsJson());
        }
        if (updates.getExternalVideoUrl() != null) {
            existing.setExternalVideoUrl(updates.getExternalVideoUrl().trim());
        }
        if (updates.getInStock() != null) {
            existing.setInStock(updates.getInStock());
        }
        if (updates.getStockQuantity() != null) {
            existing.setStockQuantity(updates.getStockQuantity());
        }

        sanitizeProduct(existing);
        normalizeDefaults(existing);
        validateListing(existing);
        return productRepository.save(existing);
    }

    public Product updateListingWithMedia(
            Long productId,
            Product updates,
            Long sellerUserId,
            List<MultipartFile> imageFiles,
            List<MultipartFile> videoFiles) {
        validateMediaCounts(imageFiles, videoFiles);

        Product updatedProduct = updateListing(productId, updates, sellerUserId);

        if (hasAnyUploadedFiles(imageFiles)) {
            List<MediaAsset> storedImages = mediaAssetService.replaceFiles(
                    PRODUCT_MEDIA_OWNER_TYPE,
                    updatedProduct.getId(),
                    "IMAGE",
                    imageFiles);

            updatedProduct.setImageUrl(storedImages.isEmpty()
                    ? null
                    : mediaAssetService.buildMediaUrl(storedImages.get(0).getId()));
            updatedProduct = productRepository.save(updatedProduct);
        }

        if (hasAnyUploadedFiles(videoFiles)) {
            mediaAssetService.replaceFiles(
                    PRODUCT_MEDIA_OWNER_TYPE,
                    updatedProduct.getId(),
                    "VIDEO",
                    videoFiles);
        }

        return updatedProduct;
    }

    public List<Map<String, Object>> getListingMedia(Long productId) {
        if (productId == null || productRepository.findById(productId).isEmpty()) {
            return List.of();
        }
        return mediaAssetService.toResponsePayload(PRODUCT_MEDIA_OWNER_TYPE, productId);
    }

    private void normalizeDefaults(Product product) {
        if (product.getCategory() == null || product.getCategory().isBlank()) {
            product.setCategory("General");
        }
        if (product.getBranch() == null || product.getBranch().isBlank()) {
            product.setBranch("All Branches");
        }
        if (product.getSemester() == null || product.getSemester().isBlank()) {
            product.setSemester("All");
        }
        if (product.getIsPrimeExclusive() == null) {
            product.setIsPrimeExclusive(false);
        }
        if (product.getRating() == null) {
            product.setRating(4.3);
        }
        if (product.getDescription() == null) {
            product.setDescription("");
        }
        if (product.getInStock() == null) {
            product.setInStock(true);
        }
        if (!Boolean.TRUE.equals(product.getInStock())) {
            product.setStockQuantity(0);
        }
    }

    private void sanitizeProduct(Product product) {
        if (product.getName() != null) {
            product.setName(product.getName().trim());
        }
        if (product.getDescription() != null) {
            product.setDescription(product.getDescription().trim());
        }
        if (product.getCategory() != null) {
            product.setCategory(product.getCategory().trim());
        }
        if (product.getBranch() != null) {
            product.setBranch(product.getBranch().trim());
        }
        if (product.getSemester() != null) {
            product.setSemester(product.getSemester().trim());
        }
        if (product.getExternalVideoUrl() != null) {
            product.setExternalVideoUrl(product.getExternalVideoUrl().trim());
        }
    }

    private void validateListing(Product product) {
        String name = product.getName() == null ? "" : product.getName().trim();
        if (name.length() < 3) {
            throw new IllegalArgumentException("Listing title must be at least 3 characters");
        }
        if (name.length() > 140) {
            throw new IllegalArgumentException("Listing title must be under 140 characters");
        }

        String description = product.getDescription() == null ? "" : product.getDescription().trim();
        if (description.length() < 15) {
            throw new IllegalArgumentException("Description should be at least 15 characters");
        }

        if (product.getPrice() == null || product.getPrice() <= 0) {
            throw new IllegalArgumentException("Please enter a valid price");
        }
        if (product.getPrice() > 500000) {
            throw new IllegalArgumentException("Price is too high for a campus listing");
        }

        if (!ALLOWED_CATEGORIES.contains(product.getCategory())) {
            throw new IllegalArgumentException("Invalid product category");
        }
        if (!ALLOWED_BRANCHES.contains(product.getBranch())) {
            throw new IllegalArgumentException("Please select a valid engineering branch");
        }
        if (!ALLOWED_SEMESTERS.contains(product.getSemester())) {
            throw new IllegalArgumentException("Please select a valid semester");
        }

        Integer stockQuantity = product.getStockQuantity();
        if (stockQuantity != null && stockQuantity < 0) {
            throw new IllegalArgumentException("Stock quantity cannot be negative");
        }
        if (Boolean.TRUE.equals(product.getInStock()) && stockQuantity != null && stockQuantity == 0) {
            throw new IllegalArgumentException("Set quantity above 0, or mark item as out of stock");
        }
    }

    private void validateMediaCounts(List<MultipartFile> imageFiles, List<MultipartFile> videoFiles) {
        int imageCount = countUploadedFiles(imageFiles);
        int videoCount = countUploadedFiles(videoFiles);

        if (imageCount > MAX_IMAGES_PER_LISTING) {
            throw new IllegalArgumentException("You can upload up to 10 images");
        }

        if (videoCount > MAX_VIDEOS_PER_LISTING) {
            throw new IllegalArgumentException("You can upload up to 3 videos");
        }
    }

    private int countUploadedFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return 0;
        }

        return (int) files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .count();
    }

    private boolean hasAnyUploadedFiles(List<MultipartFile> files) {
        return countUploadedFiles(files) > 0;
    }
}