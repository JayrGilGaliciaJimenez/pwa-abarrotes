package mtzg.carlos.server.modules.stores.dto;

import java.util.UUID;

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
public class StoreResponseDto {

    private UUID uuid;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private String qrCode;
}
