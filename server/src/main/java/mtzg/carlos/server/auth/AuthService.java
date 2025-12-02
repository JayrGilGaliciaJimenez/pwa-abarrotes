package mtzg.carlos.server.auth;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.jwt.JwtService;
import mtzg.carlos.server.modules.users.IUserRepository;
import mtzg.carlos.server.modules.users.Role;
import mtzg.carlos.server.modules.users.UserModel;
import mtzg.carlos.server.modules.users.dto.UserRegisterDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final IUserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;

        public ResponseEntity<Object> register(UserRegisterDto request) {
                Optional<UserModel> existingUser = userRepository.findByEmail(request.getEmail());
                if (existingUser.isPresent()) {
                        return Utilities.simpleResponse(HttpStatus.CONFLICT, "Unable to complete registration");
                }
                var user = UserModel.builder()
                                .name(request.getName())
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(Role.USER)
                                .build();
                userRepository.save(user);
                var jwtToken = jwtService.generateToken(user);
                return Utilities.authResponse(HttpStatus.OK, "User registered successfully", jwtToken);
        }

        public ResponseEntity<Object> authenticate(AuthRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getEmail(),
                                                request.getPassword()));
                var user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "User not found with email: " + request.getEmail()));
                var jwtToken = jwtService.generateToken(user);
                return Utilities.authResponse(HttpStatus.OK, "User authenticated successfully", jwtToken);
        }

}
