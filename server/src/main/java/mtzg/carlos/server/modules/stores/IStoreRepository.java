package mtzg.carlos.server.modules.stores;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import mtzg.carlos.server.modules.products.ProductModel;

@Repository
public interface IStoreRepository extends JpaRepository<StoreModel, Long> {

    Optional<ProductModel> findByUuid(UUID uuid);

    Optional<StoreModel> findByNameIgnoreCase(String name);
}
