package mtzg.carlos.server.modules.products;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IProductRepository extends JpaRepository<ProductModel, Long> {

    Optional<ProductModel> findByUuid(UUID uuid);
}
