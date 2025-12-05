package mtzg.carlos.server.modules.visits.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import mtzg.carlos.server.modules.orders.dto.OrderResponseDto;

@Getter
@Setter
@Builder
public class VisitResponseDto {

    private UUID uuid;
    private String userName;
    private String storeName;
    private LocalDate visitDate;
    private boolean validation;
    private String photo;
    private List<OrderResponseDto> orders;
}
