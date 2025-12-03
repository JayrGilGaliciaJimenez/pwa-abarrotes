package mtzg.carlos.server.modules.storeproducts.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
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
public class AssignProductsToStoreRequestDto {

    @NotNull(message = "Store UUID cannot be null")
    private UUID storeUuid;

    @NotNull(message = "Product UUIDs cannot be null")
    @NotEmpty(message = "Product UUIDs list cannot be empty")
    private List<UUID> productUuids;
}
