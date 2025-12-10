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
import mtzg.carlos.server.modules.users.dto.UserUpdateDto;
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

    @Transactional
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

        var jwtToken = jwtService.generateToken(user, user.getUuid());
        return Utilities.authResponse(HttpStatus.OK, "User registered successfully", jwtToken);
    }

    @Transactional
    public ResponseEntity<Object> deleteUser(UUID userUuid) {
        try {
            Optional<UserModel> userOpt = userRepository.findByUuid(userUuid);
            if (userOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "User not found");
            }
            UserModel user = userOpt.get();

            if ((user.getStores() != null && !user.getStores().isEmpty()) ||
                    (user.getVisits() != null && !user.getVisits().isEmpty())) {
                return Utilities.simpleResponse(HttpStatus.BAD_REQUEST,
                        "Cannot delete user associated with stores or visits");
            }

            userRepository.delete(user);
            return Utilities.simpleResponse(HttpStatus.OK, "User deleted successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while deleting the user: " + e.getMessage());
        }
    }

    @Transactional
    public ResponseEntity<Object> updateUser(UUID userUuid, UserUpdateDto dto) {
        try {
            Optional<UserModel> userOpt = userRepository.findByUuid(userUuid);
            if (userOpt.isEmpty()) {
                return Utilities.simpleResponse(HttpStatus.NOT_FOUND, "User not found");
            }
            UserModel user = userOpt.get();

            if (dto.getName() != null && !dto.getName().isBlank()) {
                user.setName(dto.getName());
            }

            if (dto.getRole() != null) {
                user.setRole(dto.getRole());
            }
            userRepository.save(user);
            return Utilities.simpleResponse(HttpStatus.OK, "User updated successfully");
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while updating the user: " + e.getMessage());
        }
    }
}
