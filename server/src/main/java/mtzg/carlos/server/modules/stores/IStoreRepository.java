package mtzg.carlos.server.modules.stores;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IStoreRepository extends JpaRepository<StoreModel, Long> {

    Optional<StoreModel> findByUuid(UUID uuid);

    Optional<StoreModel> findByNameIgnoreCase(String name);
}
