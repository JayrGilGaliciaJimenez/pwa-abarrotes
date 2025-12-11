package mtzg.carlos.server.modules.products;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.products.dto.ProductRegisterDto;
import mtzg.carlos.server.modules.products.dto.ProductUpdateDto;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping("")
    public ResponseEntity<Object> findAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<Object> findProductByUuid(@PathVariable("uuid") UUID uuid) {
        return productService.getProductByUuid(uuid);
    }

    @PostMapping("")
    public ResponseEntity<Object> registerProduct(@RequestBody @Valid ProductRegisterDto request) {
        return productService.registerProduct(request);
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<Object> updateProduct(@PathVariable("uuid") UUID uuid,
            @RequestBody @Valid ProductUpdateDto dto) {
        return productService.updateProduct(uuid, dto);
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Object> deleteProduct(@PathVariable("uuid") UUID uuid) {
        return productService.deleteProduct(uuid);
    }

    @GetMapping("/findByStore/{uuid}")
    public ResponseEntity<Object> findProductByStore(@PathVariable("uuid") UUID uuid){
        return productService.findProductByStore(uuid);
    }

}