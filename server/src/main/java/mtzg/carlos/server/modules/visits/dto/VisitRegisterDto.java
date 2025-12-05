package mtzg.carlos.server.modules.visits.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class VisitRegisterDto {

    @NotNull(message = "User UUID cannot be null")
    private UUID userUuid;

    @NotNull(message = "Store UUID cannot be null")
    private UUID storeUuid;

    @NotNull(message = "Photo cannot be null")
    private String photo;

    @NotNull(message = "Validation cannot be null")
    private boolean validation;
}
