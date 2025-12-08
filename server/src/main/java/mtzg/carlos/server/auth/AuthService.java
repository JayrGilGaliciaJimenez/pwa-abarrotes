package mtzg.carlos.server.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.jwt.JwtService;
import mtzg.carlos.server.modules.users.IUserRepository;

import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final IUserRepository userRepository;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;

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
