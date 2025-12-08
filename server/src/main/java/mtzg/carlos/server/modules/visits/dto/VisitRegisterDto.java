package mtzg.carlos.server.modules.visits.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mtzg.carlos.server.modules.orders.dto.OrderRegisterDto;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VisitRegisterDto {

    @NotNull(message = "User UUID cannot be null")
    private UUID userUuid;

    @NotNull(message = "Store UUID cannot be null")
    private UUID storeUuid;

    @NotNull(message = "Photo cannot be null")
    private String photo;

    @NotNull(message = "Validation cannot be null")
    private boolean validation;

    @NotNull(message = "Orders cannot be null")
    private List<OrderRegisterDto> orders;

    public void setPhoto(String photo) {
        this.photo = photo != null ? photo.trim() : null;
    }

}
