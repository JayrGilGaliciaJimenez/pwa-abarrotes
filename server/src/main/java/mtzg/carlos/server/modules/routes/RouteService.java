package mtzg.carlos.server.modules.routes;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.stores.IStoreRepository;
import mtzg.carlos.server.modules.stores.StoreModel;
import mtzg.carlos.server.modules.users.IUserRepository;
import mtzg.carlos.server.modules.users.UserModel;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final IStoreRepository storeRepository;
    private final IUserRepository userRepository;

    @Transactional
    public ResponseEntity<Object> assignStoreToUser(RouteRequestDto request) {
        try {
            Optional<UserModel> userOpt = userRepository.findByUuid(request.getUserUuid());
            if (userOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "User not found.");
            }
            UserModel user = userOpt.get();

            Optional<StoreModel> storeOpt = storeRepository.findByUuid(request.getStoreUuid());
            if (storeOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "Store not found.");
            }
            StoreModel store = storeOpt.get();

            if (user.getStores().contains(store)) {
                return Utilities.simpleResponse(HttpStatus.CONFLICT, "Store is already assigned to this user.");
            }
            user.getStores().add(store);
            userRepository.save(user);
            return Utilities.simpleResponse(HttpStatus.OK, "Store assigned to user successfully.");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while assigning the store to the user.");
        }
    }
}
