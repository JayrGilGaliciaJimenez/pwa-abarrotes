package mtzg.carlos.server.modules.users;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.stores.dto.StoreResponseDto;
import mtzg.carlos.server.modules.users.dto.UserResponseDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class UserService {

    private final IUserRepository userRepository;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllUsers() {
        try {
            List<UserModel> users = userRepository.findAll();
            List<UserResponseDto> usersDto = users.stream()
                    .map(user -> UserResponseDto.builder()
                            .uuid(user.getUuid())
                            .name(user.getName())
                            .email(user.getEmail())
                            .stores(
                                    user.getStores().stream()
                                            .map(store -> StoreResponseDto.builder()
                                                    .uuid(store.getUuid())
                                                    .name(store.getName())
                                                    .address(store.getAddress())
                                                    .latitude(store.getLatitude())
                                                    .longitude(store.getLongitude())
                                                    .qrCode(store.getQrCode())
                                                    .build())
                                            .toList())
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "Users retrieved successfully", usersDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving users.");
        }
    }

}
