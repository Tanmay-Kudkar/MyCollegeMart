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

@Service
public class ProductService {

    private static final String PRODUCT_MEDIA_OWNER_TYPE = "MARKETPLACE_LISTING";

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
        normalizeDefaults(product);
        return productRepository.save(product);
    }

    public Product addListing(Product product, List<MultipartFile> imageFiles, List<MultipartFile> videoFiles) {
        normalizeDefaults(product);
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
    }
}