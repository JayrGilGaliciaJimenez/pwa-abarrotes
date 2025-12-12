package mtzg.carlos.server.modules.stores;

import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
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
import mtzg.carlos.server.modules.stores.dto.StoreRegisterDto;
import mtzg.carlos.server.modules.stores.dto.StoreUpdateDto;

@RestController
@RequestMapping("/api/v1/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    @GetMapping("")
    public ResponseEntity<Object> findAllStores() {
        return storeService.getAllStores();
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<Object> findStoreByUuid(@PathVariable("uuid") UUID uuid) {
        return storeService.getStoreByUuid(uuid);
    }

    @PostMapping("")
    public ResponseEntity<Object> registerStore(@RequestBody @Valid StoreRegisterDto dto) {
        return storeService.registerStore(dto);
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<Object> updateStore(@PathVariable("uuid") UUID uuid, @RequestBody @Valid StoreUpdateDto dto) {
        return storeService.updateStore(uuid, dto);
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Object> deleteStore(@PathVariable("uuid") UUID uuid) {
        return storeService.deleteStore(uuid);
    }

    @GetMapping("/delivery-man/{uuid}")
    public ResponseEntity<Object> findByDeliveryMan(@PathVariable("uuid") UUID uuid){
        return storeService.findByDeliveryMan(uuid);
    }

    @GetMapping(value = "/{uuid}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> getStoreQr(@PathVariable("uuid") UUID uuid) {
        return storeService.getStoreQr(uuid);
    }
}
