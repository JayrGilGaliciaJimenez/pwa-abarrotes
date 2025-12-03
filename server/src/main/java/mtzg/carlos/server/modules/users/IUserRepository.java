package mtzg.carlos.server.modules.users;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IUserRepository extends JpaRepository<UserModel, Long> {

    Optional<UserModel> findByEmail(String email);

    Optional<UserModel> findByUuid(UUID uuid);

    @Query("SELECT u FROM UserModel u LEFT JOIN FETCH u.stores")
    List<UserModel> findAllWithStores();
}
