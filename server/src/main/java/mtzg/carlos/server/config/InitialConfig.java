package mtzg.carlos.server.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.users.Role;
import mtzg.carlos.server.modules.users.UserModel;
import mtzg.carlos.server.modules.users.IUserRepository;

@Configuration
@RequiredArgsConstructor
public class InitialConfig {

    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner initUsers(IUserRepository userRepository) {
        return args -> {

            if (userRepository.count() == 0) {

                UserModel admin = UserModel.builder()
                        .name("Administrador")
                        .email("admin@example.com")
                        .password(passwordEncoder.encode("admin123"))
                        .role(Role.ADMIN)
                        .build();

                UserModel user = UserModel.builder()
                        .name("Usuario Normal")
                        .email("user@example.com")
                        .password(passwordEncoder.encode("user123"))
                        .role(Role.USER)
                        .build();

                userRepository.save(admin);
                userRepository.save(user);

                System.out.println("Usuarios iniciales creados: admin y user");
            }
        };
    }
}
