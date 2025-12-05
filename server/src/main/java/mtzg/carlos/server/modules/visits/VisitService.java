package mtzg.carlos.server.modules.visits;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import mtzg.carlos.server.modules.orders.dto.OrderResponseDto;
import mtzg.carlos.server.modules.visits.dto.VisitResponseDto;
import mtzg.carlos.server.utils.Utilities;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final IVisitRepository visitRepository;

    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllVisits() {
        try {
            List<VisitModel> visits = visitRepository.findAllWithOrders();
            List<VisitResponseDto> visitsDto = visits.stream()
                    .map(visit -> VisitResponseDto.builder()
                            .userName(visit.getUser().getName())
                            .storeName(visit.getStore().getName())
                            .visitDate(visit.getDate())
                            .validation(visit.isValidation())
                            .photo(visit.getPhoto())
                            .orders(
                                    visit.getOrders() == null ? List.of()
                                            : visit.getOrders().stream()
                                                    .map(order -> OrderResponseDto.builder()
                                                            .productName(order.getProduct().getName())
                                                            .quantity(order.getQuantity())
                                                            .unitPrice(order.getUnitPrice())
                                                            .total(order.getTotal())
                                                            .build())
                                                    .toList())
                            .build())
                    .toList();
            return Utilities.generateResponse(HttpStatus.OK, "Visits retrieved successfully", visitsDto);
        } catch (Exception e) {
            return Utilities.simpleResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                    "An error occurred while retrieving visits.");
        }
    }

}
