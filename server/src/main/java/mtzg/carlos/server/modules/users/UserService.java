package mtzg.carlos.server.modules.users;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.jwt.JwtService;
import mtzg.carlos.server.modules.stores.dto.StoreResponseDto;
import mtzg.carlos.server.modules.users.dto.UserRegisterDto;
import mtzg.carlos.server.modules.users.dto.UserResponseDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class UserService {

    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllUsers() {
        try {
            List<UserModel> users = userRepository.findAllWithStores();
            List<UserResponseDto> usersDto = users.stream()
                    .map(user -> UserResponseDto.builder()
                            .uuid(user.getUuid())
                            .name(user.getName())
                            .email(user.getEmail())
                            .stores(
                                    user.getStores().stream()
                                            .map(store -> StoreResponseDto
                                                    .builder()
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

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getDeliveryUsers() {
        try {
            List<UserModel> users = userRepository.findAllWithStores();
            List<UserResponseDto> deliveryUsersDto = users.stream()
                    .filter(user -> user.getRole() == Role.USER)
                    .map(user -> UserResponseDto.builder()
                            .uuid(user.getUuid())
                            .name(user.getName())
                            .email(user.getEmail())
                            .stores(
                                    user.getStores().stream()
                                            .map(store -> StoreResponseDto
                                                    .builder()
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
            return Utilities.generateResponse(HttpStatus.OK, "Delivery users retrieved successfully", deliveryUsersDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving delivery users: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAdminUsers() {
        try {
            List<UserModel> users = userRepository.findAllWithStores();
            List<UserResponseDto> adminUsersDto = users.stream()
                    .filter(user -> user.getRole() == Role.ADMIN)
                    .map(user -> UserResponseDto.builder()
                            .uuid(user.getUuid())
                            .name(user.getName())
                            .email(user.getEmail())
                            .stores(
                                    user.getStores().stream()
                                            .map(store -> StoreResponseDto
                                                    .builder()
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
            return Utilities.generateResponse(HttpStatus.OK, "Admin users retrieved successfully", adminUsersDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving admin users: " + e.getMessage());
        }
    }

    public ResponseEntity<Object> register(UserRegisterDto request) {
        Optional<UserModel> existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent()) {
            return Utilities.simpleResponse(HttpStatus.CONFLICT, "Unable to complete registration");
        }
        var user = UserModel.builder()
                .uuid(UUID.randomUUID())
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();
        userRepository.save(user);
        var jwtToken = jwtService.generateToken(user);
        return Utilities.authResponse(HttpStatus.OK, "User registered successfully", jwtToken);
    }

}
