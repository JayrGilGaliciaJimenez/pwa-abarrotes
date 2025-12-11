package mtzg.carlos.server.modules.stores;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import mtzg.carlos.server.modules.users.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface IStoreRepository extends JpaRepository<StoreModel, Long> {

    Optional<StoreModel> findByUuid(UUID uuid);

    Optional<StoreModel> findByNameIgnoreCase(String name);

    @Query("SELECT s FROM StoreModel s LEFT JOIN FETCH s.products")
    List<StoreModel> findAllWithProducts();

    List<StoreModel> findByUsers(Set<UserModel> users);
}
