package mtzg.carlos.server.modules.routes;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RouteRequestDto {

    @NotNull(message = "User UUID cannot be null")
    private UUID userUuid;

    @NotNull(message = "Store UUID cannot be null")
    private UUID storeUuid;
}
