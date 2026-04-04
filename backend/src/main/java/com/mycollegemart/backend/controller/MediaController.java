package com.mycollegemart.backend.controller;

import com.mycollegemart.backend.model.MediaAsset;
import com.mycollegemart.backend.service.MediaAssetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Optional;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaAssetService mediaAssetService;

    @Autowired
    public MediaController(MediaAssetService mediaAssetService) {
        this.mediaAssetService = mediaAssetService;
    }

    @GetMapping("/{mediaId}")
    public ResponseEntity<?> getMediaById(@PathVariable Long mediaId) {
        Optional<MediaAsset> mediaOptional = mediaAssetService.findById(mediaId);
        if (mediaOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        MediaAsset mediaAsset = mediaOptional.get();
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(
                    mediaAsset.getContentType() == null || mediaAsset.getContentType().isBlank()
                            ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                            : mediaAsset.getContentType());
        } catch (Exception ignored) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setCacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic().getHeaderValue());
        headers.setContentLength(mediaAsset.getData().length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(mediaAsset.getData());
    }
}
