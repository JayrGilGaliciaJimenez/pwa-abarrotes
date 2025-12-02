package mtzg.carlos.server.modules.stores;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.stores.dto.StoreRegisterDto;
import mtzg.carlos.server.modules.stores.dto.StoreResponseDto;
import mtzg.carlos.server.utils.QrUtils;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final IStoreRepository storeRepository;

    @Value("${qr.content.path}")
    private String qrContentPath;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllStores() {
        try {
            List<StoreModel> stores = storeRepository.findAll();
            List<StoreResponseDto> storesDto = stores.stream()
                    .map(store -> StoreResponseDto.builder()
                            .uuid(store.getUuid())
                            .name(store.getName())
                            .address(store.getAddress())
                            .latitude(store.getLatitude())
                            .longitude(store.getLongitude())
                            .qrCode(store.getQrCode())
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "Stores retrieved successfully", storesDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving stores.");
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getStoreByUuid(UUID uuid) {
        try {
            Optional<StoreModel> storeOpt = storeRepository.findByUuid(uuid);
            if (storeOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Store not found");
            }
            StoreModel store = storeOpt.get();
            StoreResponseDto storeDto = StoreResponseDto.builder()
                    .uuid(store.getUuid())
                    .name(store.getName())
                    .address(store.getAddress())
                    .latitude(store.getLatitude())
                    .longitude(store.getLongitude())
                    .qrCode(store.getQrCode())
                    .build();
            return Utilities.generateResponse(HttpStatus.OK, "Store retrieved successfully", storeDto);

        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while fetching the store.");
        }
    }

    @Transactional
    public ResponseEntity<Object> registerStore(StoreRegisterDto dto) {
        try {
            if (storeRepository.findByNameIgnoreCase(dto.getName()).isPresent()) {
                return Utilities.simpleResponse(HttpStatus.CONFLICT, "Store with this name already exists");
            }

            UUID uuid = UUID.randomUUID();
            String qrPath = generateQrForStore(uuid);

            StoreModel store = StoreModel.builder()
                    .uuid(uuid)
                    .name(dto.getName())
                    .address(dto.getAddress())
                    .latitude(dto.getLatitude())
                    .longitude(dto.getLongitude())
                    .qrCode(qrPath)
                    .build();

            storeRepository.save(store);
            return Utilities.simpleResponse(HttpStatus.CREATED, "Store registered successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while registering the store.");
        }
    }

    private String generateQrForStore(UUID uuid) {
        try {
            String qrContent = qrContentPath + uuid;
            String qrFileName = "store_" + uuid;
            return QrUtils.generateQrImage(qrContent, qrFileName);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code for store", e);
        }
    }
}
