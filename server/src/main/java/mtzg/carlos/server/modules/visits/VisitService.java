package mtzg.carlos.server.modules.visits;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.orders.OrderModel;
import mtzg.carlos.server.modules.orders.dto.OrderRegisterDto;
import mtzg.carlos.server.modules.orders.dto.OrderResponseDto;
import mtzg.carlos.server.modules.products.IProductRepository;
import mtzg.carlos.server.modules.products.ProductModel;
import mtzg.carlos.server.modules.stores.IStoreRepository;
import mtzg.carlos.server.modules.stores.StoreModel;
import mtzg.carlos.server.modules.users.IUserRepository;
import mtzg.carlos.server.modules.users.UserModel;
import mtzg.carlos.server.modules.visits.dto.VisitResponseDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final IVisitRepository visitRepository;
    private final IUserRepository userRepository;
    private final IStoreRepository storeRepository;
    private final IProductRepository productRepository;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllVisits() {
        try {
            List<VisitModel> visits = visitRepository.findAllWithOrders();
            List<VisitResponseDto> visitsDto = visits.stream()
                    .map(visit -> VisitResponseDto.builder()
                            .uuid(visit.getUuid())
                            .userName(visit.getUser().getName())
                            .storeName(visit.getStore().getName())
                            .visitDate(visit.getDate())
                            .validation(visit.isValidation())
                            .photo(visit.getPhoto())
                            .orders(
                                    visit.getOrders() == null ? List.of()
                                            : visit.getOrders().stream()
                                                    .map(order -> OrderResponseDto.builder()
                                                            .productName(order.getProduct().getName())
                                                            .quantity(order.getQuantity())
                                                            .unitPrice(order.getUnitPrice())
                                                            .total(order.getTotal())
                                                            .build())
                                                    .toList())
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "Visits retrieved successfully", visitsDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving visits.");
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getVisitByUuid(UUID uuid) {
        try {
            Optional<VisitModel> visitOpt = visitRepository.findByUuid(uuid);
            if (visitOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Visit not found");
            }
            VisitModel visit = visitOpt.get();

            VisitResponseDto visitDto = VisitResponseDto.builder()
                    .uuid(visit.getUuid())
                    .userName(visit.getUser().getName())
                    .storeName(visit.getStore().getName())
                    .visitDate(visit.getDate())
                    .validation(visit.isValidation())
                    .photo(visit.getPhoto())
                    .orders(
                            visit.getOrders() == null ? List.of()
                                    : visit.getOrders().stream()
                                            .map(order -> OrderResponseDto.builder()
                                                    .productName(order.getProduct().getName())
                                                    .quantity(order.getQuantity())
                                                    .unitPrice(order.getUnitPrice())
                                                    .total(order.getTotal())
                                                    .build())
                                            .toList())
                    .build();
            return Utilities.generateResponse(HttpStatus.OK, "Visit retrieved successfully", visitDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving the visit.");
        }
    }

    @Transactional
    public ResponseEntity<Object> registerVisit(UUID userUuid, UUID storeUuid, boolean validation, String ordersJson,
            MultipartFile photo) {
        try {
            Optional<UserModel> userOpt = userRepository.findByUuid(userUuid);
            if (userOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "User not found");
            }

            Optional<StoreModel> storeOpt = storeRepository.findByUuid(storeUuid);
            if (storeOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Store not found");
            }

            if (!userHasStoreInRoute(userOpt.get(), storeUuid)) {
                return Utilities.simpleResponse(HttpStatus.FORBIDDEN, "User does not have access to this store");
            }

            String photoPath = saveVisitPhoto(userOpt.get().getName(), storeOpt.get().getName(), photo, "uploads");

            VisitModel visit = VisitModel.builder()
                    .uuid(UUID.randomUUID())
                    .date(LocalDate.now())
                    .photo(photoPath)
                    .validation(validation)
                    .user(userOpt.get())
                    .store(storeOpt.get())
                    .build();

            ObjectMapper mapper = new ObjectMapper();
            List<OrderRegisterDto> orderDtos = mapper.readValue(ordersJson,
                    new TypeReference<List<OrderRegisterDto>>() {
                    });

            if (orderDtos != null && !orderDtos.isEmpty()) {
                List<OrderModel> orders = orderDtos.stream()
                        .map(orderDto -> {
                            Optional<ProductModel> productOpt = productRepository.findByUuid(orderDto.getProductUuid());
                            if (productOpt.isEmpty()) {
                                return null;
                            }
                            return OrderModel.builder()
                                    .uuid(UUID.randomUUID())
                                    .quantity(orderDto.getQuantity())
                                    .unitPrice(productOpt.get().getBasePrice())
                                    .total(orderDto.getQuantity() * productOpt.get().getBasePrice())
                                    .product(productOpt.get())
                                    .visit(visit)
                                    .build();
                        })
                        .filter(order -> order != null)
                        .toList();
                visit.setOrders(new HashSet<>(orders));
            }

            visitRepository.save(visit);
            return Utilities.simpleResponse(HttpStatus.CREATED, "Visit registered successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while registering the visit." + e.getMessage());
        }
    }

    @Transactional
    public ResponseEntity<Object> deleteVisit(UUID visitUuid) {
        try {
            Optional<VisitModel> visitOpt = visitRepository.findByUuid(visitUuid);
            if (visitOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Visit not found");
            }

            visitRepository.delete(visitOpt.get());
            return Utilities.simpleResponse(HttpStatus.OK, "Visit deleted successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while deleting the visit." + e.getMessage());
        }
    }

    private String saveVisitPhoto(String userName, String storeName, MultipartFile photo, String baseDir)
            throws Exception {
        String rootPath = System.getProperty("user.dir");
        String folder = rootPath + "/" + baseDir + "/";
        Path uploadPath = Paths.get(folder);

        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String cleanStoreName = sanitizeName(storeName);
        String cleanUserName = sanitizeName(userName);

        String filename = "store_" + cleanStoreName + "_" + cleanUserName + "_" + System.currentTimeMillis() + "_"
                + photo.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);
        photo.transferTo(filePath.toFile());

        return filePath.toString();
    }

    private String sanitizeName(String name) {
        if (name == null)
            return "";
        return name.trim().replaceAll("\\s+", "_");
    }

    private boolean userHasStoreInRoute(UserModel user, UUID storeUuid) {
        if (user.getStores() == null)
            return false;
        return user.getStores().stream().anyMatch(store -> store.getUuid().equals(storeUuid));
    }
}
