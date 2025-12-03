package mtzg.carlos.server.modules.storeproducts;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.products.IProductRepository;
import mtzg.carlos.server.modules.products.ProductModel;
import mtzg.carlos.server.modules.storeproducts.dto.AssignProductsToStoreRequestDto;
import mtzg.carlos.server.modules.stores.IStoreRepository;
import mtzg.carlos.server.modules.stores.StoreModel;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class StoreProductsService {

    private final IProductRepository productRepository;
    private final IStoreRepository storeRepository;

    @Transactional
    public ResponseEntity<Object> assignProductsToStore(AssignProductsToStoreRequestDto request) {
        try {
            Optional<StoreModel> storeOpt = storeRepository.findByUuid(request.getStoreUuid());
            if (storeOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Store not found.");
            }
            StoreModel store = storeOpt.get();

            Set<ProductModel> products = request.getProductUuids().stream()
                    .map(productRepository::findByUuid)
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toSet());

            if (products.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "No valid products found to assign.");
            }

            products.forEach(product -> {
                if (product.getStores() == null) {
                    product.setStores(new java.util.HashSet<>());
                }
                product.getStores().add(store);
            });
            productRepository.saveAll(products);
            return Utilities.simpleResponse(HttpStatus.OK, "Products assigned to store successfully.");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while assigning products to store.");
        }
    }
}
