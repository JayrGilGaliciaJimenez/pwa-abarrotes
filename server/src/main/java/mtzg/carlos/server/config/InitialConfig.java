package mtzg.carlos.server.config;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
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

    @Value("${user.fullname}")
    private String userName;

    @Value("${user.password}")
    private String userPassword;

    @Value("${user.email}")
    private String userEmail;

    @Value("${admin.fullname}")
    private String adminName;

    @Value("${admin.password}")
    private String adminPassword;

    @Value("${admin.email}")
    private String adminEmail;

    @Bean
    CommandLineRunner initUsers(IUserRepository userRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                UserModel admin = UserModel.builder()
                        .uuid(UUID.randomUUID())
                        .name(adminName)
                        .email(adminEmail)
                        .password(passwordEncoder.encode(adminPassword))
                        .role(Role.ADMIN)
                        .build();

                UserModel user = UserModel.builder()
                        .uuid(UUID.randomUUID())
                        .name(userName)
                        .email(userEmail)
                        .password(passwordEncoder.encode(userPassword))
                        .role(Role.USER)
                        .build();

                userRepository.save(admin);
                userRepository.save(user);

                System.out.println("Usuarios iniciales creados: admin y user");
            }
        };
    }
}
