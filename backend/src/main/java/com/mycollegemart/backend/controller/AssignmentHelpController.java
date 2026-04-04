package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.AssignmentHelpRequest;
import com.mycollegemart.backend.service.AssignmentHelpService;
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
@RequestMapping("/api/assignment-help")
public class AssignmentHelpController {

    private final AssignmentHelpService assignmentHelpService;

    @Autowired
    public AssignmentHelpController(AssignmentHelpService assignmentHelpService) {
        this.assignmentHelpService = assignmentHelpService;
    }

    @PostMapping(value = "/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitRequest(
            @RequestParam(value = "skillServiceId", required = false) Long skillServiceId,
            @RequestParam("serviceType") String serviceType,
            @RequestParam("subject") String subject,
            @RequestParam("topic") String topic,
            @RequestParam("description") String description,
            @RequestParam("branch") String branch,
            @RequestParam("semester") String semester,
            @RequestParam("deadline") String deadline,
            @RequestParam("totalAmount") Double totalAmount,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {

        AssignmentHelpRequest request = new AssignmentHelpRequest();
        request.setSkillServiceId(skillServiceId);
        request.setServiceType(serviceType);
        request.setSubject(subject);
        request.setTopic(topic);
        request.setDescription(description);
        request.setBranch(branch);
        request.setSemester(semester);
        request.setDeadline(deadline);
        request.setTotalAmount(totalAmount);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(assignmentHelpService.createRequest(request, files));
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getRequests() {
        return ResponseEntity.ok(assignmentHelpService.getRequests());
    }
}
