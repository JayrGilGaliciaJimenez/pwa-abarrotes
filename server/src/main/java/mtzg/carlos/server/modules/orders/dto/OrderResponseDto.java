package mtzg.carlos.server.modules.orders.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class OrderResponseDto {

    private String productName;
    private Integer quantity;
    private Double unitPrice;
    private Double total;

}
