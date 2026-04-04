package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.AssignmentHelpRequest;
import com.mycollegemart.backend.repository.AssignmentHelpRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AssignmentHelpService {

    private static final String OWNER_TYPE = "ASSIGNMENT_HELP_REQUEST";

    private final AssignmentHelpRequestRepository assignmentHelpRequestRepository;
    private final MediaAssetService mediaAssetService;

    @Autowired
    public AssignmentHelpService(
            AssignmentHelpRequestRepository assignmentHelpRequestRepository,
            MediaAssetService mediaAssetService) {
        this.assignmentHelpRequestRepository = assignmentHelpRequestRepository;
        this.mediaAssetService = mediaAssetService;
    }

    public Map<String, Object> createRequest(AssignmentHelpRequest request, List<MultipartFile> files) {
        normalize(request);
        AssignmentHelpRequest saved = assignmentHelpRequestRepository.save(request);

        if (files != null && !files.isEmpty()) {
            int order = 0;
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                mediaAssetService.storeSingle(OWNER_TYPE, saved.getId(), detectMediaType(file.getContentType()), file,
                        order);
                order += 1;
            }
        }

        return toResponse(saved);
    }

    public List<Map<String, Object>> getRequests() {
        return assignmentHelpRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toResponse)
                .toList();
    }

    private void normalize(AssignmentHelpRequest request) {
        if (request.getServiceType() == null || request.getServiceType().isBlank()) {
            request.setServiceType("Assignment");
        }
        if (request.getBranch() == null || request.getBranch().isBlank()) {
            request.setBranch("All Branches");
        }
        if (request.getSemester() == null || request.getSemester().isBlank()) {
            request.setSemester("1");
        }
        if (request.getDeadline() == null || request.getDeadline().isBlank()) {
            request.setDeadline("Standard");
        }
        if (request.getTotalAmount() == null || request.getTotalAmount() < 0) {
            request.setTotalAmount(0.0);
        }
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            request.setStatus("SUBMITTED");
        }
    }

    private String detectMediaType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "DOCUMENT";
        }
        if (contentType.startsWith("image/")) {
            return "IMAGE";
        }
        if (contentType.startsWith("video/")) {
            return "VIDEO";
        }
        return "DOCUMENT";
    }

    private Map<String, Object> toResponse(AssignmentHelpRequest request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", request.getId());
        payload.put("skillServiceId", request.getSkillServiceId());
        payload.put("serviceType", request.getServiceType());
        payload.put("subject", request.getSubject());
        payload.put("topic", request.getTopic());
        payload.put("description", request.getDescription());
        payload.put("branch", request.getBranch());
        payload.put("semester", request.getSemester());
        payload.put("deadline", request.getDeadline());
        payload.put("totalAmount", request.getTotalAmount());
        payload.put("status", request.getStatus());
        payload.put("createdAt", request.getCreatedAt());
        payload.put("media", mediaAssetService.toResponsePayload(OWNER_TYPE, request.getId()));
        return payload;
    }
}
