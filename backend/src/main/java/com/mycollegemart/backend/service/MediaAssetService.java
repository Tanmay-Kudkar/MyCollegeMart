package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.MediaAsset;
import com.mycollegemart.backend.repository.MediaAssetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MediaAssetService {

    private static final long MAX_FILE_SIZE_BYTES = 25L * 1024L * 1024L;

    private final MediaAssetRepository mediaAssetRepository;

    @Autowired
    public MediaAssetService(MediaAssetRepository mediaAssetRepository) {
        this.mediaAssetRepository = mediaAssetRepository;
    }

    public Optional<MediaAsset> findById(Long mediaId) {
        return mediaAssetRepository.findById(mediaId);
    }

    public List<MediaAsset> findByOwner(String ownerType, Long ownerId) {
        return mediaAssetRepository.findByOwnerTypeAndOwnerIdOrderByDisplayOrderAscIdAsc(ownerType, ownerId);
    }

    public List<MediaAsset> findByOwnerAndType(String ownerType, Long ownerId, String mediaType) {
        return mediaAssetRepository.findByOwnerTypeAndOwnerIdAndMediaTypeOrderByDisplayOrderAscIdAsc(ownerType, ownerId,
                mediaType);
    }

    public List<MediaAsset> storeFiles(String ownerType, Long ownerId, String mediaType, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }

        int nextOrder = findByOwner(ownerType, ownerId).size();
        List<MediaAsset> storedAssets = new ArrayList<>();

        for (MultipartFile file : files) {
            MediaAsset saved = storeSingle(ownerType, ownerId, mediaType, file, nextOrder);
            if (saved != null) {
                storedAssets.add(saved);
                nextOrder += 1;
            }
        }

        return storedAssets;
    }

    public List<MediaAsset> replaceFiles(String ownerType, Long ownerId, String mediaType, List<MultipartFile> files) {
        mediaAssetRepository.deleteByOwnerTypeAndOwnerIdAndMediaType(ownerType, ownerId, mediaType);
        return storeFiles(ownerType, ownerId, mediaType, files);
    }

    public MediaAsset storeSingle(
            String ownerType,
            Long ownerId,
            String mediaType,
            MultipartFile file,
            Integer displayOrder) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds 25MB limit");
        }

        try {
            MediaAsset mediaAsset = new MediaAsset();
            mediaAsset.setOwnerType(ownerType);
            mediaAsset.setOwnerId(ownerId);
            mediaAsset.setMediaType(mediaType);
            mediaAsset.setFileName(file.getOriginalFilename());
            mediaAsset.setContentType(file.getContentType());
            mediaAsset.setFileSize(file.getSize());
            mediaAsset.setDisplayOrder(displayOrder == null ? 0 : displayOrder);
            mediaAsset.setData(file.getBytes());
            return mediaAssetRepository.save(mediaAsset);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }
    }

    public List<Map<String, Object>> toResponsePayload(String ownerType, Long ownerId) {
        return findByOwner(ownerType, ownerId).stream()
                .map(this::toResponseMedia)
                .toList();
    }

    public String buildMediaUrl(Long mediaId) {
        return "/api/media/" + mediaId;
    }

    private Map<String, Object> toResponseMedia(MediaAsset asset) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", asset.getId());
        response.put("mediaType", asset.getMediaType());
        response.put("fileName", asset.getFileName());
        response.put("contentType", asset.getContentType());
        response.put("fileSize", asset.getFileSize());
        response.put("url", buildMediaUrl(asset.getId()));
        return response;
    }
}
