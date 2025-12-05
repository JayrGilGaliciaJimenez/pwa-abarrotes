package mtzg.carlos.server.modules.visits;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

@Repository
public interface IVisitRepository extends JpaRepository<VisitModel, Long> {

    @Query("SELECT v FROM VisitModel v LEFT JOIN FETCH v.orders")
    List<VisitModel> findAllWithOrders();

}
