package mtzg.carlos.server.modules.products;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.products.dto.ProductResponseDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final IProductRepository productRepository;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllProducts() {
        try {
            List<ProductModel> products = productRepository.findAll();
            List<ProductResponseDto> productsDto = products.stream()
                    .map(product -> ProductResponseDto.builder()
                            .uuid(product.getUuid())
                            .name(product.getName())
                            .description(product.getDescription())
                            .basePrice(product.getBasePrice())
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "Products retrieved successfully", productsDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while fetching products.");
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getProductByUuid(UUID uuid) {
        try {
            Optional<ProductModel> productOpt = productRepository.findByUuid(uuid);
            if (!productOpt.isPresent()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Product not found");
            }
            ProductModel product = productOpt.get();
            ProductResponseDto productDto = ProductResponseDto.builder()
                    .uuid(product.getUuid())
                    .name(product.getName())
                    .description(product.getDescription())
                    .basePrice(product.getBasePrice())
                    .build();
            return Utilities.generateResponse(HttpStatus.OK, "Product retrieved successfully", productDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while fetching products.");
        }
    }
}
