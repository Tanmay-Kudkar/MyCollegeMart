package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.SkillServiceListing;
import com.mycollegemart.backend.service.SkillServiceManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
public class SkillServiceController {

    private final SkillServiceManager skillServiceManager;

    @Autowired
    public SkillServiceController(SkillServiceManager skillServiceManager) {
        this.skillServiceManager = skillServiceManager;
    }

    @GetMapping
    public ResponseEntity<?> getAllServices() {
        return ResponseEntity.ok(skillServiceManager.getAllServices());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createService(
            @RequestParam("title") String title,
            @RequestParam("type") String type,
            @RequestParam("description") String description,
            @RequestParam("price") Double price,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestPart(value = "images", required = false) List<MultipartFile> imageFiles,
            @RequestPart(value = "videos", required = false) List<MultipartFile> videoFiles) {

        SkillServiceListing listing = new SkillServiceListing();
        listing.setTitle(title);
        listing.setType(type);
        listing.setDescription(description);
        listing.setPrice(price);
        listing.setBranch(branch);
        listing.setSemester(semester);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(skillServiceManager.createService(listing, imageFiles, videoFiles));
    }
}
