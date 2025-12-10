package mtzg.carlos.server.modules.users;

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
import mtzg.carlos.server.modules.users.dto.UserRegisterDto;
import mtzg.carlos.server.modules.users.dto.UserUpdateDto;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("")
    public ResponseEntity<Object> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/delivery")
    public ResponseEntity<Object> getDeliveryUsers() {
        return userService.getDeliveryUsers();
    }

    @GetMapping("/admin")
    public ResponseEntity<Object> getAdminUsers() {
        return userService.getAdminUsers();
    }

    @PostMapping("")
    public ResponseEntity<Object> register(@RequestBody @Valid UserRegisterDto request) {
        return userService.register(request);
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Object> deleteUser(@PathVariable("uuid") UUID uuid) {
        return userService.deleteUser(uuid);
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<Object> updateUser(@PathVariable("uuid") UUID uuid, @RequestBody @Valid UserUpdateDto dto) {
        return userService.updateUser(uuid, dto);
    }
}
