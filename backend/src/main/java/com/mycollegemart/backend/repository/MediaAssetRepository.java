package com.mycollegemart.backend.repository;

import com.mycollegemart.backend.model.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {
    List<MediaAsset> findByOwnerTypeAndOwnerIdOrderByDisplayOrderAscIdAsc(String ownerType, Long ownerId);

    List<MediaAsset> findByOwnerTypeAndOwnerIdAndMediaTypeOrderByDisplayOrderAscIdAsc(String ownerType, Long ownerId,
            String mediaType);

    void deleteByOwnerTypeAndOwnerIdAndMediaType(String ownerType, Long ownerId, String mediaType);
}
