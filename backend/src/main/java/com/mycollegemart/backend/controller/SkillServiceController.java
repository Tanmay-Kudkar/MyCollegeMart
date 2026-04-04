package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.SkillServiceListing;
import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.service.SkillServiceManager;
import com.mycollegemart.backend.service.UserService;
import com.mycollegemart.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skills")
public class SkillServiceController {

    private final SkillServiceManager skillServiceManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Autowired
    public SkillServiceController(SkillServiceManager skillServiceManager, JwtUtil jwtUtil, UserService userService) {
        this.skillServiceManager = skillServiceManager;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getAllServices() {
        return ResponseEntity.ok(skillServiceManager.getAllServices());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createService(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam("title") String title,
            @RequestParam("type") String type,
            @RequestParam("description") String description,
            @RequestParam("price") Double price,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestPart(value = "images", required = false) List<MultipartFile> imageFiles,
            @RequestPart(value = "videos", required = false) List<MultipartFile> videoFiles) {
        User privilegedUser = resolvePrivilegedUser(authHeader);
        if (privilegedUser == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Master access is required to add services"));
        }

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

    private User resolvePrivilegedUser(String authHeader) {
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
        if (user == null || !userService.isMaster(user)) {
            return null;
        }

        return user;
    }
}
