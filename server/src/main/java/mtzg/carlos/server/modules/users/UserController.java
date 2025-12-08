package mtzg.carlos.server.modules.users;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.users.dto.UserRegisterDto;

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

}
