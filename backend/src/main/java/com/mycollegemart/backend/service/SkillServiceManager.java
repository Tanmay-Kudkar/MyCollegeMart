package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.SkillServiceListing;
import com.mycollegemart.backend.repository.SkillServiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SkillServiceManager {

    private static final String OWNER_TYPE = "SKILL_SERVICE";

    private final SkillServiceRepository skillServiceRepository;
    private final MediaAssetService mediaAssetService;

    @Autowired
    public SkillServiceManager(SkillServiceRepository skillServiceRepository, MediaAssetService mediaAssetService) {
        this.skillServiceRepository = skillServiceRepository;
        this.mediaAssetService = mediaAssetService;
    }

    public List<Map<String, Object>> getAllServices() {
        return skillServiceRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toResponse)
                .toList();
    }

    public Map<String, Object> createService(
            SkillServiceListing incoming,
            List<MultipartFile> imageFiles,
            List<MultipartFile> videoFiles) {
        normalize(incoming);
        SkillServiceListing saved = skillServiceRepository.save(incoming);

        mediaAssetService.storeFiles(OWNER_TYPE, saved.getId(), "IMAGE", imageFiles);
        mediaAssetService.storeFiles(OWNER_TYPE, saved.getId(), "VIDEO", videoFiles);

        return toResponse(saved);
    }

    private void normalize(SkillServiceListing service) {
        if (service.getType() == null || service.getType().isBlank()) {
            service.setType("Assignment");
        }
        if (service.getBranch() == null || service.getBranch().isBlank()) {
            service.setBranch("All Branches");
        }
        if (service.getSemester() == null || service.getSemester().isBlank()) {
            service.setSemester("All");
        }
        if (service.getPrice() == null || service.getPrice() < 0) {
            service.setPrice(0.0);
        }
    }

    private Map<String, Object> toResponse(SkillServiceListing service) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", service.getId());
        payload.put("title", service.getTitle());
        payload.put("type", service.getType());
        payload.put("description", service.getDescription());
        payload.put("price", service.getPrice());
        payload.put("branch", service.getBranch());
        payload.put("semester", service.getSemester());
        payload.put("createdAt", service.getCreatedAt());

        List<Map<String, Object>> mediaItems = mediaAssetService.toResponsePayload(OWNER_TYPE, service.getId());
        payload.put("media", mediaItems);

        String imageUrl = mediaItems.stream()
                .filter(item -> "IMAGE".equals(item.get("mediaType")))
                .map(item -> String.valueOf(item.get("url")))
                .findFirst()
                .orElse(null);

        String videoUrl = mediaItems.stream()
                .filter(item -> "VIDEO".equals(item.get("mediaType")))
                .map(item -> String.valueOf(item.get("url")))
                .findFirst()
                .orElse(null);

        payload.put("imageUrl", imageUrl);
        payload.put("videoUrl", videoUrl);

        return payload;
    }
}
