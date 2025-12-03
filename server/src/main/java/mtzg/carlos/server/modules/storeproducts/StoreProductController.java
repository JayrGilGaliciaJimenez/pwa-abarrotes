package mtzg.carlos.server.modules.storeproducts;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.storeproducts.dto.AssignProductsToStoreRequestDto;

@RestController
@RequestMapping("/api/v1/store-products")
@RequiredArgsConstructor
public class StoreProductController {

    private final StoreProductsService storeProductsService;

    @PostMapping("/assign")
    public ResponseEntity<Object> assignProductsToStore(@RequestBody @Valid AssignProductsToStoreRequestDto request) {
        return storeProductsService.assignProductsToStore(request);
    }
}
