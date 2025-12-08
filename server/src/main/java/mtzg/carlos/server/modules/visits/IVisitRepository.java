package mtzg.carlos.server.modules.visits;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

@Repository
public interface IVisitRepository extends JpaRepository<VisitModel, Long> {

    Optional<VisitModel> findByUuid(UUID uuid);

    @Query("SELECT v FROM VisitModel v LEFT JOIN FETCH v.orders")
    List<VisitModel> findAllWithOrders();

    @Query("SELECT v FROM VisitModel v LEFT JOIN FETCH v.orders WHERE v.uuid = :uuid")
    Optional<VisitModel> findByUuidWithOrders(@Param("uuid") UUID uuid);

}
