package mtzg.carlos.server.modules.stores;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.stores.dto.StoreResponseDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class StoreService {

    private final IStoreRepository storeRepository;

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
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "Stores retrieved successfully", storesDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving stores.");
        }
    }
}
