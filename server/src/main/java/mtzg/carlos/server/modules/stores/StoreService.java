package mtzg.carlos.server.modules.stores;

import java.util.*;

import mtzg.carlos.server.modules.users.IUserRepository;
import mtzg.carlos.server.modules.users.UserModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.products.dto.ProductResponseDto;
import mtzg.carlos.server.modules.stores.dto.StoreRegisterDto;
import mtzg.carlos.server.modules.stores.dto.StoreResponseDto;
import mtzg.carlos.server.modules.stores.dto.StoreUpdateDto;
import mtzg.carlos.server.utils.QrUtils;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final IStoreRepository storeRepository;
    private final IUserRepository userRepository;

    @Value("${qr.content.path}")
    private String qrContentPath;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllStores() {
        try {
            List<StoreModel> stores = storeRepository.findAllWithProducts();
            List<StoreResponseDto> storesDto = stores.stream()
                    .map(store -> StoreResponseDto.builder()
                            .uuid(store.getUuid())
                            .name(store.getName())
                            .address(store.getAddress())
                            .latitude(store.getLatitude())
                            .longitude(store.getLongitude())
                            .qrCode(store.getQrCode())
                            .products(
                                    store.getProducts() == null ? List.of()
                                            : store.getProducts().stream()
                                                    .map(product -> ProductResponseDto.builder()
                                                            .uuid(product.getUuid())
                                                            .name(product.getName())
                                                            .description(product.getDescription())
                                                            .basePrice(product.getBasePrice())
                                                            .build())
                                                    .toList())
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
                    .products(
                            store.getProducts() == null ? List.of()
                                    : store.getProducts().stream()
                                            .map(product -> ProductResponseDto.builder()
                                                    .uuid(product.getUuid())
                                                    .name(product.getName())
                                                    .description(product.getDescription())
                                                    .basePrice(product.getBasePrice())
                                                    .build())
                                            .toList())
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
            StoreModel store = StoreModel.builder()
                    .uuid(uuid)
                    .name(dto.getName())
                    .address(dto.getAddress())
                    .latitude(dto.getLatitude())
                    .longitude(dto.getLongitude())
                    .build();

            storeRepository.save(store);

            String qrPath = generateQrForStore(store.getUuid());
            store.setQrCode(qrPath);
            storeRepository.save(store);

            return Utilities.simpleResponse(HttpStatus.CREATED, "Store registered successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while registering the store: " + e.getMessage());
        }
    }

    @Transactional
    public ResponseEntity<Object> updateStore(UUID uuid, StoreUpdateDto dto) {
        try {
            Optional<StoreModel> storeOpt = storeRepository.findByUuid(uuid);
            if (storeOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Store not found");
            }
            StoreModel store = storeOpt.get();
            if (dto.getName() != null && !dto.getName().isBlank()) {
                Optional<StoreModel> existingStoreOpt = storeRepository.findByNameIgnoreCase(dto.getName());
                if (existingStoreOpt.isPresent() && !existingStoreOpt.get().getUuid().equals(uuid)) {
                    return Utilities.simpleResponse(HttpStatus.CONFLICT,
                            "Another store with this name already exists");
                }
                store.setName(dto.getName());
            }
            if (dto.getAddress() != null && !dto.getAddress().isBlank()) {
                store.setAddress(dto.getAddress());
            }
            if (dto.getLatitude() != null) {
                store.setLatitude(dto.getLatitude());
            }
            if (dto.getLongitude() != null) {
                store.setLongitude(dto.getLongitude());
            }
            storeRepository.save(store);
            return Utilities.simpleResponse(HttpStatus.OK, "Store updated successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while updating the store.");
        }
    }

    @Transactional
    public ResponseEntity<Object> deleteStore(UUID uuid) {
        try {
            Optional<StoreModel> storeOpt = storeRepository.findByUuid(uuid);
            if (storeOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Store not found");
            }
            StoreModel store = storeOpt.get();

            if ((store.getVisits() != null && !store.getVisits().isEmpty()) ||
                    (store.getProducts() != null && !store.getProducts().isEmpty()) ||
                    (store.getUsers() != null && !store.getUsers().isEmpty())) {
                return Utilities.simpleResponse(HttpStatus.CONFLICT,
                        "Store cannot be deleted as it has associated data.");
            }
            storeRepository.delete(store);
            return Utilities.simpleResponse(HttpStatus.OK, "Store deleted successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while deleting the store.");
        }
    }

    public ResponseEntity<Object> findByDeliveryMan(UUID uuid) {
        try {
            Optional<UserModel> user = userRepository.findByUuid(uuid);
            if (user.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "cant find the user with the uuid: " + uuid);
            }

            Set<UserModel> userModels = new HashSet<>();
            userModels.add(user.get());

            List<StoreModel> stores = storeRepository.findByUsers(userModels);
            List<StoreResponseDto> response = stores.stream()
                    .map(store -> StoreResponseDto.builder()
                            .uuid(store.getUuid())
                            .name(store.getName())
                            .address(store.getAddress())
                            .latitude(store.getLatitude())
                            .longitude(store.getLongitude())
                            .qrCode(store.getQrCode())
                            .products(
                                    store.getProducts().stream()
                                            .map(p -> ProductResponseDto.builder()
                                                    .uuid(p.getUuid())
                                                    .name(p.getName())
                                                    .description(p.getDescription())
                                                    .basePrice(p.getBasePrice())
                                                    .build())
                                            .toList())
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "data fetched successfully", response);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while fetching stores for the user: " + e.getMessage());
        }
    }

    private String generateQrForStore(UUID uuid) {
        try {
            String qrContent = qrContentPath + uuid;
            String qrFileName = "store_" + uuid;
            return QrUtils.generateQrImage(qrContent, qrFileName, "qr");
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code for store", e);
        }
    }
}
